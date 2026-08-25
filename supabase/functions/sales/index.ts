import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { authenticateUser } from '../_shared/auth.ts';
import { validateSchema, CreateSaleSchema, zSearchQuery } from '../_shared/validation.ts';
import { requireRole, requireBranchMatch } from '../_shared/rbac.ts';
import { enforceApiRateLimit, enforceGlobalIpRateLimit } from '../_shared/apiRateLimit.ts';
import {
  calculateGSTInvoiceSummary,
  STANDARD_HSN_CODES,
  numberToIndianRupeeWords,
} from '../_shared/gst.ts';

// In-memory invoice counter fallback if DB sequence table is not initialized
let invoiceSequenceCounter = 100;

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
    const isInvoicePrint = path.includes('/invoice');
    const isSingle = lastPart !== 'sales' && lastPart !== 'v1' && !isInvoicePrint;

    // ------------------------------------------------------------------------
    // 1. GET /sales/:id/invoice (Printable GST Tax Invoice)
    // ------------------------------------------------------------------------
    if (method === 'GET' && isInvoicePrint) {
      const rbacError = requireRole(
        ['counter_staff', 'owner', 'admin', 'inventory_manager', 'accounts_user'],
        user.role
      );
      if (rbacError) return rbacError;

      const saleId = parts[parts.indexOf('sales') + 1] || parts[parts.length - 2];
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

      // Fetch or derive line items tax breakdown
      const gstSummary = calculateGSTInvoiceSummary(
        sale.items || [],
        {
          invoiceNumber: sale.invoice_number || sale.invoice_no || `INV/2026/${sale.id.slice(0, 6)}`,
          invoiceDate: sale.date || new Date().toISOString().split('T')[0],
          customerStateCode: sale.customer_state_code || '27',
          branchStateCode: sale.branch_state_code || '27',
        }
      );

      return successResponse({
        sale,
        invoice: {
          seller: {
            legal_name: 'MridaOS Agro Retail Pvt Ltd',
            branch_id: sale.branch_id || 'nashik-central',
            gstin: '27AABCU9603R1ZX',
            address: 'Shop 14-16, APMC Market Yard, Dindori Road, Nashik, Maharashtra - 422003',
            state: 'Maharashtra',
            state_code: '27',
          },
          buyer: {
            name: sale.customer_name,
            phone: sale.customer_phone,
            gstin: sale.customer_gstin || 'Unregistered',
            state_code: sale.customer_state_code || '27',
          },
          invoice_number: gstSummary.invoice_number,
          invoice_date: gstSummary.invoice_date,
          financial_year: gstSummary.financial_year,
          is_interstate: gstSummary.is_interstate,
          line_items: gstSummary.line_items,
          total_taxable_amount: gstSummary.total_taxable_amount,
          total_cgst: gstSummary.total_cgst,
          total_sgst: gstSummary.total_sgst,
          total_igst: gstSummary.total_igst,
          total_tax: gstSummary.total_tax,
          round_off: gstSummary.round_off,
          grand_total: gstSummary.grand_total,
          amount_in_words: gstSummary.amount_in_words,
          payment_mode: sale.payment_mode || 'cash',
        },
      });
    }

    // ------------------------------------------------------------------------
    // 2. GET /sales OR /sales/:id
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
    // 3. POST /sales (GST Tax Invoicing with Line-Item Breakdown & Atomic FEFO)
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

      // GST Compliance Check: Sale > ₹50,000 requires customer details
      if (body.total > 50000 && (!body.customer_name || body.customer_name.trim().toLowerCase() === 'walk-in customer')) {
        return errorResponse(
          'COMPLIANCE_ERROR',
          'GST Compliance Notice: B2C or B2B sales exceeding ₹50,000 mandate customer name and phone details.',
          400
        );
      }

      // Generate Sequential GST Invoice Number
      invoiceSequenceCounter += 1;
      const nextSeq = String(invoiceSequenceCounter).padStart(5, '0');
      const invoiceNumber = `INV/${nextSeq}/2025-26`;
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];

      // Customer state code (Default '27' for Maharashtra, or from body)
      const customerStateCode = (rawBody.customer_state_code || '27').trim();
      const branchStateCode = '27'; // Maharashtra Nashik Central

      // Enhance line items with HSN codes & GST rates
      const lineItemInputs = body.items.map((cartItem) => {
        const standardMeta = STANDARD_HSN_CODES[cartItem.name] || { hsn: '3102', rate: 18.0, exempt: false };
        return {
          item_id: cartItem.item_id,
          name: cartItem.name,
          qty: cartItem.qty,
          price: cartItem.price,
          batch: cartItem.batch,
          hsn_code: cartItem.hsn_code || standardMeta.hsn,
          gst_rate: cartItem.gst_rate !== undefined ? cartItem.gst_rate : standardMeta.rate,
          is_gst_exempt: cartItem.is_gst_exempt !== undefined ? cartItem.is_gst_exempt : standardMeta.exempt,
        };
      });

      // Calculate complete GST breakdown
      const gstSummary = calculateGSTInvoiceSummary(lineItemInputs, {
        invoiceNumber,
        invoiceDate: dateStr,
        financialYear: '2025-26',
        customerStateCode,
        branchStateCode,
      });

      // Atomic FEFO Stock Deductions
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
        khataAmount = Math.max(0, gstSummary.grand_total - body.cash_paid);

        const { data: customerData } = await client
          .from('khata_ledger')
          .select('*')
          .eq('id', body.customer_id)
          .single();

        if (customerData) {
          const currentBal = Number(customerData.outstanding_balance) || 0;
          const newBal = currentBal + khataAmount;
          const totalPurchased = (Number(customerData.total_purchased) || 0) + gstSummary.grand_total;

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

      // Insert Sale Record with Tax Summary
      const saleRecord = {
        invoice_no: invoiceNumber,
        invoice_number: invoiceNumber,
        customer_name: body.customer_name,
        customer_phone: body.customer_phone || null,
        customer_gstin: rawBody.customer_gstin || null,
        customer_state_code: customerStateCode,
        branch_state_code: branchStateCode,
        is_interstate: gstSummary.is_interstate,
        is_khata: body.is_khata,
        items: body.items,
        total: gstSummary.grand_total,
        total_taxable_amount: gstSummary.total_taxable_amount,
        total_cgst: gstSummary.total_cgst,
        total_sgst: gstSummary.total_sgst,
        total_igst: gstSummary.total_igst,
        total_tax: gstSummary.total_tax,
        round_off: gstSummary.round_off,
        grand_total: gstSummary.grand_total,
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

      // Insert Granular Sales Line Items if table exists
      try {
        const saleId = newSale?.id || crypto.randomUUID();
        const lineItemRows = gstSummary.line_items.map((li) => ({
          sale_id: saleId,
          item_id: li.item_id || null,
          item_name: li.name,
          batch_id: li.batch || 'LOT-2026-DEFAULT',
          quantity: li.qty,
          unit_price: li.price,
          hsn_code: li.hsn_code,
          gst_rate: li.gst_rate,
          is_gst_exempt: li.is_gst_exempt,
          taxable_amount: li.taxable_amount,
          cgst_rate: li.cgst_rate,
          cgst_amount: li.cgst_amount,
          sgst_rate: li.sgst_rate,
          sgst_amount: li.sgst_amount,
          igst_rate: li.igst_rate,
          igst_amount: li.igst_amount,
          total_tax: li.total_tax,
          total_amount: li.total_amount,
        }));

        await client.from('sales_line_items').insert(lineItemRows);
      } catch (lineItemErr) {
        console.warn('Could not insert into sales_line_items table:', lineItemErr);
      }

      return successResponse(
        {
          sale: newSale || saleRecord,
          invoice: gstSummary,
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
