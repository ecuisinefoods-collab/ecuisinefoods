REVOKE UPDATE ON TABLE public.partner_profiles FROM authenticated;
GRANT UPDATE (status, restriction_reason, restricted_at, deleted_at, updated_at)
ON TABLE public.partner_profiles TO authenticated;
