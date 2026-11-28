-- eCuisinefoods Affiliate Programme: safe sale submission and owner verification RPCs.
-- Feature-branch draft only. NOT applied to any database.

begin;

create or replace function public.affiliate_program_submit_sale(
  p_sale_date date, p_payment_status text, p_payment_reference text,
  p_payment_evidence_url text, p_submitted_note text, p_items jsonb
)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_member public.affiliate_program_members%rowtype;
  v_sale_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_variant_id uuid;
  v_quantity integer;
  v_price numeric(12,2);
  v_count integer := 0;
begin
  if auth.uid() is null then raise exception 'Sign in is required to submit a sale.'; end if;
  select * into v_member from public.affiliate_program_members
  where user_id = auth.uid() and status = 'active' for share;
  if not found then raise exception 'An active affiliate programme account is required.'; end if;
  if p_sale_date is null or p_sale_date > current_date then raise exception 'Enter a valid sale date.'; end if;
  if p_payment_status is null or p_payment_status not in ('paid','unpaid','partial') then raise exception 'Invalid payment status.'; end if;
  if p_items is null or jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'Sale items must be supplied as a list.';
  end if;
  if jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 20 then
    raise exception 'Add between 1 and 20 sale items.';
  end if;

  insert into public.affiliate_program_sales (
    sale_number, member_id, sale_date, payment_status, status,
    payment_reference, payment_evidence_url, submitted_note
  ) values (
    'ECA-' || to_char(clock_timestamp() at time zone 'UTC','YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
    v_member.id, p_sale_date, p_payment_status, 'pending_verification',
    nullif(trim(p_payment_reference),''), nullif(trim(p_payment_evidence_url),''), nullif(trim(p_submitted_note),'')
  ) returning id into v_sale_id;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_variant_id := (v_item->>'variant_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;
    v_price := (v_item->>'unit_selling_price')::numeric;
    if v_quantity is null or v_quantity < 1 or v_price is null or v_price <= 0 then
      raise exception 'Each item needs a positive quantity and selling price.';
    end if;
    if not exists (
      select 1 from public.products p join public.product_variants pv on pv.product_id = p.id
      where p.id = v_product_id and pv.id = v_variant_id and p.is_active = true
    ) then raise exception 'One of the selected products or pack sizes is unavailable.'; end if;
    insert into public.affiliate_program_sale_items (sale_id,product_id,variant_id,quantity,unit_selling_price)
    values (v_sale_id,v_product_id,v_variant_id,v_quantity,v_price);
    v_count := v_count + 1;
  end loop;

  insert into public.affiliate_program_audit_log (actor_user_id,entity_type,entity_id,action,after_data)
  values (auth.uid(),'sale',v_sale_id,'submitted',
    jsonb_build_object('member_id',v_member.id,'item_count',v_count,'payment_status',p_payment_status));
  return v_sale_id;
end;
$$;

revoke all on function public.affiliate_program_submit_sale(date,text,text,text,text,jsonb) from public, anon;
grant execute on function public.affiliate_program_submit_sale(date,text,text,text,text,jsonb) to authenticated;

create or replace function public.affiliate_program_review_sale(p_sale_id uuid,p_decision text,p_review_note text)
returns void language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_sale public.affiliate_program_sales%rowtype;
  v_member public.affiliate_program_members%rowtype;
  v_item record;
  v_available integer;
begin
  if auth.uid() is null or not exists (
    select 1 from public.admin_profiles a
    where a.user_id = auth.uid() and a.role = 'owner' and a.is_active = true
  ) then raise exception 'Only the active account owner can verify affiliate sales.'; end if;
  if p_decision is null or p_decision not in ('approved','rejected') then raise exception 'Choose approved or rejected.'; end if;
  if p_decision = 'rejected' and nullif(trim(p_review_note),'') is null then
    raise exception 'A reason is required when rejecting a sale.';
  end if;

  select * into v_sale from public.affiliate_program_sales where id = p_sale_id for update;
  if not found or v_sale.status <> 'pending_verification' then
    raise exception 'This sale is no longer awaiting verification.';
  end if;
  select * into v_member from public.affiliate_program_members where id = v_sale.member_id for update;

  if p_decision = 'approved' then
    if v_member.affiliate_model = 'commission' then
      raise exception 'Commission settlement rules are not yet configured. Management must confirm the remittance process before approving commission sales.';
    end if;
    if v_sale.payment_status <> 'paid' then raise exception 'Only fully paid sales can be approved.'; end if;
    if v_member.affiliate_model = 'reseller' then
      for v_item in
        select variant_id, sum(quantity)::integer as quantity
        from public.affiliate_program_sale_items where sale_id = p_sale_id group by variant_id
      loop
        select
          coalesce((select sum(i.quantity) from public.affiliate_program_stock_transfer_items i
            join public.affiliate_program_stock_transfers t on t.id = i.transfer_id
            where t.recipient_member_id = v_member.id and t.transfer_status = 'confirmed'
              and t.payment_status in ('paid','not_required') and i.variant_id = v_item.variant_id),0)
          -
          coalesce((select sum(i.quantity) from public.affiliate_program_sale_items i
            join public.affiliate_program_sales s on s.id = i.sale_id
            where s.member_id = v_member.id and s.status = 'approved' and i.variant_id = v_item.variant_id),0)
        into v_available;
        if v_available < v_item.quantity then
          raise exception 'Insufficient confirmed stock for one or more reseller sale items.';
        end if;
      end loop;
    end if;
  end if;

  update public.affiliate_program_sales
  set status=p_decision, reviewed_by=auth.uid(), reviewed_at=now(),
      review_note=nullif(trim(p_review_note),''), updated_at=now()
  where id=p_sale_id;

  insert into public.affiliate_program_audit_log
    (actor_user_id,entity_type,entity_id,action,reason,before_data,after_data)
  values (auth.uid(),'sale',p_sale_id,'reviewed',nullif(trim(p_review_note),''),
    jsonb_build_object('status',v_sale.status,'payment_status',v_sale.payment_status),
    jsonb_build_object('status',p_decision,'reviewed_at',now()));
end;
$$;

revoke all on function public.affiliate_program_review_sale(uuid,text,text) from public, anon, authenticated;
grant execute on function public.affiliate_program_review_sale(uuid,text,text) to authenticated;

commit;
