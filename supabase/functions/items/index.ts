import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { authenticateUser } from '../_shared/auth.ts';
import { validateSchema, CreateItemSchema, zSearchQuery } from '../_shared/validation.ts';
import { requireRole, requireBranchMatch } from '../_shared/rbac.ts';

serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  const { user, error: authError, client } = await authenticateUser(req);
  if (authError) return authError;
  if (!user) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);

  try {
    const parts = path.split('/').filter(Boolean);
    const lastPart = parts[parts.length - 1];
    const isSingle = lastPart !== 'items' && lastPart !== 'v1';

    // ------------------------------------------------------------------------
    // 1. GET /items OR /items/:id
    // ------------------------------------------------------------------------
    if (method === 'GET') {
      const rbacError = requireRole(
        ['counter_staff', 'inventory_manager', 'procurement_user', 'owner', 'admin', 'accounts_user', 'nursery_care_staff'],
        user.role
      );
      if (rbacError) return rbacError;

      if (isSingle) {
        const itemId = lastPart;
        const { data: item, error } = await client
          .from('inventory')
          .select('*')
          .eq('id', itemId)
          .single();

        if (error || !item) {
          return errorResponse('NOT_FOUND', `Item ${itemId} not found`, 404);
        }

        const branchMatchErr = requireBranchMatch(item.branch_id, user.branchId, user.role);
        if (branchMatchErr) return branchMatchErr;

        return successResponse(item);
      }

      const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)));
      const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
      const offset = (page - 1) * limit;

      const category = url.searchParams.get('category');
      const rawSearch = url.searchParams.get('search');
      const search = rawSearch ? zSearchQuery.parse(rawSearch) : null;
      const lowStockOnly = url.searchParams.get('low_stock') === 'true';

      let query = client.from('inventory').select('*', { count: 'exact' });

      if (user.role !== 'admin' && user.role !== 'owner' && user.branchId) {
        query = query.eq('branch_id', user.branchId);
      }

      if (category) query = query.eq('category', category);
      if (search) query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);

      const { data, count, error } = await query
        .range(offset, offset + limit - 1)
        .order('name', { ascending: true });

      if (error) {
        return errorResponse('DATABASE_ERROR', error.message, 500);
      }

      let results = data || [];
      if (lowStockOnly) {
        results = results.filter((item: any) => (Number(item.stock_qty) || 0) <= (Number(item.reorder_level) || 0));
      }

      return successResponse(results, {
        page,
        limit,
        total: count || results.length,
      });
    }

    // ------------------------------------------------------------------------
    // 2. POST /items (Create SKU)
    // ------------------------------------------------------------------------
    if (method === 'POST') {
      const rbacError = requireRole(['inventory_manager', 'owner', 'admin'], user.role);
      if (rbacError) return rbacError;

      const rawBody = await req.json();
      const validation = validateSchema(CreateItemSchema, rawBody);
      if (validation.error) return validation.error;

      const body = validation.data;
      const effectiveBranchId = user.branchId || 'nashik-central';

      const newItem = {
        name: body.name,
        category: body.category,
        sku: body.sku,
        stock_qty: body.stock_qty,
        unit: body.unit,
        reorder_level: body.reorder_level,
        suggested_reorder_qty: body.reorder_level * 2,
        unit_price: body.unit_price,
        cost_price: body.cost_price,
        rack_location: body.rack_location,
        supplier_name: body.supplier_name || 'Agro-Chem Supplies Ltd',
        velocity: 'moderate',
        batches: [],
        branch_id: effectiveBranchId,
        created_at: new Date().toISOString(),
      };

      const { data: created, error } = await client
        .from('inventory')
        .insert(newItem)
        .select()
        .single();

      if (error) {
        return errorResponse('DATABASE_ERROR', error.message, 500);
      }

      return successResponse(created || newItem, null, 201);
    }

    // ------------------------------------------------------------------------
    // 3. PUT /items/:id (Update SKU)
    // ------------------------------------------------------------------------
    if (method === 'PUT' && isSingle) {
      const rbacError = requireRole(['inventory_manager', 'owner', 'admin'], user.role);
      if (rbacError) return rbacError;

      const itemId = lastPart;
      const rawBody = await req.json();
      const validation = validateSchema(CreateItemSchema.partial(), rawBody);
      if (validation.error) return validation.error;

      const updates = validation.data;

      const { data: existingItem, error: fetchErr } = await client
        .from('inventory')
        .select('*')
        .eq('id', itemId)
        .single();

      if (fetchErr || !existingItem) {
        return errorResponse('NOT_FOUND', `Item ${itemId} not found`, 404);
      }

      const branchMatchErr = requireBranchMatch(existingItem.branch_id, user.branchId, user.role);
      if (branchMatchErr) return branchMatchErr;

      const { data: updated, error: updateErr } = await client
        .from('inventory')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId)
        .select()
        .single();

      if (updateErr) {
        return errorResponse('DATABASE_ERROR', updateErr.message, 500);
      }

      return successResponse(updated);
    }

    // ------------------------------------------------------------------------
    // 4. DELETE /items/:id (Delete SKU)
    // ------------------------------------------------------------------------
    if (method === 'DELETE' && isSingle) {
      const rbacError = requireRole(['owner', 'admin'], user.role);
      if (rbacError) return rbacError;

      const itemId = lastPart;

      const { data: existingItem, error: fetchErr } = await client
        .from('inventory')
        .select('*')
        .eq('id', itemId)
        .single();

      if (fetchErr || !existingItem) {
        return errorResponse('NOT_FOUND', `Item ${itemId} not found`, 404);
      }

      const branchMatchErr = requireBranchMatch(existingItem.branch_id, user.branchId, user.role);
      if (branchMatchErr) return branchMatchErr;

      await client.from('inventory').delete().eq('id', itemId);

      return successResponse({ message: `Item ${itemId} deleted successfully`, itemId });
    }

    return errorResponse('METHOD_NOT_ALLOWED', `Method ${method} not allowed on /items`, 405);
  } catch (err: any) {
    return errorResponse('INTERNAL_ERROR', err.message || 'Internal Server Error', 500);
  }
});
