import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { authenticateUser } from '../_shared/auth.ts';
import { validateSchema, CreateUserSchema } from '../_shared/validation.ts';
import { requireRole } from '../_shared/rbac.ts';
import { unlockAccount } from '../_shared/accountLockout.ts';
import { logSecurityEvent } from '../_shared/securityLogger.ts';

serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  const clientIp =
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    '127.0.0.1';

  const { user, error: authError, client } = await authenticateUser(req);
  if (authError) return authError;
  if (!user) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);

  // Strict RBAC: Only admin and owner can manage users
  const rbacError = requireRole(['owner', 'admin'], user.role);
  if (rbacError) return rbacError;

  try {
    const parts = path.split('/').filter(Boolean);
    const lastPart = parts[parts.length - 1];
    const isSingle = lastPart !== 'admin-users' && lastPart !== 'v1';

    // ------------------------------------------------------------------------
    // 1. GET /admin-users (List all employees)
    // ------------------------------------------------------------------------
    if (method === 'GET') {
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        return errorResponse('DATABASE_ERROR', error.message, 500);
      }
      return successResponse(data || []);
    }

    // ------------------------------------------------------------------------
    // 2. POST /admin-users (Provision new employee)
    // ------------------------------------------------------------------------
    if (method === 'POST') {
      const rawBody = await req.json();
      const validation = validateSchema(CreateUserSchema, rawBody);
      if (validation.error) return validation.error;

      const body = validation.data;

      const newProfile = {
        id: crypto.randomUUID(),
        email: body.email,
        full_name: body.fullName,
        role: body.role,
        branch_id: body.branchId || 'nashik-central',
        status: 'active',
        created_at: new Date().toISOString(),
      };

      const { data, error } = await client
        .from('profiles')
        .insert(newProfile)
        .select()
        .single();

      if (error) {
        return errorResponse('DATABASE_ERROR', error.message, 500);
      }

      return successResponse(data || newProfile, null, 201);
    }

    // ------------------------------------------------------------------------
    // 3. PATCH /admin-users/:id/unlock (Unlock Locked Account)
    // ------------------------------------------------------------------------
    if (method === 'PATCH' && path.includes('/unlock')) {
      const targetUserId = parts[parts.indexOf('admin-users') + 1] || lastPart;

      await unlockAccount(client, targetUserId);

      await logSecurityEvent(client, {
        event_type: 'account_unlocked',
        user_id: targetUserId,
        performed_by: user.id,
        ip_address: clientIp,
        severity: 'info',
        metadata: { unlocked_by_admin: true, admin_email: user.email },
      });

      return successResponse({
        message: 'Account unlocked successfully',
        userId: targetUserId,
      });
    }

    // ------------------------------------------------------------------------
    // 4. PATCH /admin-users/:id/revoke (Revoke Access)
    // ------------------------------------------------------------------------
    if (method === 'PATCH' && path.includes('/revoke')) {
      const targetUserId = parts[parts.indexOf('admin-users') + 1] || lastPart;

      const { data, error } = await client
        .from('profiles')
        .update({ status: 'revoked', updated_at: new Date().toISOString() })
        .eq('id', targetUserId)
        .select()
        .single();

      if (error) {
        return errorResponse('DATABASE_ERROR', error.message, 500);
      }

      return successResponse({ message: 'User access revoked', profile: data });
    }

    // ------------------------------------------------------------------------
    // 5. PATCH /admin-users/:id/unrevoke (Restore Access)
    // ------------------------------------------------------------------------
    if (method === 'PATCH' && path.includes('/unrevoke')) {
      const targetUserId = parts[parts.indexOf('admin-users') + 1] || lastPart;

      const { data, error } = await client
        .from('profiles')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', targetUserId)
        .select()
        .single();

      if (error) {
        return errorResponse('DATABASE_ERROR', error.message, 500);
      }

      return successResponse({ message: 'User access restored', profile: data });
    }

    // ------------------------------------------------------------------------
    // 6. DELETE /admin-users/:id (Delete User)
    // ------------------------------------------------------------------------
    if (method === 'DELETE' && isSingle) {
      const targetUserId = lastPart;

      await client.from('profiles').delete().eq('id', targetUserId);
      return successResponse({ message: 'User profile deleted successfully', userId: targetUserId });
    }

    return errorResponse('METHOD_NOT_ALLOWED', `Method ${method} not allowed on /admin-users`, 405);
  } catch (err: any) {
    return errorResponse('INTERNAL_ERROR', err.message || 'Internal Server Error', 500);
  }
});
