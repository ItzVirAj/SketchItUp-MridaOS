import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { errorResponse } from './response.ts';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  branchId?: string;
  status: string;
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

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await client.auth.getUser(token);

  if (error || !user) {
    return {
      user: null,
      error: errorResponse('UNAUTHORIZED', 'Invalid or expired session token', 401),
      client,
    };
  }

  // Fetch full profile from profiles table
  const { data: profile } = await client
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const userStatus = profile?.status || 'active';
  if (userStatus === 'revoked') {
    return {
      user: null,
      error: errorResponse('FORBIDDEN', 'User account is revoked. Access denied.', 403),
      client,
    };
  }

  const authenticatedUser: AuthenticatedUser = {
    id: user.id,
    email: user.email || '',
    fullName: profile?.full_name || user.user_metadata?.full_name || 'Staff User',
    role: profile?.role || user.user_metadata?.role || 'counter_staff',
    branchId: profile?.branch_id || user.user_metadata?.branch_id || 'nashik-central',
    status: userStatus,
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
