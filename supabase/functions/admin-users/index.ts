import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { authenticateUser, getServiceRoleClient } from '../_shared/auth.ts';
import { validateRequiredFields } from '../_shared/validation.ts';

serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  // 1. Authenticate caller and strictly enforce role = admin or owner
  const { user, error: authError } = await authenticateUser(req);
  if (authError) return authError;
  if (!user) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);

  if (user.role !== 'admin' && user.role !== 'owner') {
    return errorResponse('FORBIDDEN', 'Only Admins and Store Owners can access user management', 403);
  }

  // 2. Obtain service-role client for privileged Auth admin operations
  const adminClient = getServiceRoleClient();

  try {
    const parts = path.split('/').filter(Boolean);
    const lastPart = parts[parts.length - 1];
    const isRevoke = path.endsWith('/revoke');
    const isUnrevoke = path.endsWith('/unrevoke');

    // ------------------------------------------------------------------------
    // GET /admin-users (List all profiles)
    // ------------------------------------------------------------------------
    if (method === 'GET') {
      const { data: profiles, error } = await adminClient
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) return errorResponse('DATABASE_ERROR', error.message, 500);

      return successResponse(profiles || []);
    }

    // ------------------------------------------------------------------------
    // POST /admin-users (Create new employee via GoTrue Admin API)
    // ------------------------------------------------------------------------
    if (method === 'POST' && !isRevoke && !isUnrevoke) {
      const body = await req.json();
      const validation = validateRequiredFields(body, ['email', 'password', 'full_name', 'role']);
      if (!validation.valid) {
        return errorResponse('VALIDATION_ERROR', `Missing required field: ${validation.missingField}`, 400);
      }

      const { email, password, full_name, role, branch_id } = body;

      // Create in Supabase GoTrue Auth
      const { data: authUser, error: createAuthErr } = await adminClient.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: full_name.trim(),
          role: role,
          branch_id: branch_id || 'nashik-central',
        },
      });

      if (createAuthErr) {
        return errorResponse('AUTH_ERROR', createAuthErr.message, 400);
      }

      // Upsert profile
      const { data: profile, error: profErr } = await adminClient
        .from('profiles')
        .upsert({
          id: authUser.user.id,
          email: email.trim().toLowerCase(),
          full_name: full_name.trim(),
          role: role,
          branch_id: branch_id || 'nashik-central',
          status: 'active',
        })
        .select()
        .single();

      if (profErr) {
        return errorResponse('DATABASE_ERROR', profErr.message, 500);
      }

      // Log activity
      await adminClient.from('activity_logs').insert({
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        action: 'Staff Account Provisioned',
        details: `Created account for ${full_name} (${email}) with role [${role}]`,
        user_name: user.fullName,
        time: 'Just now',
        tag: 'compliance',
      });

      return successResponse(profile, null, 201);
    }

    // ------------------------------------------------------------------------
    // PATCH /admin-users/:id/revoke
    // ------------------------------------------------------------------------
    if (method === 'PATCH' && isRevoke) {
      const targetUserId = parts[parts.length - 2];

      // Update status in profiles
      const { data: profile, error: profErr } = await adminClient
        .from('profiles')
        .update({ status: 'revoked', updated_at: new Date().toISOString() })
        .eq('id', targetUserId)
        .select()
        .single();

      if (profErr) return errorResponse('DATABASE_ERROR', profErr.message, 500);

      // Ban user in auth
      await adminClient.auth.admin.updateUserById(targetUserId, {
        ban_duration: '876000h', // 100 years
      });

      return successResponse({ message: 'User access revoked', profile });
    }

    // ------------------------------------------------------------------------
    // PATCH /admin-users/:id/unrevoke
    // ------------------------------------------------------------------------
    if (method === 'PATCH' && isUnrevoke) {
      const targetUserId = parts[parts.length - 2];

      const { data: profile, error: profErr } = await adminClient
        .from('profiles')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', targetUserId)
        .select()
        .single();

      if (profErr) return errorResponse('DATABASE_ERROR', profErr.message, 500);

      await adminClient.auth.admin.updateUserById(targetUserId, {
        ban_duration: 'none',
      });

      return successResponse({ message: 'User access restored', profile });
    }

    // ------------------------------------------------------------------------
    // PUT /admin-users/:id (Update Profile)
    // ------------------------------------------------------------------------
    if (method === 'PUT') {
      const targetUserId = lastPart;
      const body = await req.json();

      const { data: profile, error: profErr } = await adminClient
        .from('profiles')
        .update({
          full_name: body.full_name,
          role: body.role,
          branch_id: body.branch_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetUserId)
        .select()
        .single();

      if (profErr) return errorResponse('DATABASE_ERROR', profErr.message, 500);

      // Sync user_metadata
      await adminClient.auth.admin.updateUserById(targetUserId, {
        user_metadata: {
          full_name: body.full_name,
          role: body.role,
          branch_id: body.branch_id,
        },
      });

      return successResponse(profile);
    }

    // ------------------------------------------------------------------------
    // DELETE /admin-users/:id (Hard Delete User)
    // ------------------------------------------------------------------------
    if (method === 'DELETE') {
      const targetUserId = lastPart;

      await adminClient.from('profiles').delete().eq('id', targetUserId);
      const { error: delErr } = await adminClient.auth.admin.deleteUser(targetUserId);

      if (delErr) return errorResponse('AUTH_ERROR', delErr.message, 500);

      return successResponse({ message: 'User permanently deleted', userId: targetUserId });
    }

    return errorResponse('METHOD_NOT_ALLOWED', `Method ${method} not allowed on /admin-users`, 405);
  } catch (err: any) {
    return errorResponse('INTERNAL_ERROR', err.message || 'Internal Server Error', 500);
  }
});
