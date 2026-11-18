-- Pending bank-transfer test orders may be erased by the owner.
-- Revert the coupon usage reserved at order creation so test checkouts do not consume a coupon slot.

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
  v_coupon_usage_reversed boolean := false;
BEGIN
  IF v_actor IS NULL OR NOT private.has_admin_role(ARRAY['owner']::text[]) THEN
    RAISE EXCEPTION 'Only the active owner account can erase customer orders.';
  END IF;
  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'Select a customer order to erase.';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This order could not be found. Refresh the order list and try again.';
  END IF;
  IF v_order.payment_status IN ('paid', 'refunded') THEN
    RAISE EXCEPTION 'This order has a paid or refunded payment record. It has been kept for financial history.';
  END IF;
  IF v_order.status IN ('Completed', 'Out for delivery') THEN
    RAISE EXCEPTION 'Completed or dispatched orders cannot be erased. They have been kept for fulfilment and sales history.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.affiliate_commissions WHERE order_id = p_order_id) THEN
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
      SELECT 1 FROM public.order_items oi
      WHERE oi.order_id = p_order_id AND oi.variant_id IS NULL
    ) THEN
      RAISE EXCEPTION 'This order has reserved stock but a pack-size record is missing. The order has been kept so inventory can be checked safely.';
    END IF;
    IF v_order.status = 'Cancelled' THEN
      RAISE EXCEPTION 'This cancelled order still shows reserved stock. The order has been kept so inventory can be reconciled safely.';
    END IF;
    UPDATE public.orders
    SET status = 'Cancelled', updated_at = now()
    WHERE id = p_order_id;
    v_stock_restored := true;
  END IF;

  IF v_order.coupon_id IS NOT NULL THEN
    UPDATE public.coupons
    SET usage_count = GREATEST(usage_count - 1, 0), updated_at = now()
    WHERE id = v_order.coupon_id AND usage_count > 0;
    v_coupon_usage_reversed := FOUND;
  END IF;

  DELETE FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The order was not deleted. Refresh the order list and try again.';
  END IF;

  INSERT INTO public.admin_audit_logs (
    actor_user_id, actor_email, action, resource_type, resource_id, details
  ) VALUES (
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
      'stock_restored', v_stock_restored,
      'coupon_usage_reversed', v_coupon_usage_reversed
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'order_number', v_order.order_number,
    'stock_restored', v_stock_restored,
    'coupon_usage_reversed', v_coupon_usage_reversed
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_delete_customer_order(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_delete_customer_order(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.admin_delete_customer_order(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_customer_order(uuid) TO authenticated;
