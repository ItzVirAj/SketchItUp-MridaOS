-- Update all user passwords to blowfish round 10 ($2a$10$)
UPDATE auth.users
SET encrypted_password = crypt('MridaOS@2026', gen_salt('bf', 10)),
    email_confirmed_at = NOW(),
    aud = 'authenticated',
    role = 'authenticated';

-- Ensure auth.identities has valid entries for all users
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
SELECT 
    id,
    id,
    jsonb_build_object('sub', id::text, 'email', LOWER(email)),
    'email',
    LOWER(email),
    NOW(),
    NOW(),
    NOW()
FROM auth.users
ON CONFLICT (provider, provider_id) DO UPDATE SET
    identity_data = jsonb_build_object('sub', EXCLUDED.user_id::text, 'email', EXCLUDED.provider_id),
    updated_at = NOW();
