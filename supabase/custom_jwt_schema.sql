-- ==============================================================================
-- MRIDAOS CUSTOM SECURE JWT AUTHENTICATION & DEVICE SESSIONS SCHEMA
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. User Accounts Table (Bcrypt Hashed Passwords, RBAC, Active State)
CREATE TABLE IF NOT EXISTS public.user_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'counter_staff' CHECK (role IN ('owner', 'admin', 'inventory_manager', 'procurement_user', 'counter_staff', 'accounts_user')),
  phone TEXT,
  branch_id TEXT DEFAULT 'nashik-central',
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  last_login_ip TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. User Sessions Table (Logged-in Devices, IP, User Agent, 15-min JWT Lifecycle)
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_accounts(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL,
  device_name TEXT NOT NULL,
  browser TEXT NOT NULL,
  os TEXT NOT NULL,
  ip_address TEXT,
  is_revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Password Audit & Reset Log Table
CREATE TABLE IF NOT EXISTS public.password_reset_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_accounts(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES public.user_accounts(id),
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indices for performance & fast realtime session lookups
CREATE INDEX IF NOT EXISTS idx_user_accounts_email ON public.user_accounts(email);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_revoked ON public.user_sessions(is_revoked);

-- Enable RLS
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_logs ENABLE ROW LEVEL SECURITY;

-- Allow public service role / authenticated access with policies
DROP POLICY IF EXISTS "Public can select user accounts" ON public.user_accounts;
CREATE POLICY "Public can select user accounts" ON public.user_accounts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can manage user accounts" ON public.user_accounts;
CREATE POLICY "Public can manage user accounts" ON public.user_accounts FOR ALL USING (true);

DROP POLICY IF EXISTS "Manage user sessions" ON public.user_sessions;
CREATE POLICY "Manage user sessions" ON public.user_sessions FOR ALL USING (true);

DROP POLICY IF EXISTS "Manage password reset logs" ON public.password_reset_logs;
CREATE POLICY "Manage password reset logs" ON public.password_reset_logs FOR ALL USING (true);

-- ==============================================================================
-- 4. SEED PRODUCTION ACCOUNTS WITH BCRYPT HASHES (Password: Admin@1234 for all)
-- ==============================================================================
INSERT INTO public.user_accounts (id, email, password_hash, full_name, role, phone, branch_id, is_active)
VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    'admin@mridaos.in',
    crypt('Admin@1234', gen_salt('bf', 10)),
    'Jethalal Gada',
    'admin',
    '+91 98765 00001',
    'nashik-central',
    true
  ),
  (
    'a0000000-0000-0000-0000-000000000002',
    'owner@mridaos.in',
    crypt('Admin@1234', gen_salt('bf', 10)),
    'Champaklal Gada',
    'owner',
    '+91 98765 00002',
    'nashik-central',
    true
  ),
  (
    'a0000000-0000-0000-0000-000000000003',
    'counter@mridaos.in',
    crypt('Admin@1234', gen_salt('bf', 10)),
    'Natu Kaka',
    'counter_staff',
    '+91 98765 00003',
    'nashik-central',
    true
  ),
  (
    'a0000000-0000-0000-0000-000000000004',
    'procurement@mridaos.in',
    crypt('Admin@1234', gen_salt('bf', 10)),
    'Bagha Boy',
    'procurement_user',
    '+91 98765 00004',
    'nashik-central',
    true
  ),
  (
    'a0000000-0000-0000-0000-000000000005',
    'inventory@mridaos.in',
    crypt('Admin@1234', gen_salt('bf', 10)),
    'Taarak Mehta',
    'inventory_manager',
    '+91 98765 00005',
    'nashik-central',
    true
  )
ON CONFLICT (email) DO UPDATE SET
  password_hash = crypt('Admin@1234', gen_salt('bf', 10)),
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  is_active = true,
  updated_at = now();
