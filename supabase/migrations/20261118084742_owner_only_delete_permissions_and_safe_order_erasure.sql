-- Restrict permanent deletion of business records and managed uploads to the active owner.
-- Orders are erased only through the guarded function below so reserved stock is restored first.

DO $owner_delete_policies$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'assistant_knowledge',
    'assistant_knowledge_documents',
    'coupons',
    'delivery_zones',
    'finance_accounts',
    'financial_transactions',
    'partner_tasks',
    'pickup_locations',
    'product_categories',
    'product_variants',
    'products',
    'promotional_banners',
    'site_settings'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = v_table
        AND policyname = 'owner_only_delete_guard'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING ((SELECT private.has_admin_role(ARRAY[''owner'']::text[])))',
        'owner_only_delete_guard',
        v_table
      );
    END IF;
  END LOOP;
END;
$owner_delete_policies$;

DO $owner_storage_delete_policy$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'owner_only_delete_managed_storage'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY owner_only_delete_managed_storage
      ON storage.objects
      AS RESTRICTIVE
      FOR DELETE
      TO authenticated
      USING (
        bucket_id NOT IN ('promotion-media', 'product-images', 'assistant-knowledge')
        OR (SELECT private.has_admin_role(ARRAY['owner']::text[]))
      )
    $policy$;
  END IF;
END;
$owner_storage_delete_policy$;

CREATE OR REPLACE FUNCTION public.admin_delete_customer_order(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_order public.orders%ROWTYPE;
  v_stock_restored boolean := false;
BEGIN
  IF v_actor IS NULL OR NOT private.has_admin_role(ARRAY['owner']::text[]) THEN
    RAISE EXCEPTION 'Only the active owner account can erase customer orders.';
  END IF;

  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'Select a customer order to erase.';
  END IF;

  SELECT *
    INTO v_order
    FROM public.orders
   WHERE id = p_order_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This order could not be found. Refresh the order list and try again.';
  END IF;

  IF v_order.payment_status NOT IN ('unpaid', 'failed') THEN
    RAISE EXCEPTION 'This order has a pending, paid or refunded payment record. Resolve the payment first; the order has been kept.';
  END IF;

  IF v_order.status IN ('Completed', 'Out for delivery') THEN
    RAISE EXCEPTION 'Completed or dispatched orders cannot be erased. They have been kept for fulfilment and sales history.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.affiliate_commissions WHERE order_id = p_order_id
  ) THEN
    RAISE EXCEPTION 'This order has an affiliate commission record and cannot be erased. The order has been kept.';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.customer_reviews r
      JOIN public.order_items oi ON oi.id = r.order_item_id
     WHERE oi.order_id = p_order_id
  ) THEN
    RAISE EXCEPTION 'This order has a customer review and cannot be erased. The review and order have been kept.';
  END IF;

  IF COALESCE(v_order.stock_committed, false) THEN
    IF EXISTS (
      SELECT 1
        FROM public.order_items oi
       WHERE oi.order_id = p_order_id
         AND oi.variant_id IS NULL
    ) THEN
      RAISE EXCEPTION 'This order has reserved stock but a pack-size record is missing. The order has been kept so inventory can be checked safely.';
    END IF;

    IF v_order.status = 'Cancelled' THEN
      RAISE EXCEPTION 'This cancelled order still shows reserved stock. The order has been kept so inventory can be reconciled safely.';
    END IF;

    UPDATE public.orders
       SET status = 'Cancelled',
           updated_at = now()
     WHERE id = p_order_id;

    v_stock_restored := true;
  END IF;

  DELETE FROM public.orders WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The order was not deleted. Refresh the order list and try again.';
  END IF;

  INSERT INTO public.admin_audit_logs (
    actor_user_id,
    actor_email,
    action,
    resource_type,
    resource_id,
    details
  )
  VALUES (
    v_actor,
    (SELECT u.email FROM auth.users u WHERE u.id = v_actor),
    'delete_customer_order',
    'order',
    p_order_id::text,
    jsonb_build_object(
      'order_number', v_order.order_number,
      'total', v_order.total,
      'status_before_deletion', v_order.status,
      'payment_status', v_order.payment_status,
      'stock_restored', v_stock_restored
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'order_number', v_order.order_number,
    'stock_restored', v_stock_restored
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_delete_customer_order(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_delete_customer_order(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.admin_delete_customer_order(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_customer_order(uuid) TO authenticated;
