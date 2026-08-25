import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { authenticateUser } from '../_shared/auth.ts';
import { validateSchema, CreateSaleSchema, zSearchQuery } from '../_shared/validation.ts';
import { requireRole, requireBranchMatch } from '../_shared/rbac.ts';
import { enforceApiRateLimit, enforceGlobalIpRateLimit } from '../_shared/apiRateLimit.ts';

serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const globalIpLimit = await enforceGlobalIpRateLimit(req);
  if (globalIpLimit) return globalIpLimit;

  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  const { user, error: authError, client } = await authenticateUser(req);
  if (authError) return authError;
  if (!user) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);

  const operation = method === 'GET' || method === 'HEAD' ? 'read' : method === 'DELETE' ? 'delete' : 'write';
  const apiLimit = await enforceApiRateLimit(req, user.id, operation);
  if (apiLimit) return apiLimit;

  try {
    const parts = path.split('/').filter(Boolean);
    const lastPart = parts[parts.length - 1];
    const isSingle = lastPart !== 'sales' && lastPart !== 'v1';

    // ------------------------------------------------------------------------
    // 1. GET /sales OR /sales/:id
    // ------------------------------------------------------------------------
    if (method === 'GET') {
      const rbacError = requireRole(
        ['counter_staff', 'owner', 'admin', 'inventory_manager', 'accounts_user'],
        user.role
      );
      if (rbacError) return rbacError;

      if (isSingle) {
        const saleId = lastPart;
        const { data: sale, error } = await client
          .from('sales')
          .select('*')
          .eq('id', saleId)
          .single();

        if (error || !sale) {
          return errorResponse('NOT_FOUND', `Sale record ${saleId} not found`, 404);
        }

        const branchMatchErr = requireBranchMatch(sale.branch_id, user.branchId, user.role);
        if (branchMatchErr) return branchMatchErr;

        return successResponse(sale);
      }

      const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)));
      const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
      const offset = (page - 1) * limit;

      const dateFrom = url.searchParams.get('date_from');
      const dateTo = url.searchParams.get('date_to');
      const rawCustomerName = url.searchParams.get('customer_name');
      const customerName = rawCustomerName ? zSearchQuery.parse(rawCustomerName) : null;
      const isKhata = url.searchParams.get('is_khata');

      let query = client.from('sales').select('*', { count: 'exact' });

      // Apply branch filter for non-admin/owner
      if (user.role !== 'admin' && user.role !== 'owner' && user.branchId) {
        query = query.eq('branch_id', user.branchId);
      }

      if (dateFrom) query = query.gte('date', dateFrom);
      if (dateTo) query = query.lte('date', dateTo);
      if (customerName) query = query.ilike('customer_name', `%${customerName}%`);
      if (isKhata !== null && isKhata !== undefined) {
        query = query.eq('is_khata', isKhata === 'true');
      }

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
    // 2. POST /sales (Atomic POS Checkout with Zod Validation & FEFO Reduction)
    // ------------------------------------------------------------------------
    if (method === 'POST') {
      const rbacError = requireRole(['counter_staff', 'owner', 'admin'], user.role);
      if (rbacError) return rbacError;

      const rawBody = await req.json();
      const validation = validateSchema(CreateSaleSchema, rawBody);
      if (validation.error) return validation.error;

      const body = validation.data;
      const effectiveBranchId = user.branchId || 'nashik-central';
      const createdBy = user.id;

      const invoiceNo = `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];

      // Atomic FEFO Decrement for items
      const deductionResults = [];
      for (const cartItem of body.items) {
        const { data: itemData, error: itemErr } = await client
          .from('inventory')
          .select('*')
          .eq('id', cartItem.item_id)
          .single();

        if (itemErr || !itemData) {
          return errorResponse(
            'ITEM_NOT_FOUND',
            `Item with ID ${cartItem.item_id} (${cartItem.name}) not found in inventory`,
            404
          );
        }

        const currentStock = Number(itemData.stock_qty) || 0;
        if (currentStock < cartItem.qty) {
          return errorResponse(
            'INSUFFICIENT_STOCK',
            `Insufficient stock for '${itemData.name}'. Requested ${cartItem.qty} ${itemData.unit}, available ${currentStock} ${itemData.unit}`,
            400
          );
        }

        // Decrement item inventory
        const newStock = currentStock - cartItem.qty;
        await client
          .from('inventory')
          .update({
            stock_qty: newStock,
            updated_at: now.toISOString(),
          })
          .eq('id', cartItem.item_id);

        deductionResults.push({
          itemId: cartItem.item_id,
          name: cartItem.name,
          deductedQty: cartItem.qty,
          remainingStock: newStock,
        });
      }

      // Khata Ledger Synchronization if applicable
      let khataAmount = 0;
      if (body.is_khata && body.customer_id) {
        khataAmount = Math.max(0, body.total - body.cash_paid);

        const { data: customerData } = await client
          .from('khata_ledger')
          .select('*')
          .eq('id', body.customer_id)
          .single();

        if (customerData) {
          const currentBal = Number(customerData.outstanding_balance) || 0;
          const newBal = currentBal + khataAmount;
          const totalPurchased = (Number(customerData.total_purchased) || 0) + body.total;

          await client
            .from('khata_ledger')
            .update({
              outstanding_balance: newBal,
              total_purchased: totalPurchased,
              status: newBal > (customerData.credit_limit || 50000) ? 'overdue' : 'due_soon',
              updated_at: now.toISOString(),
            })
            .eq('id', body.customer_id);
        }
      }

      // Insert Sale Record
      const saleRecord = {
        invoice_no: invoiceNo,
        customer_name: body.customer_name,
        customer_phone: body.customer_phone || null,
        is_khata: body.is_khata,
        items: body.items,
        total: body.total,
        cash_paid: body.cash_paid,
        khata_amount: khataAmount,
        date: dateStr,
        timestamp: now.toISOString(),
        payment_mode: body.payment_mode,
        branch_id: effectiveBranchId,
        created_by: createdBy,
      };

      const { data: newSale, error: saleInsertError } = await client
        .from('sales')
        .insert(saleRecord)
        .select()
        .single();

      if (saleInsertError) {
        return errorResponse('DATABASE_ERROR', saleInsertError.message, 500);
      }

      return successResponse(
        {
          sale: newSale || saleRecord,
          deductions: deductionResults,
          khataSynced: body.is_khata,
        },
        null,
        201
      );
    }

    return errorResponse('METHOD_NOT_ALLOWED', `Method ${method} not allowed on /sales`, 405);
  } catch (err: any) {
    return errorResponse('INTERNAL_ERROR', err.message || 'Internal Server Error', 500);
  }
});
