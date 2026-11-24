-- Financial record retention and safe data-management controls.
-- Posted financial records must be corrected by reversal/adjustment, never deleted.

DROP POLICY IF EXISTS financial_transactions_admin_all ON public.financial_transactions;
DROP POLICY IF EXISTS "owner can delete transactions" ON public.financial_transactions;
DROP POLICY IF EXISTS owner_only_delete_guard ON public.financial_transactions;
REVOKE DELETE ON TABLE public.financial_transactions FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_dataset(p_table text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
declare
  v_user uuid := auth.uid();
  v_deleted integer := 0;
begin
  if v_user is null or not private.has_admin_role(array['owner']::text[]) then
    raise exception 'Only the active owner account can delete business records.';
  end if;

  if p_table is null or p_table not in (
    'orders','order_items','products','product_variants','promotional_banners',
    'finance_accounts','pickup_locations','delivery_zones',
    'site_settings','coupons','inventory_movements','customer_profiles','customer_reviews',
    'partnership_inquiries','affiliate_applications','partner_profiles','partner_tasks',
    'partner_task_submissions','partner_referral_clicks','assistant_conversations',
    'assistant_messages','assistant_rate_limits','assistant_knowledge',
    'assistant_knowledge_config','assistant_knowledge_documents','site_visit_events'
  ) then
    raise exception 'This dataset is protected or is not available for deletion.';
  end if;

  if p_table = 'products' then
    delete from public.inventory_movements
    where variant_id in (select id from public.product_variants where product_id in (select id from public.products));
    delete from public.products where true;
    get diagnostics v_deleted = row_count;
  elsif p_table = 'product_variants' then
    delete from public.inventory_movements
    where variant_id in (select id from public.product_variants);
    delete from public.product_variants where true;
    get diagnostics v_deleted = row_count;
  else
    execute format('delete from public.%I where true', p_table);
    get diagnostics v_deleted = row_count;
  end if;

  insert into public.admin_audit_logs(actor_user_id, action, resource_type, details)
  values (v_user, 'delete_dataset', p_table, jsonb_build_object('deleted_rows', v_deleted));

  return jsonb_build_object('table', p_table, 'deleted_rows', v_deleted);
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_reset_store_for_launch()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
declare
  v_deleted jsonb := '{}'::jsonb;
  v_count bigint;
  v_actor uuid := auth.uid();
begin
  if v_actor is null or not private.has_admin_role(array['owner']::text[]) then
    raise exception 'Only the active owner can reset store activity';
  end if;

  delete from public.customer_reviews where true;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('customer_reviews', v_count);

  delete from public.partner_task_submissions where true;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('partner_task_submissions', v_count);

  delete from public.partner_referral_clicks where true;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('partner_referral_clicks', v_count);

  delete from public.partner_tasks where true;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('partner_tasks', v_count);

  delete from public.inventory_movements where true;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('inventory_movements', v_count);

  delete from public.orders where true;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('orders', v_count);

  delete from public.assistant_conversations where true;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('assistant_conversations', v_count);

  delete from public.assistant_rate_limits where true;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('assistant_rate_limits', v_count);

  delete from public.site_visit_events where true;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('site_visit_events', v_count);

  delete from public.customer_profiles where true;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('customer_profiles', v_count);

  delete from public.partnership_inquiries where true;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('partnership_inquiries', v_count);

  delete from public.affiliate_applications where true;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('affiliate_applications', v_count);

  delete from public.partner_profiles where true;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('partner_profiles', v_count);

  update public.coupons set usage_count = 0 where true;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('coupons_usage_count_reset', v_count);

  perform setval(pg_get_serial_sequence('public.orders', 'order_number'), 1, false);
  perform setval(pg_get_serial_sequence('public.site_visit_events', 'id'), 1, false);

  insert into public.admin_audit_logs(actor_user_id, action, resource_type, details)
  values (v_actor, 'reset_store_for_launch', 'business_activity',
          jsonb_build_object('deleted_rows_by_table', v_deleted,
            'preserved', jsonb_build_array('products','product_variants','product_variants.stock_quantity',
              'financial_transactions','finance_accounts','pickup_locations','delivery_zones',
              'site_settings','promotional_banners','coupons','admin_profiles','admin_audit_logs')));

  return jsonb_build_object('success', true, 'deleted_rows_by_table', v_deleted,
    'preserved', jsonb_build_array('products','product_variants_and_stock','financial_transactions',
      'finance_accounts','pickup_locations','delivery_zones','site_settings','promotional_banners',
      'coupons','admin_profiles','admin_audit_logs'));
end;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_delete_dataset(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_reset_store_for_launch() FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.financial_transactions IS
  'Financial records are retained. Correct errors using reversal or adjustment entries; do not delete posted transactions.';
