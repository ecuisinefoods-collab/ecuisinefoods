-- Owner-managed stock transfer recording and confirmation.
-- Feature-branch draft only. NOT applied to any database.

begin;

create or replace function public.affiliate_program_record_stock_transfer(
  p_member_id uuid,
  p_source_type text,
  p_source_name text,
  p_payment_status text,
  p_payment_reference text,
  p_notes text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_transfer_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_variant_id uuid;
  v_quantity integer;
  v_acquisition_price numeric(12,2);
  v_count integer := 0;
begin
  if auth.uid() is null or not exists (
    select 1 from public.admin_profiles a
    where a.user_id = auth.uid() and a.role = 'owner' and a.is_active = true
  ) then raise exception 'Only the active account owner can record stock transfers.'; end if;

  if not exists (select 1 from public.affiliate_program_members where id = p_member_id and status in ('active','onboarding')) then
    raise exception 'Choose an active or onboarding affiliate.';
  end if;
  if p_source_type is null or p_source_type not in ('company','stockist','affiliate') then raise exception 'Invalid stock source.'; end if;
  if p_source_type <> 'company' and nullif(trim(p_source_name),'') is null then
    raise exception 'Enter the stockist or affiliate source name.';
  end if;
  if p_payment_status is null or p_payment_status not in ('pending','paid','not_required') then raise exception 'Invalid stock payment status.'; end if;
  if p_items is null or jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'Stock items must be supplied as a list.';
  end if;
  if jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 20 then
    raise exception 'Add between 1 and 20 stock transfer items.';
  end if;

  insert into public.affiliate_program_stock_transfers (
    transfer_number,recipient_member_id,source_type,source_name,payment_status,
    payment_reference,transfer_status,recorded_by,notes
  ) values (
    'ECT-' || to_char(clock_timestamp() at time zone 'UTC','YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
    p_member_id,p_source_type,nullif(trim(p_source_name),''),p_payment_status,
    nullif(trim(p_payment_reference),''),'recorded',auth.uid(),nullif(trim(p_notes),'')
  ) returning id into v_transfer_id;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_variant_id := (v_item->>'variant_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;
    v_acquisition_price := (v_item->>'unit_acquisition_price')::numeric;
    if v_quantity is null or v_quantity < 1 or v_acquisition_price is null or v_acquisition_price < 0 then
      raise exception 'Each stock item needs a positive quantity and acquisition price.';
    end if;
    if not exists (
      select 1 from public.products p join public.product_variants pv on pv.product_id=p.id
      where p.id=v_product_id and pv.id=v_variant_id and p.is_active=true
    ) then raise exception 'One of the selected products or pack sizes is unavailable.'; end if;
    insert into public.affiliate_program_stock_transfer_items
      (transfer_id,product_id,variant_id,quantity,unit_acquisition_price)
    values (v_transfer_id,v_product_id,v_variant_id,v_quantity,v_acquisition_price);
    v_count := v_count + 1;
  end loop;

  insert into public.affiliate_program_audit_log(actor_user_id,entity_type,entity_id,action,after_data)
  values (auth.uid(),'stock_transfer',v_transfer_id,'recorded',
    jsonb_build_object('member_id',p_member_id,'source_type',p_source_type,'payment_status',p_payment_status,'item_count',v_count));
  return v_transfer_id;
end;
$$;

revoke all on function public.affiliate_program_record_stock_transfer(uuid,text,text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.affiliate_program_record_stock_transfer(uuid,text,text,text,text,text,jsonb) to authenticated;

create or replace function public.affiliate_program_confirm_stock_transfer(p_transfer_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_transfer public.affiliate_program_stock_transfers%rowtype;
begin
  if auth.uid() is null or not exists (
    select 1 from public.admin_profiles a
    where a.user_id=auth.uid() and a.role='owner' and a.is_active=true
  ) then raise exception 'Only the active account owner can confirm stock transfers.'; end if;

  select * into v_transfer from public.affiliate_program_stock_transfers
  where id=p_transfer_id for update;
  if not found or v_transfer.transfer_status <> 'recorded' then
    raise exception 'This stock transfer is not awaiting confirmation.';
  end if;
  if v_transfer.payment_status not in ('paid','not_required') then
    raise exception 'Confirm payment or mark it not required before confirming stock received.';
  end if;
  update public.affiliate_program_stock_transfers
  set transfer_status='confirmed' where id=p_transfer_id;

  insert into public.affiliate_program_audit_log(actor_user_id,entity_type,entity_id,action,before_data,after_data)
  values (auth.uid(),'stock_transfer',p_transfer_id,'confirmed',
    jsonb_build_object('transfer_status',v_transfer.transfer_status),
    jsonb_build_object('transfer_status','confirmed'));
end;
$$;

revoke all on function public.affiliate_program_confirm_stock_transfer(uuid) from public,anon,authenticated;
grant execute on function public.affiliate_program_confirm_stock_transfer(uuid) to authenticated;

commit;
