-- ==============================================================================
-- MRIDAOS ADMIN MANAGEMENT RPC FUNCTIONS & RLS
-- ==============================================================================

-- Allow authenticated users to call admin RPC functions
GRANT EXECUTE ON FUNCTION public.admin_create_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unrevoke_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users TO authenticated;

-- Allow anon as well for dev/fallback if needed
GRANT EXECUTE ON FUNCTION public.admin_create_user TO anon;
GRANT EXECUTE ON FUNCTION public.admin_update_user TO anon;
GRANT EXECUTE ON FUNCTION public.admin_revoke_user TO anon;
GRANT EXECUTE ON FUNCTION public.admin_unrevoke_user TO anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_user TO anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users TO anon;

GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO anon;
