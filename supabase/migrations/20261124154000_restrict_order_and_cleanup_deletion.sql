-- Disable permanent order deletion and closed-record cleanup through the public API.
-- Orders are managed through status, returns and refund workflows; records should not be erased.
REVOKE EXECUTE ON FUNCTION public.admin_cleanup_closed_records() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_delete_customer_order(uuid) FROM PUBLIC, anon, authenticated;
