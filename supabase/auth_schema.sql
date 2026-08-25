-- ==============================================================================
-- MRIDAOS PRODUCTION SUPABASE AUTHENTICATION & PROFILES SCHEMA
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Ensure activity_logs id has a default
ALTER TABLE IF EXISTS public.activity_logs ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE IF EXISTS public.activity_logs ALTER COLUMN time SET DEFAULT to_char(NOW(), 'HH12:MI AM');

-- 0. Ensure default branch exists matching branches schema
INSERT INTO public.branches (id, name, location, type, manager, license_number)
VALUES 
    ('nashik-central', 'Nashik Central Agro-Hub', 'Nashik Dindori Road, Maharashtra', 'hybrid', 'Santosh Deshmukh', 'FCO-MH-NSK-2024-889'),
    ('pune-hub', 'Pune Regional Distribution Hub', 'Hadapsar Agro Park, Pune', 'hybrid', 'Priya Kulkarni', 'FCO-MH-PUN-2024-442')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    location = EXCLUDED.location;

-- 1. Create Profiles Table (Public Schema linked 1:1 to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'counter_staff' CHECK (
        role IN ('owner', 'counter_staff', 'inventory_manager', 'procurement_user', 'nursery_care_staff', 'accounts_user', 'admin')
    ),
    branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_sign_in_at TIMESTAMPTZ
);

-- Index for speedy lookups and role checks
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_branch ON public.profiles(branch_id);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Profiles Row-Level Security Policies
DROP POLICY IF EXISTS "Active users can view all profiles" ON public.profiles;
CREATE POLICY "Active users can view all profiles"
ON public.profiles FOR SELECT
USING (
    auth.role() = 'authenticated' 
    OR auth.role() = 'anon'
);

DROP POLICY IF EXISTS "Users can update their own profile or admins can update any" ON public.profiles;
CREATE POLICY "Users can update their own profile or admins can update any"
ON public.profiles FOR UPDATE
USING (
    auth.uid() = id
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'owner') AND status = 'active'
    )
);

-- 3. Automatic Profile Creation Trigger on auth.users INSERT
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        branch_id,
        status,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'counter_staff'),
        NEW.raw_user_meta_data->>'branch_id',
        'active',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        role = COALESCE(EXCLUDED.role, public.profiles.role),
        branch_id = COALESCE(EXCLUDED.branch_id, public.profiles.branch_id),
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to sync last_sign_in_at
CREATE OR REPLACE FUNCTION public.handle_user_sign_in()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.profiles
    SET last_sign_in_at = NEW.last_sign_in_at,
        updated_at = NOW()
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_sign_in ON auth.users;
CREATE TRIGGER on_auth_user_sign_in
    AFTER UPDATE OF last_sign_in_at ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_user_sign_in();

-- 4. Admin Management RPC Functions (Security Definer)

-- A. Create User by Admin
CREATE OR REPLACE FUNCTION public.admin_create_user(
    p_email TEXT,
    p_password TEXT,
    p_full_name TEXT,
    p_role TEXT,
    p_branch_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_new_user_id UUID;
    v_encrypted_pw TEXT;
BEGIN
    -- Validate Role
    IF p_role NOT IN ('owner', 'counter_staff', 'inventory_manager', 'procurement_user', 'nursery_care_staff', 'accounts_user', 'admin') THEN
        RAISE EXCEPTION 'Invalid role: %', p_role;
    END IF;

    -- Check if user already exists
    SELECT id INTO v_new_user_id FROM auth.users WHERE email = LOWER(p_email);
    IF v_new_user_id IS NOT NULL THEN
        -- Update password and profile
        v_encrypted_pw := crypt(p_password, gen_salt('bf'));
        UPDATE auth.users 
        SET encrypted_password = v_encrypted_pw,
            raw_user_meta_data = jsonb_build_object('full_name', p_full_name, 'role', p_role, 'branch_id', p_branch_id),
            updated_at = NOW()
        WHERE id = v_new_user_id;

        INSERT INTO public.profiles (id, email, full_name, role, branch_id, status, created_at, updated_at)
        VALUES (v_new_user_id, LOWER(p_email), p_full_name, p_role, p_branch_id, 'active', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            branch_id = EXCLUDED.branch_id,
            status = 'active',
            updated_at = NOW();

        RETURN jsonb_build_object(
            'success', true,
            'user_id', v_new_user_id,
            'email', p_email,
            'full_name', p_full_name,
            'role', p_role
        );
    END IF;

    -- Generate User ID & Password hash
    v_new_user_id := gen_random_uuid();
    v_encrypted_pw := crypt(p_password, gen_salt('bf'));

    -- Insert into auth.users directly
    INSERT INTO auth.users (
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
    )
    VALUES (
        v_new_user_id,
        'authenticated',
        'authenticated',
        LOWER(p_email),
        v_encrypted_pw,
        NOW(),
        jsonb_build_object('provider', 'email', 'providers', array['email']),
        jsonb_build_object('full_name', p_full_name, 'role', p_role, 'branch_id', p_branch_id),
        NOW(),
        NOW()
    );

    -- Insert into auth.identities
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
    )
    VALUES (
        v_new_user_id,
        v_new_user_id,
        jsonb_build_object('sub', v_new_user_id::text, 'email', LOWER(p_email)),
        'email',
        LOWER(p_email),
        NOW(),
        NOW(),
        NOW()
    );

    -- Ensure Profile exists with exact values
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        branch_id,
        status,
        created_at,
        created_by,
        updated_at
    )
    VALUES (
        v_new_user_id,
        LOWER(p_email),
        p_full_name,
        p_role,
        p_branch_id,
        'active',
        NOW(),
        auth.uid(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        branch_id = EXCLUDED.branch_id,
        status = 'active',
        updated_at = NOW();

    -- Audit log entry
    INSERT INTO public.activity_logs (
        id,
        action,
        user_name,
        time,
        details,
        tag,
        reference_id
    )
    VALUES (
        gen_random_uuid()::text,
        'New User Created',
        COALESCE((SELECT full_name FROM public.profiles WHERE id = auth.uid()), 'Admin'),
        to_char(NOW(), 'HH12:MI AM'),
        'Created user account ' || p_email || ' with role ' || p_role,
        'compliance',
        v_new_user_id::text
    );

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_new_user_id,
        'email', p_email,
        'full_name', p_full_name,
        'role', p_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- B. Update User Profile by Admin
CREATE OR REPLACE FUNCTION public.admin_update_user(
    p_user_id UUID,
    p_full_name TEXT,
    p_role TEXT,
    p_branch_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_old_role TEXT;
    v_old_name TEXT;
    v_email TEXT;
BEGIN
    SELECT role, full_name, email INTO v_old_role, v_old_name, v_email
    FROM public.profiles
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    UPDATE public.profiles
    SET 
        full_name = p_full_name,
        role = p_role,
        branch_id = p_branch_id,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Update auth.users metadata
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_build_object('full_name', p_full_name, 'role', p_role, 'branch_id', p_branch_id),
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Audit log
    INSERT INTO public.activity_logs (
        id,
        action,
        user_name,
        time,
        details,
        tag,
        reference_id
    )
    VALUES (
        gen_random_uuid()::text,
        'User Profile Updated',
        COALESCE((SELECT full_name FROM public.profiles WHERE id = auth.uid()), 'Admin'),
        to_char(NOW(), 'HH12:MI AM'),
        'Updated ' || v_email || ': role (' || v_old_role || ' -> ' || p_role || '), name (' || v_old_name || ' -> ' || p_full_name || ')',
        'compliance',
        p_user_id::text
    );

    RETURN jsonb_build_object('success', true, 'user_id', p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- C. Revoke User Access
CREATE OR REPLACE FUNCTION public.admin_revoke_user(
    p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_email TEXT;
BEGIN
    SELECT email INTO v_email FROM public.profiles WHERE id = p_user_id;

    -- Set status to revoked in profiles
    UPDATE public.profiles
    SET status = 'revoked',
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Ban in auth.users so Supabase Auth blocks tokens/login
    UPDATE auth.users
    SET banned_until = '2099-12-31 23:59:59+00'
    WHERE id = p_user_id;

    -- Audit log
    INSERT INTO public.activity_logs (
        id,
        action,
        user_name,
        time,
        details,
        tag,
        reference_id
    )
    VALUES (
        gen_random_uuid()::text,
        'User Access Revoked',
        COALESCE((SELECT full_name FROM public.profiles WHERE id = auth.uid()), 'Admin'),
        to_char(NOW(), 'HH12:MI AM'),
        'Revoked login access for ' || COALESCE(v_email, p_user_id::text),
        'compliance',
        p_user_id::text
    );

    RETURN jsonb_build_object('success', true, 'status', 'revoked');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- D. Restore / Unrevoke User Access
CREATE OR REPLACE FUNCTION public.admin_unrevoke_user(
    p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_email TEXT;
BEGIN
    SELECT email INTO v_email FROM public.profiles WHERE id = p_user_id;

    UPDATE public.profiles
    SET status = 'active',
        updated_at = NOW()
    WHERE id = p_user_id;

    UPDATE auth.users
    SET banned_until = NULL
    WHERE id = p_user_id;

    -- Audit log
    INSERT INTO public.activity_logs (
        id,
        action,
        user_name,
        time,
        details,
        tag,
        reference_id
    )
    VALUES (
        gen_random_uuid()::text,
        'User Access Restored',
        COALESCE((SELECT full_name FROM public.profiles WHERE id = auth.uid()), 'Admin'),
        to_char(NOW(), 'HH12:MI AM'),
        'Restored active access for ' || COALESCE(v_email, p_user_id::text),
        'compliance',
        p_user_id::text
    );

    RETURN jsonb_build_object('success', true, 'status', 'active');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- E. Hard Remove User
CREATE OR REPLACE FUNCTION public.admin_delete_user(
    p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_email TEXT;
BEGIN
    SELECT email INTO v_email FROM public.profiles WHERE id = p_user_id;

    -- Delete from profiles
    DELETE FROM public.profiles WHERE id = p_user_id;
    -- Delete from auth.identities
    DELETE FROM auth.identities WHERE user_id = p_user_id;
    -- Delete from auth.users
    DELETE FROM auth.users WHERE id = p_user_id;

    -- Audit log
    INSERT INTO public.activity_logs (
        id,
        action,
        user_name,
        time,
        details,
        tag,
        reference_id
    )
    VALUES (
        gen_random_uuid()::text,
        'User Account Deleted',
        COALESCE((SELECT full_name FROM public.profiles WHERE id = auth.uid()), 'Admin'),
        to_char(NOW(), 'HH12:MI AM'),
        'Permanently deleted user account ' || COALESCE(v_email, p_user_id::text),
        'compliance',
        p_user_id::text
    );

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- F. Fetch All Users Directory Listing (for Admin/Owner)
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    role TEXT,
    branch_id TEXT,
    status TEXT,
    created_at TIMESTAMPTZ,
    last_sign_in_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.email,
        p.full_name,
        p.role,
        p.branch_id,
        p.status,
        p.created_at,
        p.last_sign_in_at
    FROM public.profiles p
    ORDER BY p.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Seed the 7 Default Accounts with Password "MridaOS@2026"
DO $$
DECLARE
    v_seed_pw TEXT := 'MridaOS@2026';
BEGIN
    -- 1. Owner
    PERFORM public.admin_create_user('owner@mridaos.in', v_seed_pw, 'Santosh Deshmukh', 'owner', 'nashik-central');

    -- 2. Admin
    PERFORM public.admin_create_user('admin@mridaos.in', v_seed_pw, 'Priya Kulkarni', 'admin', 'nashik-central');

    -- 3. Counter Staff
    PERFORM public.admin_create_user('counterstaff@mridaos.in', v_seed_pw, 'Suresh Patil', 'counter_staff', 'nashik-central');

    -- 4. Inventory Manager
    PERFORM public.admin_create_user('inventory@mridaos.in', v_seed_pw, 'Rahul Shinde', 'inventory_manager', 'nashik-central');

    -- 5. Procurement User
    PERFORM public.admin_create_user('procurement@mridaos.in', v_seed_pw, 'Anjali Gaikwad', 'procurement_user', 'nashik-central');

    -- 6. Nursery Care Staff
    PERFORM public.admin_create_user('nurserycare@mridaos.in', v_seed_pw, 'Vikas Jadhav', 'nursery_care_staff', 'nashik-central');

    -- 7. Accounts User
    PERFORM public.admin_create_user('accounts@mridaos.in', v_seed_pw, 'Kavita Joshi', 'accounts_user', 'nashik-central');
END $$;
