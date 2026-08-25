import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { authenticateUser } from '../_shared/auth.ts';
import {
  validateSchema,
  CreatePOSchema,
  TransitionPOStatusSchema,
  InwardGRNSchema,
  zSearchQuery,
} from '../_shared/validation.ts';
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

    // ------------------------------------------------------------------------
    // 1. GET /purchase-orders OR /purchase-orders/:id
    // ------------------------------------------------------------------------
    if (method === 'GET') {
      const rbacError = requireRole(
        ['procurement_user', 'inventory_manager', 'owner', 'admin'],
        user.role
      );
      if (rbacError) return rbacError;

      const isSingle = lastPart !== 'purchase-orders' && lastPart !== 'v1';

      if (isSingle) {
        const poId = lastPart;
        const { data: po, error } = await client
          .from('purchase_orders')
          .select('*')
          .eq('id', poId)
          .single();

        if (error || !po) {
          return errorResponse('NOT_FOUND', `Purchase order ${poId} not found`, 404);
        }

        const branchMatchErr = requireBranchMatch(po.branch_id, user.branchId, user.role);
        if (branchMatchErr) return branchMatchErr;

        return successResponse(po);
      }

      const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)));
      const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
      const offset = (page - 1) * limit;

      const status = url.searchParams.get('status');
      const rawSupplier = url.searchParams.get('supplier_name');
      const supplierName = rawSupplier ? zSearchQuery.parse(rawSupplier) : null;

      let query = client.from('purchase_orders').select('*', { count: 'exact' });

      if (user.role !== 'admin' && user.role !== 'owner' && user.branchId) {
        query = query.eq('branch_id', user.branchId);
      }

      if (status) query = query.eq('status', status);
      if (supplierName) query = query.ilike('supplier_name', `%${supplierName}%`);

      const { data, count, error } = await query
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (error) {
        return errorResponse('DATABASE_ERROR', error.message, 500);
      }

      return successResponse(data, {
        page,
        limit,
        total: count || (data ? data.length : 0),
      });
    }

    // ------------------------------------------------------------------------
    // 2. POST /purchase-orders (Create PO)
    // ------------------------------------------------------------------------
    if (method === 'POST' && (lastPart === 'purchase-orders' || lastPart === 'v1')) {
      const rbacError = requireRole(['procurement_user', 'admin', 'owner'], user.role);
      if (rbacError) return rbacError;

      const rawBody = await req.json();
      const validation = validateSchema(CreatePOSchema, rawBody);
      if (validation.error) return validation.error;

      const body = validation.data;
      const effectiveBranchId = user.branchId || 'nashik-central';
      const createdBy = user.id;

      const poNumber = `PO-2026-${Math.floor(100 + Math.random() * 900)}`;
      const now = new Date();

      const newPO = {
        po_number: poNumber,
        supplier_name: body.supplier_name,
        items: body.items,
        items_count: body.items.length,
        total_amount: body.total_amount,
        order_date: now.toISOString().split('T')[0],
        expected_delivery: body.expected_delivery,
        status: 'draft',
        payment_terms: body.payment_terms || 'Net 30',
        notes: body.notes || null,
        branch_id: effectiveBranchId,
        created_by: createdBy,
      };

      const { data: created, error } = await client
        .from('purchase_orders')
        .insert(newPO)
        .select()
        .single();

      if (error) {
        return errorResponse('DATABASE_ERROR', error.message, 500);
      }

      return successResponse(created || newPO, null, 201);
    }

    // ------------------------------------------------------------------------
    // 3. PATCH /purchase-orders/:id/status (Transition State Machine)
    // ------------------------------------------------------------------------
    if (method === 'PATCH' && path.includes('/status')) {
      const rbacError = requireRole(['procurement_user', 'owner', 'admin'], user.role);
      if (rbacError) return rbacError;

      const poId = parts[parts.indexOf('purchase-orders') + 1] || lastPart;
      const rawBody = await req.json();
      const validation = validateSchema(TransitionPOStatusSchema, rawBody);
      if (validation.error) return validation.error;

      const { status } = validation.data;

      const { data: existingPO, error: fetchErr } = await client
        .from('purchase_orders')
        .select('*')
        .eq('id', poId)
        .single();

      if (fetchErr || !existingPO) {
        return errorResponse('NOT_FOUND', `Purchase order ${poId} not found`, 404);
      }

      const branchMatchErr = requireBranchMatch(existingPO.branch_id, user.branchId, user.role);
      if (branchMatchErr) return branchMatchErr;

      const { data: updated, error: updateErr } = await client
        .from('purchase_orders')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', poId)
        .select()
        .single();

      if (updateErr) {
        return errorResponse('DATABASE_ERROR', updateErr.message, 500);
      }

      return successResponse(updated);
    }

    // ------------------------------------------------------------------------
    // 4. POST /purchase-orders/:id/grn (Goods Receipt Note Inwarding)
    // ------------------------------------------------------------------------
    if (method === 'POST' && path.includes('/grn')) {
      const rbacError = requireRole(
        ['inventory_manager', 'procurement_user', 'owner', 'admin'],
        user.role
      );
      if (rbacError) return rbacError;

      const poId = parts[parts.indexOf('purchase-orders') + 1] || lastPart;
      const rawBody = await req.json();
      const validation = validateSchema(InwardGRNSchema, rawBody);
      if (validation.error) return validation.error;

      const { batches } = validation.data;

      const { data: po, error: poErr } = await client
        .from('purchase_orders')
        .select('*')
        .eq('id', poId)
        .single();

      if (poErr || !po) {
        return errorResponse('NOT_FOUND', `Purchase order ${poId} not found`, 404);
      }

      const branchMatchErr = requireBranchMatch(po.branch_id, user.branchId, user.role);
      if (branchMatchErr) return branchMatchErr;

      // Inward each batch lot
      const inwardedBatches = [];
      for (const b of batches) {
        const { data: item } = await client
          .from('inventory')
          .select('*')
          .eq('id', b.item_id)
          .single();

        if (item) {
          const currentStock = Number(item.stock_qty) || 0;
          const newStock = currentStock + b.qty;

          const existingBatches = item.batches || [];
          existingBatches.push({
            batchNumber: b.batch_number,
            manufacturingDate: b.mfg_date || new Date().toISOString().split('T')[0],
            expiryDate: b.expiry_date || new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
            quantity: b.qty,
            rack: b.rack || 'Bay 01',
            status: 'healthy',
          });

          await client
            .from('inventory')
            .update({
              stock_qty: newStock,
              batches: existingBatches,
              updated_at: new Date().toISOString(),
            })
            .eq('id', b.item_id);

          inwardedBatches.push({
            itemId: b.item_id,
            batchNumber: b.batch_number,
            quantityInwarded: b.qty,
            totalNewStock: newStock,
          });
        }
      }

      // Mark PO as received
      await client
        .from('purchase_orders')
        .update({
          status: 'received',
          updated_at: new Date().toISOString(),
        })
        .eq('id', poId);

      return successResponse({
        message: 'GRN Inwarding completed successfully',
        poId,
        inwardedBatches,
      });
    }

    return errorResponse('METHOD_NOT_ALLOWED', `Method ${method} not allowed on /purchase-orders`, 405);
  } catch (err: any) {
    return errorResponse('INTERNAL_ERROR', err.message || 'Internal Server Error', 500);
  }
});
