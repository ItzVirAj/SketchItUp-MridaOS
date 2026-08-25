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
    const isSingle = lastPart !== 'customers' && lastPart !== 'v1';

    // 1. GET /customers OR /customers/:id
    if (method === 'GET') {
      if (isSingle) {
        const customerId = lastPart;
        const { data: customer, error } = await client
          .from('khata_ledger')
          .select('*')
          .eq('id', customerId)
          .single();

        if (error || !customer) {
          return errorResponse('NOT_FOUND', `Customer with ID ${customerId} not found`, 404);
        }

        // Linked sales
        const { data: sales } = await client
          .from('sales')
          .select('*')
          .ilike('customer_name', `%${customer.name}%`)
          .limit(10);

        return successResponse({
          ...customer,
          recentInvoices: sales || [],
        });
      }

      // List customers
      const { page, limit, offset } = parsePaginationParams(url);
      const search = url.searchParams.get('search')?.toLowerCase();
      const hasOutstanding = url.searchParams.get('has_outstanding_balance') === 'true';

      let query = client.from('khata_ledger').select('*', { count: 'exact' });

      if (search) {
        query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,village.ilike.%${search}%`);
      }

      if (hasOutstanding) {
        query = query.gt('outstanding_balance', 0);
      }

      const { data, count, error } = await query
        .range(offset, offset + limit - 1)
        .order('outstanding_balance', { ascending: false });

      if (error) {
        return errorResponse('DATABASE_ERROR', error.message, 500);
      }

      return successResponse(data || [], {
        page,
        limit,
        total: count || (data || []).length,
      });
    }

    // 2. POST /customers (Create Customer)
    if (method === 'POST') {
      const roleErr = requireRoles(user, ['counter_staff', 'accounts_user', 'admin', 'owner']);
      if (roleErr) return roleErr;

      const body = await req.json();
      const validation = validateRequiredFields(body, ['name', 'phone']);
      if (!validation.valid) {
        return errorResponse('VALIDATION_ERROR', `Missing required field: ${validation.missingField}`, 400);
      }

      const newCustomer = {
        id: body.id || `khata-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: body.name,
        phone: body.phone,
        village: body.village || 'Nashik Cluster',
        total_purchased: Number(body.total_purchased) || 0,
        outstanding_balance: Number(body.outstanding_balance) || 0,
        credit_limit: Number(body.credit_limit) || 50000,
        days_overdue: Number(body.days_overdue) || 0,
        last_payment_date: body.last_payment_date || null,
        status: body.status || 'healthy',
        ageing: body.ageing || 'current',
      };

      const { data, error } = await client.from('khata_ledger').insert(newCustomer).select().single();
      if (error) {
        return errorResponse('DATABASE_ERROR', error.message, 400);
      }

      return successResponse(data, null, 201);
    }

    // 3. PUT /customers/:id (Update Customer)
    if (method === 'PUT') {
      const roleErr = requireRoles(user, ['counter_staff', 'accounts_user', 'admin', 'owner']);
      if (roleErr) return roleErr;

      const customerId = lastPart;
      const body = await req.json();

      const { data, error } = await client
        .from('khata_ledger')
        .update(body)
        .eq('id', customerId)
        .select()
        .single();

      if (error) {
        return errorResponse('DATABASE_ERROR', error.message, 400);
      }

      return successResponse(data);
    }

    return errorResponse('METHOD_NOT_ALLOWED', `Method ${method} not allowed on /customers`, 405);
  } catch (err: any) {
    return errorResponse('INTERNAL_ERROR', err.message || 'Internal Server Error', 500);
  }
});
