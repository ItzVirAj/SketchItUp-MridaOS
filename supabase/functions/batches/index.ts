import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { authenticateUser, requireRoles } from '../_shared/auth.ts';
import { parsePaginationParams } from '../_shared/validation.ts';

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
    // GET /batches/fefo/:item_id (FEFO Auto-Selection)
    // ------------------------------------------------------------------------
    if (method === 'GET' && path.includes('/fefo/')) {
      const parts = path.split('/').filter(Boolean);
      const itemId = parts[parts.length - 1];

      const { data: item, error } = await client
        .from('inventory')
        .select('*')
        .eq('id', itemId)
        .single();

      if (error || !item) {
        return errorResponse('NOT_FOUND', `Item ${itemId} not found`, 404);
      }

      const batches = Array.isArray(item.batches) ? [...item.batches] : [];
      // Sort FEFO: smallest daysRemaining first, status != expired, quantity > 0
      const activeBatches = batches
        .filter((b: any) => b.quantity > 0 && b.status !== 'expired')
        .sort((a: any, b: any) => (a.daysRemaining || 0) - (b.daysRemaining || 0));

      const selectedBatch = activeBatches[0] || batches[0] || null;

      return successResponse({
        itemId,
        itemName: item.name,
        selectedBatch,
        availableBatchesCount: activeBatches.length,
        strategy: 'FEFO (First-Expiry-First-Out)',
      });
    }

    // ------------------------------------------------------------------------
    // GET /batches (List all batches)
    // ------------------------------------------------------------------------
    if (method === 'GET') {
      const itemId = url.searchParams.get('item_id');
      const expiringWithinDays = parseInt(url.searchParams.get('expiring_within_days') || '0', 10);
      const status = url.searchParams.get('status');

      let query = client.from('inventory').select('id, name, sku, category, unit, batches');
      if (itemId) {
        query = query.eq('id', itemId);
      }

      const { data: items, error } = await query;
      if (error) {
        return errorResponse('DATABASE_ERROR', error.message, 500);
      }

      const allBatches: any[] = [];
      (items || []).forEach((item: any) => {
        (item.batches || []).forEach((b: any) => {
          allBatches.push({
            itemId: item.id,
            itemName: item.name,
            sku: item.sku,
            unit: item.unit,
            batchNumber: b.batchNumber,
            manufacturingDate: b.manufacturingDate,
            expiryDate: b.expiryDate,
            daysRemaining: b.daysRemaining,
            quantity: b.quantity,
            rack: b.rack,
            status: b.status,
          });
        });
      });

      let filteredBatches = allBatches;
      if (expiringWithinDays > 0) {
        filteredBatches = filteredBatches.filter((b) => b.daysRemaining <= expiringWithinDays);
      }
      if (status) {
        filteredBatches = filteredBatches.filter((b) => b.status === status);
      }

      // Sort FEFO by default
      filteredBatches.sort((a, b) => a.daysRemaining - b.daysRemaining);

      const { page, limit, offset } = parsePaginationParams(url);
      const paginated = filteredBatches.slice(offset, offset + limit);

      return successResponse(paginated, {
        page,
        limit,
        total: filteredBatches.length,
      });
    }

    // ------------------------------------------------------------------------
    // PUT /batches/:id (Update Batch quantity / rack)
    // ------------------------------------------------------------------------
    if (method === 'PUT') {
      const roleErr = requireRoles(user, ['inventory_manager', 'admin', 'owner']);
      if (roleErr) return roleErr;

      const body = await req.json();
      const { itemId, batchNumber, quantity, rack, status } = body;

      if (!itemId || !batchNumber) {
        return errorResponse('VALIDATION_ERROR', 'itemId and batchNumber are required', 400);
      }

      const { data: item, error: fetchErr } = await client
        .from('inventory')
        .select('*')
        .eq('id', itemId)
        .single();

      if (fetchErr || !item) {
        return errorResponse('NOT_FOUND', `Item ${itemId} not found`, 404);
      }

      const updatedBatches = (item.batches || []).map((b: any) => {
        if (b.batchNumber === batchNumber) {
          return {
            ...b,
            quantity: quantity !== undefined ? Number(quantity) : b.quantity,
            rack: rack !== undefined ? rack : b.rack,
            status: status !== undefined ? status : b.status,
          };
        }
        return b;
      });

      const totalStock = updatedBatches.reduce((sum: number, b: any) => sum + (Number(b.quantity) || 0), 0);

      const { data, error: updateErr } = await client
        .from('inventory')
        .update({ batches: updatedBatches, stock_qty: totalStock })
        .eq('id', itemId)
        .select()
        .single();

      if (updateErr) {
        return errorResponse('DATABASE_ERROR', updateErr.message, 400);
      }

      return successResponse({ item: data, updatedBatch: batchNumber });
    }

    return errorResponse('METHOD_NOT_ALLOWED', `Method ${method} not allowed on /batches`, 405);
  } catch (err: any) {
    return errorResponse('INTERNAL_ERROR', err.message || 'Internal Server Error', 500);
  }
});
