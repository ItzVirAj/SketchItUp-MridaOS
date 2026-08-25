import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { authenticateUser } from '../_shared/auth.ts';
import { requireRole } from '../_shared/rbac.ts';
import { STANDARD_HSN_CODES } from '../_shared/gst.ts';

serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  const { user, error: authError, client } = await authenticateUser(req);
  if (authError) return authError;
  if (!user) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);

  // RBAC: Accounts, Admin, Owner can view GST reports
  const rbacError = requireRole(['owner', 'admin', 'accounts_user'], user.role);
  if (rbacError) return rbacError;

  if (method !== 'GET') {
    return errorResponse('METHOD_NOT_ALLOWED', `Method ${method} not allowed`, 405);
  }

  const fromDate = url.searchParams.get('from') || '2026-01-01';
  const toDate = url.searchParams.get('to') || new Date().toISOString().split('T')[0];
  const branchId = url.searchParams.get('branch_id');

  try {
    // Fetch sales in range
    let query = client.from('sales').select('*').gte('date', fromDate).lte('date', toDate);
    if (branchId && branchId !== 'all') {
      query = query.eq('branch_id', branchId);
    } else if (user.role !== 'admin' && user.role !== 'owner' && user.branchId) {
      query = query.eq('branch_id', user.branchId);
    }

    const { data: salesList, error: salesErr } = await query;
    if (salesErr) {
      return errorResponse('DATABASE_ERROR', salesErr.message, 500);
    }

    const sales = salesList || [];

    // ------------------------------------------------------------------------
    // 1. GET /reports/gst/b2b-invoices (GSTR-1 Table 4A)
    // ------------------------------------------------------------------------
    if (path.includes('/b2b-invoices')) {
      const b2bInvoices = sales
        .filter((s: any) => s.customer_gstin && s.customer_gstin.trim().length >= 15)
        .map((s: any) => ({
          id: s.id,
          invoice_number: s.invoice_number || s.invoice_no,
          invoice_date: s.date,
          customer_name: s.customer_name,
          customer_gstin: s.customer_gstin,
          customer_state_code: s.customer_state_code || '27',
          taxable_amount: Number(s.total_taxable_amount || s.total * 0.85),
          cgst: Number(s.total_cgst || 0),
          sgst: Number(s.total_sgst || 0),
          igst: Number(s.total_igst || 0),
          total_tax: Number(s.total_tax || 0),
          grand_total: Number(s.grand_total || s.total),
          payment_mode: s.payment_mode,
        }));

      return successResponse({
        from: fromDate,
        to: toDate,
        total_invoices: b2bInvoices.length,
        invoices: b2bInvoices,
      });
    }

    // ------------------------------------------------------------------------
    // 2. GET /reports/gst/hsn-summary (GSTR-1 Table 12)
    // ------------------------------------------------------------------------
    if (path.includes('/hsn-summary')) {
      const hsnMap: Record<
        string,
        {
          hsn_code: string;
          description: string;
          uqc: string;
          total_quantity: number;
          total_taxable_value: number;
          cgst: number;
          sgst: number;
          igst: number;
          total_tax: number;
        }
      > = {};

      sales.forEach((sale: any) => {
        const isInterstate = sale.is_interstate || sale.customer_state_code !== '27';
        const items = sale.items || [];

        items.forEach((item: any) => {
          const standard = STANDARD_HSN_CODES[item.name] || { hsn: '3102', rate: 18.0, exempt: false };
          const hsn = item.hsn_code || standard.hsn;
          const isExempt = item.is_gst_exempt ?? standard.exempt;
          const rate = isExempt ? 0 : (item.gst_rate !== undefined ? item.gst_rate : standard.rate);
          const taxable = item.qty * item.price;

          let cgst = 0;
          let sgst = 0;
          let igst = 0;

          if (!isExempt) {
            if (!isInterstate) {
              cgst = taxable * (rate / 200);
              sgst = taxable * (rate / 200);
            } else {
              igst = taxable * (rate / 100);
            }
          }

          if (!hsnMap[hsn]) {
            hsnMap[hsn] = {
              hsn_code: hsn,
              description:
                hsn === '3102'
                  ? 'Mineral or Chemical Fertilizers (Nitrogenous)'
                  : hsn === '3105'
                  ? 'Fertilizers NPK / DAP Mixtures'
                  : hsn === '3808'
                  ? 'Insecticides, Fungicides & Plant Growth Regulators'
                  : hsn === '0602'
                  ? 'Live Plants, Saplings & Nursery stock'
                  : 'Agri Retail Goods & Inputs',
              uqc: item.unit || 'KGS/NOS',
              total_quantity: 0,
              total_taxable_value: 0,
              cgst: 0,
              sgst: 0,
              igst: 0,
              total_tax: 0,
            };
          }

          hsnMap[hsn].total_quantity += item.qty;
          hsnMap[hsn].total_taxable_value += taxable;
          hsnMap[hsn].cgst += cgst;
          hsnMap[hsn].sgst += sgst;
          hsnMap[hsn].igst += igst;
          hsnMap[hsn].total_tax += cgst + sgst + igst;
        });
      });

      const hsnSummaryList = Object.values(hsnMap).map((h) => ({
        ...h,
        total_quantity: Math.round(h.total_quantity * 100) / 100,
        total_taxable_value: Math.round(h.total_taxable_value * 100) / 100,
        cgst: Math.round(h.cgst * 100) / 100,
        sgst: Math.round(h.sgst * 100) / 100,
        igst: Math.round(h.igst * 100) / 100,
        total_tax: Math.round(h.total_tax * 100) / 100,
      }));

      return successResponse({
        from: fromDate,
        to: toDate,
        hsn_count: hsnSummaryList.length,
        summary: hsnSummaryList,
      });
    }

    // ------------------------------------------------------------------------
    // 3. GET /reports/gst/summary (GSTR-3B Aggregates)
    // ------------------------------------------------------------------------
    let b2bTaxable = 0, b2bCgst = 0, b2bSgst = 0, b2bIgst = 0, b2bTotal = 0, b2bCount = 0;
    let b2cTaxable = 0, b2cCgst = 0, b2cSgst = 0, b2cIgst = 0, b2cTotal = 0, b2cCount = 0;
    let interStateTaxable = 0, interStateIgst = 0, interStateCount = 0;
    let nilRatedTotal = 0, exemptedTotal = 0;

    sales.forEach((s: any) => {
      const isB2B = Boolean(s.customer_gstin && s.customer_gstin.trim().length >= 15);
      const isInterstate = Boolean(s.is_interstate || (s.customer_state_code && s.customer_state_code !== '27'));
      const taxable = Number(s.total_taxable_amount || s.total * 0.85);
      const cgst = Number(s.total_cgst || 0);
      const sgst = Number(s.total_sgst || 0);
      const igst = Number(s.total_igst || 0);
      const grandTotal = Number(s.grand_total || s.total);

      if (isB2B) {
        b2bTaxable += taxable;
        b2bCgst += cgst;
        b2bSgst += sgst;
        b2bIgst += igst;
        b2bTotal += grandTotal;
        b2bCount += 1;
      } else {
        b2cTaxable += taxable;
        b2cCgst += cgst;
        b2cSgst += sgst;
        b2cIgst += igst;
        b2cTotal += grandTotal;
        b2cCount += 1;
      }

      if (isInterstate) {
        interStateTaxable += taxable;
        interStateIgst += igst;
        interStateCount += 1;
      }

      // Check items for exemptions
      (s.items || []).forEach((it: any) => {
        if (it.is_gst_exempt || STANDARD_HSN_CODES[it.name]?.exempt) {
          exemptedTotal += it.qty * it.price;
        }
      });
    });

    return successResponse({
      from: fromDate,
      to: toDate,
      period: `${fromDate} to ${toDate}`,
      b2b_sales: {
        total_taxable: Math.round(b2bTaxable * 100) / 100,
        total_cgst: Math.round(b2bCgst * 100) / 100,
        total_sgst: Math.round(b2bSgst * 100) / 100,
        total_igst: Math.round(b2bIgst * 100) / 100,
        total_tax: Math.round((b2bCgst + b2bSgst + b2bIgst) * 100) / 100,
        grand_total: Math.round(b2bTotal * 100) / 100,
        invoice_count: b2bCount,
      },
      b2c_sales: {
        total_taxable: Math.round(b2cTaxable * 100) / 100,
        total_cgst: Math.round(b2cCgst * 100) / 100,
        total_sgst: Math.round(b2cSgst * 100) / 100,
        total_igst: Math.round(b2cIgst * 100) / 100,
        total_tax: Math.round((b2cCgst + b2cSgst + b2cIgst) * 100) / 100,
        grand_total: Math.round(b2cTotal * 100) / 100,
        invoice_count: b2cCount,
      },
      inter_state_sales: {
        total_taxable: Math.round(interStateTaxable * 100) / 100,
        total_igst: Math.round(interStateIgst * 100) / 100,
        invoice_count: interStateCount,
      },
      exempted_sales: {
        total: Math.round(exemptedTotal * 100) / 100,
      },
      nil_rated_sales: {
        total: 0,
      },
      overall_summary: {
        total_taxable: Math.round((b2bTaxable + b2cTaxable) * 100) / 100,
        total_cgst: Math.round((b2bCgst + b2cCgst) * 100) / 100,
        total_sgst: Math.round((b2bSgst + b2cSgst) * 100) / 100,
        total_igst: Math.round((b2bIgst + b2cIgst) * 100) / 100,
        total_tax: Math.round((b2bCgst + b2cCgst + b2bSgst + b2cSgst + b2bIgst + b2cIgst) * 100) / 100,
        total_revenue: Math.round((b2bTotal + b2cTotal) * 100) / 100,
      },
    });
  } catch (err: any) {
    return errorResponse('INTERNAL_ERROR', err.message || 'Internal GST Report Error', 500);
  }
});
