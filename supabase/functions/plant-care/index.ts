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
    const parts = path.split('/').filter(Boolean);
    const isComplete = path.endsWith('/complete');

    // 1. PATCH /plant-care-tasks/:id/complete (Toggle Complete)
    if (method === 'PATCH' && isComplete) {
      const roleErr = requireRoles(user, ['nursery_care_staff', 'admin', 'owner']);
      if (roleErr) return roleErr;

      const taskId = parts[parts.length - 2];
      const body = await req.json().catch(() => ({}));
      const notes = body.notes;

      const { data: task, error: fetchErr } = await client
        .from('plant_care_tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (fetchErr || !task) {
        return errorResponse('NOT_FOUND', `Plant care task ${taskId} not found`, 404);
      }

      const newStatus = !task.is_completed;
      const updates: any = { is_completed: newStatus };
      if (notes) updates.notes = notes;

      const { data: updated, error: updateErr } = await client
        .from('plant_care_tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single();

      if (updateErr) return errorResponse('DATABASE_ERROR', updateErr.message, 500);

      return successResponse(updated);
    }

    // 2. GET /plant-care-tasks
    if (method === 'GET') {
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
      if (error) return errorResponse('DATABASE_ERROR', error.message, 500);

      return successResponse(data || []);
    }

    // 3. POST /plant-care-tasks (Create Task)
    if (method === 'POST') {
      const roleErr = requireRoles(user, ['nursery_care_staff', 'admin', 'owner']);
      if (roleErr) return roleErr;

      const body = await req.json();
      const validation = validateRequiredFields(body, ['title', 'category', 'section', 'plant_type']);
      if (!validation.valid) {
        return errorResponse('VALIDATION_ERROR', `Missing required field: ${validation.missingField}`, 400);
      }

      const newTask = {
        id: body.id || `task-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        title: body.title,
        category: body.category,
        section: body.section,
        time_slot: body.time_slot || '08:00 AM',
        plant_type: body.plant_type,
        quantity: body.quantity || '50 Pots',
        is_completed: false,
        notes: body.notes || null,
      };

      const { data, error } = await client.from('plant_care_tasks').insert(newTask).select().single();
      if (error) return errorResponse('DATABASE_ERROR', error.message, 400);

      await client.from('activity_logs').insert({
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        action: 'Plant Care Scheduled',
        details: `${body.title} in ${body.section} (${body.plant_type})`,
        user_name: user.fullName,
        time: 'Just now',
        tag: 'nursery',
      });

      return successResponse(data, null, 201);
    }

    return errorResponse('METHOD_NOT_ALLOWED', `Method ${method} not allowed on /plant-care-tasks`, 405);
  } catch (err: any) {
    return errorResponse('INTERNAL_ERROR', err.message || 'Internal Server Error', 500);
  }
});
