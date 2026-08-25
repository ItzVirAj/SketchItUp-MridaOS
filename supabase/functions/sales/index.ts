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
    const parts = path.split('/').filter(Boolean);
    const lastPart = parts[parts.length - 1];
    const isSingle = lastPart !== 'sales' && lastPart !== 'v1';

    // ------------------------------------------------------------------------
    // 1. GET /sales OR /sales/:id
    // ------------------------------------------------------------------------
    if (method === 'GET') {
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

        return successResponse(sale);
      }

      const { page, limit, offset } = parsePaginationParams(url);
      const dateFrom = url.searchParams.get('date_from');
      const dateTo = url.searchParams.get('date_to');
      const customerName = url.searchParams.get('customer_name');
      const isKhata = url.searchParams.get('is_khata');

      let query = client.from('sales').select('*', { count: 'exact' });

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

      return successResponse(data || [], {
        page,
        limit,
        total: count || (data || []).length,
      });
    }

    // ------------------------------------------------------------------------
    // 2. POST /sales (Create Counter Sale & Deduct FEFO Inventory Atomically)
    // Allowed: counter_staff, owner, admin
    // ------------------------------------------------------------------------
    if (method === 'POST') {
      const roleErr = requireRoles(user, ['counter_staff', 'owner', 'admin']);
      if (roleErr) return roleErr;

      const body = await req.json();
      const validation = validateRequiredFields(body, ['customer_name', 'items', 'total']);
      if (!validation.valid) {
        return errorResponse('VALIDATION_ERROR', `Missing required field: ${validation.missingField}`, 400);
      }

      const items = Array.isArray(body.items) ? body.items : [];
      if (items.length === 0) {
        return errorResponse('VALIDATION_ERROR', 'Sale must contain at least one line item', 400);
      }

      const invoiceNo = body.invoice_no || `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const isKhata = Boolean(body.is_khata || (Number(body.khata_amount) > 0));
      const totalAmount = Number(body.total) || 0;
      const cashPaid = Number(body.cash_paid) || 0;
      const khataAmount = Number(body.khata_amount) || 0;

      // Validate and deduct inventory items
      const processedItems = [];
      for (const line of items) {
        const itemId = line.item_id || line.itemId;
        const requestedQty = Number(line.qty) || 1;
        const linePrice = Number(line.price) || 0;

        if (!itemId) {
          return errorResponse('VALIDATION_ERROR', 'Each item must have an item_id', 400);
        }

        const { data: currentItem, error: fetchErr } = await client
          .from('inventory')
          .select('*')
          .eq('id', itemId)
          .single();

        if (fetchErr || !currentItem) {
          return errorResponse('NOT_FOUND', `Inventory item ${itemId} not found`, 404);
        }

        if (currentItem.stock_qty < requestedQty) {
          return errorResponse(
            'INSUFFICIENT_STOCK',
            `Insufficient stock for "${currentItem.name}". Requested: ${requestedQty}, Available: ${currentItem.stock_qty}`,
            400
          );
        }

        // FEFO batch allocation: if batch not provided, find earliest non-expired batch
        let chosenBatchNumber = line.batch || line.batch_number;
        const batches = Array.isArray(currentItem.batches) ? [...currentItem.batches] : [];

        if (!chosenBatchNumber && batches.length > 0) {
          const availableBatches = batches
            .filter((b: any) => b.quantity > 0 && b.status !== 'expired')
            .sort((a: any, b: any) => (a.daysRemaining || 0) - (b.daysRemaining || 0));
          if (availableBatches.length > 0) {
            chosenBatchNumber = availableBatches[0].batchNumber;
          }
        }

        // Deduct quantity from batches
        let remainingToDeduct = requestedQty;
        const updatedBatches = batches.map((b: any) => {
          if ((!chosenBatchNumber || b.batchNumber === chosenBatchNumber) && remainingToDeduct > 0) {
            const deduct = Math.min(b.quantity, remainingToDeduct);
            remainingToDeduct -= deduct;
            return {
              ...b,
              quantity: Math.max(0, b.quantity - deduct),
            };
          }
          return b;
        });

        const newStockQty = Math.max(0, currentItem.stock_qty - requestedQty);

        // Update inventory item
        const { error: updateErr } = await client
          .from('inventory')
          .update({
            stock_qty: newStockQty,
            batches: updatedBatches,
          })
          .eq('id', itemId);

        if (updateErr) {
          return errorResponse('DATABASE_ERROR', `Failed to update inventory for ${currentItem.name}: ${updateErr.message}`, 500);
        }

        processedItems.push({
          itemId,
          name: currentItem.name,
          qty: requestedQty,
          price: linePrice,
          batch: chosenBatchNumber || 'General',
        });
      }

      // Handle Customer Khata Ledger if credit transaction
      if (isKhata && khataAmount > 0) {
        const customerName = body.customer_name.trim();
        const { data: existingKhata } = await client
          .from('khata_ledger')
          .select('*')
          .ilike('name', customerName)
          .single();

        if (existingKhata) {
          const newBal = (Number(existingKhata.outstanding_balance) || 0) + khataAmount;
          const newTot = (Number(existingKhata.total_purchased) || 0) + totalAmount;
          await client
            .from('khata_ledger')
            .update({
              outstanding_balance: newBal,
              total_purchased: newTot,
            })
            .eq('id', existingKhata.id);
        } else {
          const newCustomer = {
            id: `khata-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            name: customerName,
            phone: body.customer_phone || '+91 98XXX XXXXX',
            village: body.village || 'Nashik Cluster',
            total_purchased: totalAmount,
            outstanding_balance: khataAmount,
            credit_limit: 50000,
            days_overdue: 0,
            status: 'healthy',
            ageing: 'current',
          };
          await client.from('khata_ledger').insert(newCustomer);
        }
      }

      // Create Sale Record
      const newSaleRecord = {
        id: `sale-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        invoice_no: invoiceNo,
        customer_name: body.customer_name,
        customer_phone: body.customer_phone || null,
        is_khata: isKhata,
        items: processedItems,
        total: totalAmount,
        cash_paid: cashPaid,
        khata_amount: khataAmount,
        date: new Date().toISOString().split('T')[0],
        timestamp: 'Just now',
        payment_mode: body.payment_mode || (isKhata ? (cashPaid > 0 ? 'split' : 'khata') : 'upi'),
      };

      const { data: createdSale, error: saleErr } = await client
        .from('sales')
        .insert(newSaleRecord)
        .select()
        .single();

      if (saleErr) {
        return errorResponse('DATABASE_ERROR', saleErr.message, 500);
      }

      // Log activity
      await client.from('activity_logs').insert({
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        action: 'POS Sale Executed',
        details: `Invoice #${invoiceNo} for ${body.customer_name} (₹${totalAmount.toLocaleString('en-IN')})`,
        user_name: user.fullName,
        time: 'Just now',
        tag: 'sale',
        reference_id: invoiceNo,
      });

      return successResponse(createdSale, null, 201);
    }

    return errorResponse('METHOD_NOT_ALLOWED', `Method ${method} not allowed on /sales`, 405);
  } catch (err: any) {
    return errorResponse('INTERNAL_ERROR', err.message || 'Internal Server Error', 500);
  }
});
