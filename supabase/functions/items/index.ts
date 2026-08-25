import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { authenticateUser, requireRoles } from '../_shared/auth.ts';
import { parsePaginationParams, validateRequiredFields } from '../_shared/validation.ts';

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
    // ------------------------------------------------------------------------
    // GET /items/fertilizer OR GET /items/nursery OR GET /items
    // ------------------------------------------------------------------------
    if (method === 'GET') {
      const parts = path.split('/').filter(Boolean);
      const lastPart = parts[parts.length - 1];
      const isFertilizer = path.includes('/fertilizer');
      const isNursery = path.includes('/nursery');
      const isSingleItem = !isFertilizer && !isNursery && lastPart !== 'items' && lastPart !== 'v1';

      // 1. Single Item by ID: GET /items/:id
      if (isSingleItem) {
        const itemId = lastPart;
        const { data: item, error } = await client
          .from('inventory')
          .select('*')
          .eq('id', itemId)
          .single();

        if (error || !item) {
          return errorResponse('NOT_FOUND', `Item with ID ${itemId} not found`, 404);
        }

        return successResponse(item);
      }

      // 2. List Items: GET /items, /items/fertilizer, /items/nursery
      const { page, limit, offset } = parsePaginationParams(url);
      const search = url.searchParams.get('search')?.toLowerCase();
      const category = url.searchParams.get('category');
      const lowStock = url.searchParams.get('low_stock') === 'true';

      let query = client.from('inventory').select('*', { count: 'exact' });

      if (isFertilizer) {
        query = query.in('category', ['Fertilizer', 'Bio-Fertilizer', 'Pesticide', 'Seeds', 'Tools']);
      } else if (isNursery) {
        query = query.in('category', ['Plant/Sapling', 'Pot & Soil']);
      } else if (category) {
        query = query.eq('category', category);
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,supplier_name.ilike.%${search}%`);
      }

      const { data, count, error } = await query
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (error) {
        return errorResponse('DATABASE_ERROR', error.message, 500);
      }

      let items = data || [];
      if (lowStock) {
        items = items.filter((i: any) => i.stock_qty <= i.reorder_level);
      }

      return successResponse(items, {
        page,
        limit,
        total: count || items.length,
      });
    }

    // ------------------------------------------------------------------------
    // POST /items (Create Item)
    // Allowed: inventory_manager, procurement_user, admin, owner
    // ------------------------------------------------------------------------
    if (method === 'POST') {
      const roleErr = requireRoles(user, ['inventory_manager', 'procurement_user', 'admin', 'owner']);
      if (roleErr) return roleErr;

      const body = await req.json();
      const validation = validateRequiredFields(body, ['name', 'category', 'sku', 'unit', 'unit_price', 'cost_price']);
      if (!validation.valid) {
        return errorResponse('VALIDATION_ERROR', `Missing required field: ${validation.missingField}`, 400);
      }

      const newItem = {
        id: body.id || `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: body.name,
        category: body.category,
        sku: body.sku,
        stock_qty: Number(body.stock_qty) || 0,
        unit: body.unit,
        reorder_level: Number(body.reorder_level) || 10,
        suggested_reorder_qty: Number(body.suggested_reorder_qty) || 50,
        unit_price: Number(body.unit_price) || 0,
        cost_price: Number(body.cost_price) || 0,
        rack_location: body.rack_location || 'Bay 01',
        velocity: body.velocity || 'moderate',
        supplier_name: body.supplier_name || '',
        batches: Array.isArray(body.batches) ? body.batches : [],
      };

      const { data, error } = await client.from('inventory').insert(newItem).select().single();
      if (error) {
        return errorResponse('DATABASE_ERROR', error.message, 400);
      }

      return successResponse(data, null, 201);
    }

    // ------------------------------------------------------------------------
    // PUT /items/:id (Update Item)
    // ------------------------------------------------------------------------
    if (method === 'PUT') {
      const roleErr = requireRoles(user, ['inventory_manager', 'procurement_user', 'admin', 'owner']);
      if (roleErr) return roleErr;

      const parts = path.split('/').filter(Boolean);
      const itemId = parts[parts.length - 1];
      const body = await req.json();

      const { data, error } = await client
        .from('inventory')
        .update(body)
        .eq('id', itemId)
        .select()
        .single();

      if (error) {
        return errorResponse('DATABASE_ERROR', error.message, 400);
      }

      return successResponse(data);
    }

    // ------------------------------------------------------------------------
    // DELETE /items/:id (Soft-delete / Archive Item)
    // ------------------------------------------------------------------------
    if (method === 'DELETE') {
      const roleErr = requireRoles(user, ['inventory_manager', 'admin', 'owner']);
      if (roleErr) return roleErr;

      const parts = path.split('/').filter(Boolean);
      const itemId = parts[parts.length - 1];

      // Soft delete: mark velocity as 'archived' or decrement stock
      const { data, error } = await client
        .from('inventory')
        .update({ velocity: 'archived' })
        .eq('id', itemId)
        .select()
        .single();

      if (error) {
        return errorResponse('DATABASE_ERROR', error.message, 400);
      }

      return successResponse({ archived: true, item: data });
    }

    return errorResponse('METHOD_NOT_ALLOWED', `Method ${method} not allowed on /items`, 405);
  } catch (err: any) {
    return errorResponse('INTERNAL_ERROR', err.message || 'Internal Server Error', 500);
  }
});
