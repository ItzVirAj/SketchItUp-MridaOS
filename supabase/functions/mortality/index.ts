import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { authenticateUser, requireRoles } from '../_shared/auth.ts';
import { validateRequiredFields } from '../_shared/validation.ts';

serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const url = new URL(req.url);
  const method = req.method;

  const { user, error: authError, client } = await authenticateUser(req);
  if (authError) return authError;
  if (!user) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);

  try {
    if (method === 'GET') {
      const section = url.searchParams.get('section');
      const reason = url.searchParams.get('reason');

      let query = client.from('mortality_records').select('*');
      if (section) query = query.eq('section', section);
      if (reason) query = query.ilike('reason', `%${reason}%`);

      const { data, error } = await query.order('date', { ascending: false });
      if (error) return errorResponse('DATABASE_ERROR', error.message, 500);

      return successResponse(data || []);
    }

    if (method === 'POST') {
      const roleErr = requireRoles(user, ['nursery_care_staff', 'admin', 'owner']);
      if (roleErr) return roleErr;

      const body = await req.json();
      const validation = validateRequiredFields(body, ['plant_name', 'quantity_lost', 'reason', 'section']);
      if (!validation.valid) {
        return errorResponse('VALIDATION_ERROR', `Missing required field: ${validation.missingField}`, 400);
      }

      const newRecord = {
        id: body.id || `mort-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        date: body.date || new Date().toISOString().split('T')[0],
        plant_name: body.plant_name,
        quantity_lost: Number(body.quantity_lost) || 0,
        estimated_value: Number(body.estimated_value) || 0,
        reason: body.reason,
        section: body.section,
      };

      const { data, error } = await client.from('mortality_records').insert(newRecord).select().single();
      if (error) return errorResponse('DATABASE_ERROR', error.message, 400);

      await client.from('activity_logs').insert({
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        action: 'Nursery Plant Mortality Logged',
        details: `Lost ${newRecord.quantity_lost} units of ${newRecord.plant_name} in ${newRecord.section} (${newRecord.reason})`,
        user_name: user.fullName,
        time: 'Just now',
        tag: 'nursery',
      });

      return successResponse(data, null, 201);
    }

    return errorResponse('METHOD_NOT_ALLOWED', `Method ${method} not allowed on /mortality-records`, 405);
  } catch (err: any) {
    return errorResponse('INTERNAL_ERROR', err.message || 'Internal Server Error', 500);
  }
});
