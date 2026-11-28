-- Affiliate reseller sales evidence and stock-source requirements.
-- Feature-branch draft only. NOT applied to Supabase.

begin;

alter table public.affiliate_program_sales
  add column if not exists stock_received_from text;

-- Private evidence storage. Objects are stored under the authenticated affiliate's user-id folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'affiliate-sale-evidence',
  'affiliate-sale-evidence',
  false,
  10485760,
  array['image/jpeg','image/png','image/webp','application/pdf']
)
on conflict (id) do update
set public=false, file_size_limit=10485760,
    allowed_mime_types=array['image/jpeg','image/png','image/webp','application/pdf'];

drop policy if exists affiliate_sale_evidence_upload_own on storage.objects;
create policy affiliate_sale_evidence_upload_own
on storage.objects for insert to authenticated
with check (
  bucket_id='affiliate-sale-evidence'
  and (storage.foldername(name))[1]=auth.uid()::text
  and exists (
    select 1 from public.affiliate_program_members m
    where m.user_id=auth.uid() and m.status='active' and m.affiliate_model='reseller'
  )
);

drop policy if exists affiliate_sale_evidence_read_owner on storage.objects;
create policy affiliate_sale_evidence_read_owner
on storage.objects for select to authenticated
using (
  bucket_id='affiliate-sale-evidence'
  and (
    (storage.foldername(name))[1]=auth.uid()::text
    or exists (
      select 1 from public.admin_profiles a
      where a.user_id=auth.uid() and a.is_active=true and a.role='owner'
    )
  )
);

create or replace function public.affiliate_program_submit_sale(
  p_sale_date date,
  p_payment_status text,
  p_payment_reference text,
  p_payment_evidence_url text,
  p_submitted_note text,
  p_stock_received_from text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
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
  where user_id=auth.uid() and status='active' for share;
  if not found then raise exception 'An active affiliate programme account is required.'; end if;
  if v_member.affiliate_model <> 'reseller' then
    raise exception 'Commission affiliates submit customer referrals, not reseller stock sales.';
  end if;
  if p_sale_date is null or p_sale_date > current_date then raise exception 'Enter a valid sale date.'; end if;
  if p_payment_status is distinct from 'paid' then raise exception 'Only completed, paid sales can be submitted for verification.'; end if;
  if nullif(trim(p_payment_evidence_url),'') is null then raise exception 'Upload the customer payment receipt before submitting this sale.'; end if;
  if nullif(trim(p_stock_received_from),'') is null then raise exception 'Select who supplied the stock for this sale.'; end if;
  if not exists (
    select 1 from public.affiliate_program_stock_transfers t
    where t.recipient_member_id=v_member.id
      and t.transfer_status='confirmed'
      and t.payment_status in ('paid','not_required')
      and (
        (t.source_type='company' and p_stock_received_from='company')
        or (t.source_type<>'company' and p_stock_received_from=t.source_type || ':' || coalesce(t.source_name,''))
      )
  ) then raise exception 'Choose a stock source from your confirmed stock transfer history.'; end if;
  if p_items is null or jsonb_typeof(p_items) is distinct from 'array'
    or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>20 then
    raise exception 'Add between 1 and 20 sale items.';
  end if;

  insert into public.affiliate_program_sales (
    sale_number,member_id,sale_date,payment_status,status,
    payment_reference,payment_evidence_url,submitted_note,stock_received_from
  ) values (
    'ECA-' || to_char(clock_timestamp() at time zone 'UTC','YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
    v_member.id,p_sale_date,'paid','pending_verification',
    nullif(trim(p_payment_reference),''),trim(p_payment_evidence_url),
    nullif(trim(p_submitted_note),''),trim(p_stock_received_from)
  ) returning id into v_sale_id;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_variant_id := (v_item->>'variant_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;
    v_price := (v_item->>'unit_selling_price')::numeric;
    if v_quantity is null or v_quantity<1 or v_price is null or v_price<=0 then
      raise exception 'Each item needs a positive quantity and selling price.';
    end if;
    if not exists (
      select 1 from public.products p
      join public.product_variants pv on pv.product_id=p.id
      where p.id=v_product_id and pv.id=v_variant_id and p.is_active=true
    ) then raise exception 'One of the selected products or pack sizes is unavailable.'; end if;
    insert into public.affiliate_program_sale_items
      (sale_id,product_id,variant_id,quantity,unit_selling_price)
    values (v_sale_id,v_product_id,v_variant_id,v_quantity,v_price);
    v_count := v_count+1;
  end loop;

  insert into public.affiliate_program_audit_log(actor_user_id,entity_type,entity_id,action,after_data)
  values (auth.uid(),'sale',v_sale_id,'submitted',
    jsonb_build_object('member_id',v_member.id,'item_count',v_count,'stock_received_from',p_stock_received_from,'payment_status','paid'));
  return v_sale_id;
end;
$$;

revoke all on function public.affiliate_program_submit_sale(date,text,text,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.affiliate_program_submit_sale(date,text,text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.affiliate_program_submit_sale(date,text,text,text,text,text,jsonb) to authenticated;

commit;
