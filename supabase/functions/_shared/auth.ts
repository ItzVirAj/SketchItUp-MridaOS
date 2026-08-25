import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { errorResponse } from './response.ts';
import { verifyJwt } from './jwt.ts';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  branchId?: string;
  status: string;
  sessionId?: string;
}

export const getSupabaseClient = (req: Request): SupabaseClient => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const authHeader = req.headers.get('Authorization');

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

export const getServiceRoleClient = (): SupabaseClient => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

export const authenticateUser = async (
  req: Request
): Promise<{ user: AuthenticatedUser | null; error: Response | null; client: SupabaseClient }> => {
  const client = getSupabaseClient(req);
  const authHeader = req.headers.get('Authorization');

  if (!authHeader) {
    return {
      user: null,
      error: errorResponse('UNAUTHORIZED', 'Missing Authorization header', 401),
      client,
    };
  }

  const token = authHeader.replace('Bearer ', '').trim();

  // 1. Try Custom 15-Minute JWT Verification first (Fast, cryptographic HMAC-SHA256)
  const jwtResult = await verifyJwt(token);
  if (jwtResult.isValid && jwtResult.payload) {
    const payload = jwtResult.payload;
    const authenticatedUser: AuthenticatedUser = {
      id: payload.sub,
      email: payload.email,
      fullName: payload.fullName,
      role: payload.role,
      branchId: payload.branchId || 'nashik-central',
      status: 'active',
      sessionId: payload.sessionId,
    };

    return {
      user: authenticatedUser,
      error: null,
      client,
    };
  }

  // 2. Fallback: Supabase GoTrue Auth verification
  const { data: { user }, error } = await client.auth.getUser(token);

  if (error || !user) {
    return {
      user: null,
      error: errorResponse('UNAUTHORIZED', jwtResult.error || 'Invalid or expired 15-minute session token', 401),
      client,
    };
  }

  const authenticatedUser: AuthenticatedUser = {
    id: user.id,
    email: user.email || '',
    fullName: user.user_metadata?.full_name || 'Staff User',
    role: user.user_metadata?.role || 'counter_staff',
    branchId: user.user_metadata?.branch_id || 'nashik-central',
    status: 'active',
  };

  return {
    user: authenticatedUser,
    error: null,
    client,
  };
};

export const requireRoles = (
  user: AuthenticatedUser,
  allowedRoles: string[]
): Response | null => {
  if (!allowedRoles.includes(user.role)) {
    return errorResponse(
      'FORBIDDEN',
      `Insufficient permissions. Required one of: ${allowedRoles.join(', ')}`,
      403
    );
  }
  return null;
};
