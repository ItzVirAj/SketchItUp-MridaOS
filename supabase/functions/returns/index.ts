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
    if (method === 'GET') {
      const { data: logs } = await client
        .from('activity_logs')
        .select('*')
        .ilike('action', '%Return%')
        .order('created_at', { ascending: false });

      return successResponse(logs || []);
    }

    if (method === 'POST') {
      const roleErr = requireRoles(user, ['inventory_manager', 'admin', 'owner']);
      if (roleErr) return roleErr;

      const body = await req.json();
      const validation = validateRequiredFields(body, ['item_id', 'batch_id', 'qty', 'reason']);
      if (!validation.valid) {
        return errorResponse('VALIDATION_ERROR', `Missing required field: ${validation.missingField}`, 400);
      }

      const { item_id, batch_id, qty, reason } = body;
      const returnQty = Number(qty) || 0;

      const { data: item } = await client.from('inventory').select('*').eq('id', item_id).single();
      if (!item) return errorResponse('NOT_FOUND', `Item ${item_id} not found`, 404);

      const updatedBatches = (item.batches || []).map((b: any) => {
        if (b.batchNumber === batch_id) {
          return { ...b, quantity: Math.max(0, (Number(b.quantity) || 0) - returnQty) };
        }
        return b;
      });

      const newStock = Math.max(0, (Number(item.stock_qty) || 0) - returnQty);

      await client.from('inventory').update({ stock_qty: newStock, batches: updatedBatches }).eq('id', item_id);

      const returnDocNo = `RTV-2026-${Math.floor(100 + Math.random() * 900)}`;

      await client.from('activity_logs').insert({
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        action: 'Return to Vendor (RTV)',
        details: `Returned ${returnQty} ${item.unit} (${item.name} Lot ${batch_id}) to ${item.supplier_name} — ${reason}`,
        user_name: user.fullName,
        time: 'Just now',
        tag: 'procurement',
        reference_id: returnDocNo,
      });

      return successResponse({ returnDocNo, itemId: item_id, batchId: batch_id, qtyReturned: returnQty }, null, 201);
    }

    return errorResponse('METHOD_NOT_ALLOWED', `Method ${method} not allowed on /returns`, 405);
  } catch (err: any) {
    return errorResponse('INTERNAL_ERROR', err.message || 'Internal Server Error', 500);
  }
});
