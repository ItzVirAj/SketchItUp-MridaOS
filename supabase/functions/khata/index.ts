import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { authenticateUser, requireRoles } from '../_shared/auth.ts';
import { validateRequiredFields } from '../_shared/validation.ts';

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
      const { data: allKhata, error } = await client.from('khata_ledger').select('*');
      if (error) {
        return errorResponse('DATABASE_ERROR', error.message, 500);
      }

      const rows = allKhata || [];
      const totalOutstanding = rows.reduce((sum: number, r: any) => sum + (Number(r.outstanding_balance) || 0), 0);

      const bucketDefs = [
        { label: 'Current (0–30d)', key: 'current', daysMin: 0, daysMax: 30, color: '#079455' },
        { label: '31–60 Days', key: '31-60', daysMin: 31, daysMax: 60, color: '#F9AD19' },
        { label: '61–90 Days', key: '61-90', daysMin: 61, daysMax: 90, color: '#F79009' },
        { label: '90+ Days (Critical)', key: '90+', daysMin: 91, daysMax: 9999, color: '#D92D20' },
      ];

      const buckets = bucketDefs.map((b) => {
        const matching = rows.filter((r: any) => (r.days_overdue || 0) >= b.daysMin && (r.days_overdue || 0) <= b.daysMax);
        const amount = matching.reduce((sum: number, r: any) => sum + (Number(r.outstanding_balance) || 0), 0);
        const count = matching.length;
        const percentage = totalOutstanding > 0 ? Math.round((amount / totalOutstanding) * 100) : 0;
        return { ...b, amount, count, percentage };
      });

      return successResponse({
        totalOutstanding,
        totalCustomersWithCredit: rows.filter((r: any) => r.outstanding_balance > 0).length,
        buckets,
      });
    }

    // ------------------------------------------------------------------------
    // 2. GET /khata/ledger/:customer_id
    // ------------------------------------------------------------------------
    if (method === 'GET' && path.includes('/ledger/')) {
      const parts = path.split('/').filter(Boolean);
      const customerId = parts[parts.length - 1];

      const { data: customer, error: custErr } = await client
        .from('khata_ledger')
        .select('*')
        .eq('id', customerId)
        .single();

      if (custErr || !customer) {
        return errorResponse('NOT_FOUND', `Khata record for customer ${customerId} not found`, 404);
      }

      // Fetch transaction history
      const { data: sales } = await client
        .from('sales')
        .select('*')
        .ilike('customer_name', `%${customer.name}%`)
        .order('created_at', { ascending: false });

      return successResponse({
        customer,
        transactions: sales || [],
      });
    }

    // ------------------------------------------------------------------------
    // 3. POST /khata/payments (Record Farmer Payment & Clear Outstanding)
    // Allowed: accounts_user, counter_staff, admin, owner
    // ------------------------------------------------------------------------
    if (method === 'POST' && (path.includes('/payments') || path.endsWith('/khata'))) {
      const roleErr = requireRoles(user, ['accounts_user', 'counter_staff', 'admin', 'owner']);
      if (roleErr) return roleErr;

      const body = await req.json();
      const validation = validateRequiredFields(body, ['customer_id', 'amount']);
      if (!validation.valid) {
        return errorResponse('VALIDATION_ERROR', `Missing required field: ${validation.missingField}`, 400);
      }

      const customerId = body.customer_id;
      const paymentAmount = Number(body.amount) || 0;
      const paymentMode = body.payment_mode || 'cash';

      const { data: customer, error: fetchErr } = await client
        .from('khata_ledger')
        .select('*')
        .eq('id', customerId)
        .single();

      if (fetchErr || !customer) {
        return errorResponse('NOT_FOUND', `Customer ${customerId} not found`, 404);
      }

      const currentBalance = Number(customer.outstanding_balance) || 0;
      const newBalance = Math.max(0, currentBalance - paymentAmount);
      const newStatus = newBalance === 0 ? 'healthy' : customer.status;

      const { data: updatedCust, error: updateErr } = await client
        .from('khata_ledger')
        .update({
          outstanding_balance: newBalance,
          status: newStatus,
          last_payment_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', customerId)
        .select()
        .single();

      if (updateErr) {
        return errorResponse('DATABASE_ERROR', updateErr.message, 500);
      }

      const receiptNo = `REC-${Math.floor(1000 + Math.random() * 9000)}`;

      // Log activity
      await client.from('activity_logs').insert({
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        action: 'Khata Payment Settle',
        details: `Settled ₹${paymentAmount.toLocaleString('en-IN')} for ${customer.name} via ${paymentMode}`,
        user_name: user.fullName,
        time: 'Just now',
        tag: 'khata',
        reference_id: receiptNo,
      });

      return successResponse({
        customer: updatedCust,
        receiptNo,
        amountReceived: paymentAmount,
        remainingBalance: newBalance,
      }, null, 201);
    }

    return errorResponse('METHOD_NOT_ALLOWED', `Method ${method} not allowed on /khata`, 405);
  } catch (err: any) {
    return errorResponse('INTERNAL_ERROR', err.message || 'Internal Server Error', 500);
  }
});
