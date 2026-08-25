import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { authenticateUser, requireRoles } from '../_shared/auth.ts';
import { parsePaginationParams, validateRequiredFields } from '../_shared/validation.ts';

const LEGAL_TRANSITIONS: Record<string, string[]> = {
  draft: ['pending_acknowledgement', 'cancelled'],
  pending_acknowledgement: ['dispatched', 'cancelled'],
  dispatched: ['grn_pending', 'cancelled'],
  grn_pending: ['received'],
  received: [],
  cancelled: [],
};

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
    const isGrn = path.endsWith('/grn');
    const isStatusUpdate = path.endsWith('/status');

    // ------------------------------------------------------------------------
    // 1. POST /purchase-orders/:id/grn (Goods Receipt Note - Inward Batches)
    // ------------------------------------------------------------------------
    if (method === 'POST' && isGrn) {
      const roleErr = requireRoles(user, ['inventory_manager', 'admin', 'owner']);
      if (roleErr) return roleErr;

      const poId = parts[parts.length - 2];
      const body = await req.json();
      const batches = Array.isArray(body.batches) ? body.batches : [];

      if (batches.length === 0) {
        return errorResponse('VALIDATION_ERROR', 'GRN requires batch details for inwarded stock items', 400);
      }

      // Fetch the PO
      const { data: po, error: poErr } = await client
        .from('purchase_orders')
        .select('*')
        .eq('id', poId)
        .single();

      if (poErr || !po) {
        return errorResponse('NOT_FOUND', `Purchase Order ${poId} not found`, 404);
      }

      // Process each inwarded batch into inventory
      for (const b of batches) {
        const itemId = b.item_id || b.itemId;
        const batchNumber = b.batch_number || b.batchNumber || `LOT-${Date.now().toString().slice(-4)}`;
        const mfgDate = b.mfg_date || b.manufacturingDate || new Date().toISOString().split('T')[0];
        const expiryDate = b.expiry_date || b.expiryDate || new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0];
        const qty = Number(b.qty || b.quantity) || 0;
        const rack = b.rack || 'Bay 01';

        if (!itemId) continue;

        const { data: item } = await client.from('inventory').select('*').eq('id', itemId).single();
        if (item) {
          const existingBatches = Array.isArray(item.batches) ? [...item.batches] : [];
          const daysRemaining = Math.max(0, Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24)));

          const newBatchObj = {
            batchNumber,
            manufacturingDate: mfgDate,
            expiryDate,
            daysRemaining,
            quantity: qty,
            rack,
            status: daysRemaining <= 0 ? 'expired' : daysRemaining <= 30 ? 'critical_expiry' : 'healthy',
          };

          const updatedBatches = [...existingBatches, newBatchObj];
          const newTotalStock = (Number(item.stock_qty) || 0) + qty;

          await client
            .from('inventory')
            .update({
              stock_qty: newTotalStock,
              batches: updatedBatches,
            })
            .eq('id', itemId);
        }
      }

      // Mark PO as received
      const { data: updatedPO, error: updateErr } = await client
        .from('purchase_orders')
        .update({ status: 'received' })
        .eq('id', poId)
        .select()
        .single();

      if (updateErr) {
        return errorResponse('DATABASE_ERROR', updateErr.message, 500);
      }

      // Log activity
      await client.from('activity_logs').insert({
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        action: 'Goods Receipt Note (GRN) Inwarded',
        details: `Inwarded stock for PO #${po.po_number} from ${po.supplier_name}`,
        user_name: user.fullName,
        time: 'Just now',
        tag: 'procurement',
        reference_id: po.po_number,
      });

      return successResponse({
        purchaseOrder: updatedPO,
        inwardedBatchesCount: batches.length,
        message: 'GRN stock inward completed and PO updated to received',
      });
    }

    // ------------------------------------------------------------------------
    // 2. PATCH /purchase-orders/:id/status (State Machine Transition)
    // ------------------------------------------------------------------------
    if (method === 'PATCH' && isStatusUpdate) {
      const roleErr = requireRoles(user, ['procurement_user', 'inventory_manager', 'admin', 'owner']);
      if (roleErr) return roleErr;

      const poId = parts[parts.length - 2];
      const body = await req.json();
      const newStatus = body.status;

      if (!newStatus) {
        return errorResponse('VALIDATION_ERROR', 'status is required', 400);
      }

      const { data: po, error: poErr } = await client
        .from('purchase_orders')
        .select('*')
        .eq('id', poId)
        .single();

      if (poErr || !po) {
        return errorResponse('NOT_FOUND', `Purchase Order ${poId} not found`, 404);
      }

      const currentStatus = po.status || 'draft';
      const allowedNext = LEGAL_TRANSITIONS[currentStatus] || [];

      if (!allowedNext.includes(newStatus)) {
        return errorResponse(
          'INVALID_STATUS_TRANSITION',
          `Cannot transition PO status from "${currentStatus}" to "${newStatus}". Allowed next statuses: ${allowedNext.join(', ')}`,
          400
        );
      }

      const { data: updated, error: updateErr } = await client
        .from('purchase_orders')
        .update({ status: newStatus })
        .eq('id', poId)
        .select()
        .single();

      if (updateErr) {
        return errorResponse('DATABASE_ERROR', updateErr.message, 500);
      }

      return successResponse(updated);
    }

    // ------------------------------------------------------------------------
    // 3. GET /purchase-orders OR /purchase-orders/:id
    // ------------------------------------------------------------------------
    if (method === 'GET') {
      const lastPart = parts[parts.length - 1];
      const isSingle = lastPart !== 'purchase-orders' && lastPart !== 'v1';

      if (isSingle) {
        const { data: po, error } = await client
          .from('purchase_orders')
          .select('*')
          .eq('id', lastPart)
          .single();

        if (error || !po) {
          return errorResponse('NOT_FOUND', `Purchase Order ${lastPart} not found`, 404);
        }

        return successResponse(po);
      }

      const { page, limit, offset } = parsePaginationParams(url);
      const status = url.searchParams.get('status');
      const supplierName = url.searchParams.get('supplier_name');

      let query = client.from('purchase_orders').select('*', { count: 'exact' });

      if (status) query = query.eq('status', status);
      if (supplierName) query = query.ilike('supplier_name', `%${supplierName}%`);

      const { data, count, error } = await query
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (error) {
        return errorResponse('DATABASE_ERROR', error.message, 500);
      }

      return successResponse(data || [], {
        page,
        limit,
        total: count || (data || []).length,
      });
    }

    // ------------------------------------------------------------------------
    // 4. POST /purchase-orders (Create Purchase Order - Initial Status: 'draft')
    // ------------------------------------------------------------------------
    if (method === 'POST') {
      const roleErr = requireRoles(user, ['procurement_user', 'admin', 'owner']);
      if (roleErr) return roleErr;

      const body = await req.json();
      const validation = validateRequiredFields(body, ['supplier_name', 'total_amount']);
      if (!validation.valid) {
        return errorResponse('VALIDATION_ERROR', `Missing required field: ${validation.missingField}`, 400);
      }

      const poNumber = body.po_number || `PO-2026-${Math.floor(100 + Math.random() * 900)}`;

      const newPO = {
        id: body.id || `po-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        po_number: poNumber,
        supplier_name: body.supplier_name,
        items_count: Number(body.items_count) || 1,
        total_amount: Number(body.total_amount) || 0,
        order_date: body.order_date || new Date().toISOString().split('T')[0],
        expected_delivery: body.expected_delivery || 'In 3 Days',
        status: body.status || 'draft',
        payment_terms: body.payment_terms || 'Net 30 Days',
        notes: body.notes || null,
      };

      const { data, error } = await client.from('purchase_orders').insert(newPO).select().single();
      if (error) {
        return errorResponse('DATABASE_ERROR', error.message, 400);
      }

      // Log activity
      await client.from('activity_logs').insert({
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        action: 'Supplier PO Created',
        details: `Issued ${poNumber} to ${body.supplier_name} (₹${newPO.total_amount.toLocaleString('en-IN')})`,
        user_name: user.fullName,
        time: 'Just now',
        tag: 'procurement',
        reference_id: poNumber,
      });

      return successResponse(data, null, 201);
    }

    return errorResponse('METHOD_NOT_ALLOWED', `Method ${method} not allowed on /purchase-orders`, 405);
  } catch (err: any) {
    return errorResponse('INTERNAL_ERROR', err.message || 'Internal Server Error', 500);
  }
});
