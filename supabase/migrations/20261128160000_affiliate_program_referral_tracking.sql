-- First-party affiliate referral tracking for the rebuilt programme.
-- Feature-branch draft only. NOT applied to Supabase.

begin;

create table if not exists public.affiliate_program_referral_clicks (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.affiliate_program_members(id) on delete restrict,
  referral_code text not null,
  attribution_token text not null unique,
  landing_path text,
  clicked_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);

create index if not exists affiliate_program_referral_clicks_member_idx
  on public.affiliate_program_referral_clicks(member_id, clicked_at desc);
create index if not exists affiliate_program_referral_clicks_token_expiry_idx
  on public.affiliate_program_referral_clicks(attribution_token, expires_at desc);

create table if not exists public.affiliate_program_customer_attributions (
  id uuid primary key default gen_random_uuid(),
  customer_key text not null,
  member_id uuid not null references public.affiliate_program_members(id) on delete restrict,
  referral_click_id uuid not null references public.affiliate_program_referral_clicks(id) on delete restrict,
  referred_at timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists affiliate_program_customer_attributions_key_idx
  on public.affiliate_program_customer_attributions(customer_key, referred_at desc);

create table if not exists public.affiliate_program_order_attributions (
  id uuid primary key default gen_random_uuid(),
  order_number bigint not null unique,
  tracking_code text not null,
  customer_attribution_id uuid not null references public.affiliate_program_customer_attributions(id) on delete restrict,
  member_id uuid not null references public.affiliate_program_members(id) on delete restrict,
  attributed_at timestamptz not null default now()
);

create index if not exists affiliate_program_order_attributions_member_idx
  on public.affiliate_program_order_attributions(member_id, attributed_at desc);

alter table public.affiliate_program_referral_clicks enable row level security;
alter table public.affiliate_program_customer_attributions enable row level security;
alter table public.affiliate_program_order_attributions enable row level security;

grant select on public.affiliate_program_referral_clicks to authenticated;
grant select on public.affiliate_program_customer_attributions to authenticated;
grant select on public.affiliate_program_order_attributions to authenticated;

create policy affiliate_program_referral_clicks_owner_read
  on public.affiliate_program_referral_clicks for select to authenticated
  using (exists (select 1 from public.admin_profiles a where a.user_id=auth.uid() and a.role='owner' and a.is_active=true));
create policy affiliate_program_customer_attributions_owner_read
  on public.affiliate_program_customer_attributions for select to authenticated
  using (exists (select 1 from public.admin_profiles a where a.user_id=auth.uid() and a.role='owner' and a.is_active=true));
create policy affiliate_program_order_attributions_owner_read
  on public.affiliate_program_order_attributions for select to authenticated
  using (exists (select 1 from public.admin_profiles a where a.user_id=auth.uid() and a.role='owner' and a.is_active=true));

create or replace function public.record_affiliate_program_referral_click(
  p_referral_code text,
  p_landing_path text,
  p_attribution_token text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_member public.affiliate_program_members%rowtype;
  v_click_id uuid;
begin
  if p_referral_code is null or p_attribution_token is null
    or length(trim(p_attribution_token)) < 32 or length(trim(p_attribution_token)) > 160 then
    raise exception 'A valid affiliate referral code and attribution token are required.';
  end if;
  select * into v_member from public.affiliate_program_members
  where affiliate_code=upper(trim(p_referral_code))
    and affiliate_model='commission' and status='active';
  if not found then raise exception 'This affiliate referral code is not currently active.'; end if;

  insert into public.affiliate_program_referral_clicks
    (member_id,referral_code,attribution_token,landing_path,clicked_at,expires_at)
  values (v_member.id,v_member.affiliate_code,trim(p_attribution_token),
    left(coalesce(p_landing_path,''),500),now(),now()+interval '30 days')
  returning id into v_click_id;
  return v_click_id;
end;
$$;

revoke all on function public.record_affiliate_program_referral_click(text,text,text) from public;
grant execute on function public.record_affiliate_program_referral_click(text,text,text) to anon,authenticated;

create or replace function public.attach_affiliate_program_referral_to_order(
  p_order_number bigint,
  p_tracking_code text,
  p_referral_code text,
  p_attribution_token text,
  p_customer_phone text,
  p_customer_email text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_customer_key text;
  v_attribution public.affiliate_program_customer_attributions%rowtype;
  v_click public.affiliate_program_referral_clicks%rowtype;
begin
  if p_order_number is null or nullif(trim(p_tracking_code),'') is null then return false; end if;
  if length(regexp_replace(coalesce(p_customer_phone,''),'[^0-9]','','g')) >= 7 then
    v_customer_key := md5('phone:' || regexp_replace(p_customer_phone,'[^0-9]','','g'));
  elsif nullif(trim(p_customer_email),'') is not null then
    v_customer_key := md5('email:' || lower(trim(p_customer_email)));
  else
    return false;
  end if;

  -- Preserve the first valid referral for this customer throughout its 30-day window.
  select * into v_attribution from public.affiliate_program_customer_attributions
  where customer_key=v_customer_key and expires_at>now()
  order by referred_at asc limit 1;

  if not found then
    if nullif(trim(p_referral_code),'') is null or nullif(trim(p_attribution_token),'') is null then
      return false;
    end if;
    select * into v_click from public.affiliate_program_referral_clicks
    where referral_code=upper(trim(p_referral_code))
      and attribution_token=trim(p_attribution_token)
      and expires_at>now()
    order by clicked_at desc limit 1;
    if not found then return false; end if;

    insert into public.affiliate_program_customer_attributions
      (customer_key,member_id,referral_click_id,referred_at,expires_at)
    values (v_customer_key,v_click.member_id,v_click.id,v_click.clicked_at,v_click.clicked_at+interval '30 days')
    returning * into v_attribution;
  end if;

  insert into public.affiliate_program_order_attributions
    (order_number,tracking_code,customer_attribution_id,member_id,attributed_at)
  values (p_order_number,p_tracking_code,v_attribution.id,v_attribution.member_id,now())
  on conflict (order_number) do nothing;
  return true;
end;
$$;

revoke all on function public.attach_affiliate_program_referral_to_order(bigint,text,text,text,text,text) from public;
grant execute on function public.attach_affiliate_program_referral_to_order(bigint,text,text,text,text,text) to anon,authenticated;

create or replace function public.get_affiliate_program_own_referral_summary()
returns table(referral_clicks bigint, attributed_customers bigint, attributed_orders bigint)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_member public.affiliate_program_members%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in is required.'; end if;
  select * into v_member from public.affiliate_program_members
  where user_id=auth.uid() and affiliate_model='commission' and status='active';
  if not found then raise exception 'An active commission affiliate account is required.'; end if;
  return query
  select
    (select count(*) from public.affiliate_program_referral_clicks c where c.member_id=v_member.id),
    (select count(*) from public.affiliate_program_customer_attributions a where a.member_id=v_member.id),
    (select count(*) from public.affiliate_program_order_attributions o where o.member_id=v_member.id);
end;
$$;

revoke all on function public.get_affiliate_program_own_referral_summary() from public,anon;
grant execute on function public.get_affiliate_program_own_referral_summary() to authenticated;

commit;
