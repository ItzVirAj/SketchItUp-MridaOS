import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { authenticateUser } from '../_shared/auth.ts';
import { validateSchema, CreatePlantCareSchema } from '../_shared/validation.ts';
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
    const parts = path.split('/').filter(Boolean);
    const lastPart = parts[parts.length - 1];

    // ------------------------------------------------------------------------
    // 1. GET /plant-care
    // ------------------------------------------------------------------------
    if (method === 'GET') {
      const rbacError = requireRole(
        ['nursery_care_staff', 'counter_staff', 'inventory_manager', 'owner', 'admin'],
        user.role
      );
      if (rbacError) return rbacError;

      const section = url.searchParams.get('section');
      const category = url.searchParams.get('category');
      const isCompleted = url.searchParams.get('is_completed');

      let query = client.from('plant_care_tasks').select('*');

      if (section) query = query.eq('section', section);
      if (category) query = query.eq('category', category);
      if (isCompleted !== null && isCompleted !== undefined) {
        query = query.eq('is_completed', isCompleted === 'true');
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) {
        return errorResponse('DATABASE_ERROR', error.message, 500);
      }

      return successResponse(data || []);
    }

    // ------------------------------------------------------------------------
    // 2. POST /plant-care (Create Task)
    // ------------------------------------------------------------------------
    if (method === 'POST' && (lastPart === 'plant-care' || lastPart === 'v1')) {
      const rbacError = requireRole(['nursery_care_staff', 'inventory_manager', 'owner', 'admin'], user.role);
      if (rbacError) return rbacError;

      const rawBody = await req.json();
      const validation = validateSchema(CreatePlantCareSchema, rawBody);
      if (validation.error) return validation.error;

      const body = validation.data;

      const newTask = {
        title: body.title,
        category: body.category,
        section: body.section,
        time_slot: body.time_slot,
        plant_type: body.plant_type,
        quantity: body.quantity,
        is_completed: false,
        notes: body.notes || null,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await client
        .from('plant_care_tasks')
        .insert(newTask)
        .select()
        .single();

      if (error) {
        return errorResponse('DATABASE_ERROR', error.message, 500);
      }

      return successResponse(data || newTask, null, 201);
    }

    // ------------------------------------------------------------------------
    // 3. PATCH /plant-care/:id/complete (Toggle Complete)
    // ------------------------------------------------------------------------
    if (method === 'PATCH' && path.includes('/complete')) {
      const rbacError = requireRole(['nursery_care_staff', 'owner', 'admin'], user.role);
      if (rbacError) return rbacError;

      const taskId = parts[parts.indexOf('plant-care') + 1] || lastPart;
      const rawBody = await req.json().catch(() => ({}));
      const notes = rawBody.notes;

      const { data: task, error: fetchErr } = await client
        .from('plant_care_tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (fetchErr || !task) {
        return errorResponse('NOT_FOUND', `Task ${taskId} not found`, 404);
      }

      const isNowCompleted = !task.is_completed;
      const { data: updated, error: updateErr } = await client
        .from('plant_care_tasks')
        .update({
          is_completed: isNowCompleted,
          notes: notes !== undefined ? notes : task.notes,
          completed_at: isNowCompleted ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)
        .select()
        .single();

      if (updateErr) {
        return errorResponse('DATABASE_ERROR', updateErr.message, 500);
      }

      return successResponse(updated);
    }

    return errorResponse('METHOD_NOT_ALLOWED', `Method ${method} not allowed on /plant-care`, 405);
  } catch (err: any) {
    return errorResponse('INTERNAL_ERROR', err.message || 'Internal Server Error', 500);
  }
});
