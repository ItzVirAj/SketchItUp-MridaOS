import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { authenticateUser } from '../_shared/auth.ts';
import { validateSchema, RecordPaymentSchema } from '../_shared/validation.ts';
import { requireRole } from '../_shared/rbac.ts';

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
    // 1. GET /khata/ageing-report
    // ------------------------------------------------------------------------
    if (method === 'GET' && path.includes('/ageing-report')) {
      const rbacError = requireRole(['owner', 'admin', 'accounts_user'], user.role);
      if (rbacError) return rbacError;

      const { data: allKhata, error } = await client.from('khata_ledger').select('*');
      if (error) {
        return errorResponse('DATABASE_ERROR', error.message, 500);
      }

      const rows = allKhata || [];
      const totalOutstanding = rows.reduce((sum: number, r: any) => sum + (Number(r.outstanding_balance) || 0), 0);

      const buckets = {
        current: 0,
        days_1_30: 0,
        days_31_60: 0,
        days_61_90: 0,
        days_90_plus: 0,
      };

      rows.forEach((r: any) => {
        const bal = Number(r.outstanding_balance) || 0;
        const days = Number(r.days_overdue) || 0;
        if (days === 0) buckets.current += bal;
        else if (days <= 30) buckets.days_1_30 += bal;
        else if (days <= 60) buckets.days_31_60 += bal;
        else if (days <= 90) buckets.days_61_90 += bal;
        else buckets.days_90_plus += bal;
      });

      return successResponse({
        totalOutstanding,
        customersCount: rows.length,
        buckets,
        overdueCustomers: rows.filter((r: any) => (Number(r.days_overdue) || 0) > 0),
      });
    }

    // ------------------------------------------------------------------------
    // 2. GET /khata/ledger/:customerId
    // ------------------------------------------------------------------------
    if (method === 'GET' && path.includes('/ledger/')) {
      const rbacError = requireRole(['counter_staff', 'owner', 'admin', 'accounts_user'], user.role);
      if (rbacError) return rbacError;

      const customerId = path.split('/ledger/')[1]?.replace(/\/$/, '');

      const { data: customer, error: custErr } = await client
        .from('khata_ledger')
        .select('*')
        .eq('id', customerId)
        .single();

      if (custErr || !customer) {
        return errorResponse('NOT_FOUND', `Customer ${customerId} not found in Khata ledger`, 404);
      }

      const { data: transactions } = await client
        .from('sales')
        .select('*')
        .eq('customer_name', customer.name)
        .order('created_at', { ascending: false });

      return successResponse({
        customer,
        transactions: transactions || [],
      });
    }

    // ------------------------------------------------------------------------
    // 3. POST /khata/payments (Record Farmer Khata Repayment)
    // ------------------------------------------------------------------------
    if (method === 'POST' && (path.includes('/payments') || path.endsWith('/khata'))) {
      const rbacError = requireRole(['counter_staff', 'owner', 'admin', 'accounts_user'], user.role);
      if (rbacError) return rbacError;

      const rawBody = await req.json();
      const validation = validateSchema(RecordPaymentSchema, rawBody);
      if (validation.error) return validation.error;

      const { customer_id, amount, payment_mode } = validation.data;

      const { data: customer, error: custErr } = await client
        .from('khata_ledger')
        .select('*')
        .eq('id', customer_id)
        .single();

      if (custErr || !customer) {
        return errorResponse('NOT_FOUND', `Customer ${customer_id} not found`, 404);
      }

      const currentBalance = Number(customer.outstanding_balance) || 0;
      const newBalance = Math.max(0, currentBalance - amount);
      const newDaysOverdue = newBalance === 0 ? 0 : customer.days_overdue;

      const { data: updatedCustomer, error: updateErr } = await client
        .from('khata_ledger')
        .update({
          outstanding_balance: newBalance,
          days_overdue: newDaysOverdue,
          status: newBalance === 0 ? 'healthy' : 'due_soon',
          last_payment_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', customer_id)
        .select()
        .single();

      if (updateErr) {
        return errorResponse('DATABASE_ERROR', updateErr.message, 500);
      }

      const receiptNo = `RCP-2026-${Math.floor(1000 + Math.random() * 9000)}`;

      return successResponse({
        receiptNo,
        amountReceived: amount,
        previousBalance: currentBalance,
        newBalance,
        paymentMode: payment_mode,
        customer: updatedCustomer,
      });
    }

    return errorResponse('NOT_FOUND', 'Khata endpoint not found', 404);
  } catch (err: any) {
    return errorResponse('INTERNAL_ERROR', err.message || 'Internal Server Error', 500);
  }
});
