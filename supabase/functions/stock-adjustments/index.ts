import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { authenticateUser, requireRoles } from '../_shared/auth.ts';
import { validateRequiredFields } from '../_shared/validation.ts';

serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const method = req.method;
  const { user, error: authError, client } = await authenticateUser(req);
  if (authError) return authError;
  if (!user) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);

  try {
    // 1. GET /stock-adjustments (Adjustment History)
    if (method === 'GET') {
      const { data: logs, error } = await client
        .from('activity_logs')
        .select('*')
        .eq('tag', 'inventory')
        .order('created_at', { ascending: false });

      if (error) {
        return errorResponse('DATABASE_ERROR', error.message, 500);
      }

      return successResponse(logs || []);
    }

    // 2. POST /stock-adjustments (Perform Stock Adjustment / Variance Write-Down)
    if (method === 'POST') {
      const roleErr = requireRoles(user, ['inventory_manager', 'admin', 'owner']);
      if (roleErr) return roleErr;

      const body = await req.json();
      const validation = validateRequiredFields(body, ['item_id', 'variance_qty']);
      if (!validation.valid) {
        return errorResponse('VALIDATION_ERROR', `Missing required field: ${validation.missingField}`, 400);
      }

      const itemId = body.item_id;
      const batchNumber = body.batch_id || body.batch_number;
      const varianceQty = Number(body.variance_qty) || 0;
      const reason = body.reason || body.reason_code || 'Stock Audit Reconciliation';

      const { data: item, error: fetchErr } = await client
        .from('inventory')
        .select('*')
        .eq('id', itemId)
        .single();

      if (fetchErr || !item) {
        return errorResponse('NOT_FOUND', `Item ${itemId} not found`, 404);
      }

      const newStock = Math.max(0, (Number(item.stock_qty) || 0) + varianceQty);
      const updatedBatches = (item.batches || []).map((b: any) => {
        if (b.batchNumber === batchNumber) {
          return {
            ...b,
            quantity: Math.max(0, (Number(b.quantity) || 0) + varianceQty),
          };
        }
        return b;
      });

      const { data: updatedItem, error: updateErr } = await client
        .from('inventory')
        .update({
          stock_qty: newStock,
          batches: updatedBatches,
        })
        .eq('id', itemId)
        .select()
        .single();

      if (updateErr) {
        return errorResponse('DATABASE_ERROR', updateErr.message, 500);
      }

      // Log activity
      await client.from('activity_logs').insert({
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        action: 'Stock Audit Variance Adjustment',
        details: `${varianceQty > 0 ? '+' : ''}${varianceQty} ${item.unit} (${item.name} Lot ${batchNumber || 'General'}) — ${reason}`,
        user_name: user.fullName,
        time: 'Just now',
        tag: 'inventory',
        reference_id: itemId,
      });

      return successResponse({
        item: updatedItem,
        varianceApplied: varianceQty,
        reason,
      }, null, 201);
    }

    return errorResponse('METHOD_NOT_ALLOWED', `Method ${method} not allowed on /stock-adjustments`, 405);
  } catch (err: any) {
    return errorResponse('INTERNAL_ERROR', err.message || 'Internal Server Error', 500);
  }
});
