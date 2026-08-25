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
    const lastPart = parts[parts.length - 1];
    const isSingle = lastPart !== 'branches' && lastPart !== 'v1';

    // 1. GET /branches OR /branches/:id
    if (method === 'GET') {
      if (isSingle) {
        const branchId = lastPart;
        const { data: branch, error } = await client
          .from('branches')
          .select('*')
          .eq('id', branchId)
          .single();

        if (error || !branch) {
          return errorResponse('NOT_FOUND', `Branch with ID ${branchId} not found`, 404);
        }

        return successResponse(branch);
      }

      const { data: branches, error } = await client
        .from('branches')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        return errorResponse('DATABASE_ERROR', error.message, 500);
      }

      return successResponse(branches || []);
    }

    // 2. POST /branches (Admin only)
    if (method === 'POST') {
      const roleErr = requireRoles(user, ['admin', 'owner']);
      if (roleErr) return roleErr;

      const body = await req.json();
      const validation = validateRequiredFields(body, ['name', 'location', 'type']);
      if (!validation.valid) {
        return errorResponse('VALIDATION_ERROR', `Missing required field: ${validation.missingField}`, 400);
      }

      const newBranch = {
        id: body.id || body.name.toLowerCase().replace(/\s+/g, '-'),
        name: body.name,
        location: body.location,
        type: body.type,
        manager: body.manager || '',
        license_number: body.license_number || '',
      };

      const { data, error } = await client.from('branches').insert(newBranch).select().single();
      if (error) {
        return errorResponse('DATABASE_ERROR', error.message, 400);
      }

      return successResponse(data, null, 201);
    }

    // 3. PUT /branches/:id (Admin only)
    if (method === 'PUT') {
      const roleErr = requireRoles(user, ['admin', 'owner']);
      if (roleErr) return roleErr;

      const branchId = lastPart;
      const body = await req.json();

      const { data, error } = await client
        .from('branches')
        .update(body)
        .eq('id', branchId)
        .select()
        .single();

      if (error) {
        return errorResponse('DATABASE_ERROR', error.message, 400);
      }

      return successResponse(data);
    }

    return errorResponse('METHOD_NOT_ALLOWED', `Method ${method} not allowed on /branches`, 405);
  } catch (err: any) {
    return errorResponse('INTERNAL_ERROR', err.message || 'Internal Server Error', 500);
  }
});
