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
        .ilike('action', '%Write-Off%')
        .order('created_at', { ascending: false });

      return successResponse(logs || []);
    }

    if (method === 'POST') {
      const roleErr = requireRoles(user, ['inventory_manager', 'admin', 'owner']);
      if (roleErr) return roleErr;

      const body = await req.json();
      const validation = validateRequiredFields(body, ['item_id', 'batch_id', 'reason']);
      if (!validation.valid) {
        return errorResponse('VALIDATION_ERROR', `Missing required field: ${validation.missingField}`, 400);
      }

      const { item_id, batch_id, reason } = body;
      const { data: item } = await client.from('inventory').select('*').eq('id', item_id).single();
      if (!item) return errorResponse('NOT_FOUND', `Item ${item_id} not found`, 404);

      let writtenOffQty = 0;
      const updatedBatches = (item.batches || []).map((b: any) => {
        if (b.batchNumber === batch_id) {
          writtenOffQty = Number(b.quantity) || 0;
          return { ...b, quantity: 0, status: 'expired' };
        }
        return b;
      });

      const newStock = Math.max(0, (Number(item.stock_qty) || 0) - writtenOffQty);

      await client.from('inventory').update({ stock_qty: newStock, batches: updatedBatches }).eq('id', item_id);

      await client.from('activity_logs').insert({
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        action: 'Expired Stock Write-Off',
        details: `Disposed ${writtenOffQty} ${item.unit} (${item.name} Lot ${batch_id}) — ${reason}`,
        user_name: user.fullName,
        time: 'Just now',
        tag: 'inventory',
        reference_id: batch_id,
      });

      return successResponse({ itemId: item_id, batchId: batch_id, writtenOffQty, reason }, null, 201);
    }

    return errorResponse('METHOD_NOT_ALLOWED', `Method ${method} not allowed on /write-offs`, 405);
  } catch (err: any) {
    return errorResponse('INTERNAL_ERROR', err.message || 'Internal Server Error', 500);
  }
});
