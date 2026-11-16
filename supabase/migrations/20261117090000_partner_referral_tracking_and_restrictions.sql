-- Partner referral attribution, click analytics, and safe account restriction states.
alter table public.partner_profiles
  drop constraint if exists partner_profiles_status_check;
alter table public.partner_profiles
  add constraint partner_profiles_status_check
  check (status in ('active','paused','suspended','banned','deleted'));
alter table public.partner_profiles
  add column if not exists restriction_reason text,
  add column if not exists restricted_at timestamptz,
  add column if not exists deleted_at timestamptz;

alter table public.orders
  add column if not exists partner_profile_id uuid references public.partner_profiles(id) on delete set null,
  add column if not exists referral_code text;
create index if not exists orders_partner_profile_id_idx on public.orders(partner_profile_id);
create index if not exists orders_referral_code_idx on public.orders(referral_code);

create table if not exists public.partner_referral_clicks (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partner_profiles(id) on delete cascade,
  referral_code text not null,
  landing_path text not null default '/shop',
  created_at timestamptz not null default now()
);
create index if not exists partner_referral_clicks_partner_created_idx
  on public.partner_referral_clicks(partner_id, created_at desc);
alter table public.partner_referral_clicks enable row level security;

drop policy if exists "Partners can read their own referral clicks" on public.partner_referral_clicks;
create policy "Partners can read their own referral clicks"
on public.partner_referral_clicks for select to authenticated
using (exists (
  select 1 from public.partner_profiles p
  where p.id = partner_referral_clicks.partner_id
    and p.user_id = (select auth.uid())
));
drop policy if exists "Admins can read referral clicks" on public.partner_referral_clicks;
create policy "Admins can read referral clicks"
on public.partner_referral_clicks for select to authenticated
using (exists (
  select 1 from public.admin_profiles a
  where a.user_id = (select auth.uid()) and a.is_active
    and a.role in ('owner','store_manager','marketing_manager','analyst')
));
revoke all on public.partner_referral_clicks from anon, authenticated;
grant select on public.partner_referral_clicks to authenticated;

create or replace function public.record_partner_referral_click(p_referral_code text, p_landing_path text default '/shop')
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_partner_id uuid;
begin
  select id into v_partner_id
  from public.partner_profiles
  where upper(partner_code) = upper(btrim(coalesce(p_referral_code,'')))
    and status = 'active';
  if v_partner_id is null then return false; end if;
  insert into public.partner_referral_clicks(partner_id, referral_code, landing_path)
  values(v_partner_id, upper(btrim(p_referral_code)),
    case when left(coalesce(p_landing_path,''),1)='/' and length(p_landing_path)<=300
      then p_landing_path else '/shop' end);
  return true;
end;
$$;
revoke all on function public.record_partner_referral_click(text,text) from public;
grant execute on function public.record_partner_referral_click(text,text) to anon, authenticated;

create or replace function public.attach_partner_referral_to_order(
  p_order_number bigint, p_tracking_code text, p_referral_code text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_partner_id uuid;
begin
  if p_order_number is null or p_tracking_code is null or length(p_tracking_code)<20 then
    return false;
  end if;
  select id into v_partner_id
  from public.partner_profiles
  where upper(partner_code)=upper(btrim(coalesce(p_referral_code,'')))
    and status='active';
  if v_partner_id is null then return false; end if;
  update public.orders
  set partner_profile_id=v_partner_id, referral_code=upper(btrim(p_referral_code))
  where order_number=p_order_number
    and tracking_token_hash=md5(p_tracking_code)
    and partner_profile_id is null;
  return found;
end;
$$;
revoke all on function public.attach_partner_referral_to_order(bigint,text,text) from public;
grant execute on function public.attach_partner_referral_to_order(bigint,text,text) to anon, authenticated;

comment on table public.partner_referral_clicks is 'Referral click events; no customer personal data is stored.';
comment on column public.orders.partner_profile_id is 'Partner credited for a valid referral code at checkout.';

-- Partner-facing metrics are returned as counts only; no order/customer rows are exposed.
create or replace function public.get_my_partner_referral_stats()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_partner_id uuid;
  v_clicks integer := 0;
  v_orders integer := 0;
begin
  if auth.uid() is null then raise exception 'Sign in to view your partner referral statistics.'; end if;
  select id into v_partner_id from public.partner_profiles
  where user_id=auth.uid() and status='active' limit 1;
  if v_partner_id is null then raise exception 'No active partner profile is linked to this account.'; end if;
  select count(*) into v_clicks from public.partner_referral_clicks where partner_id=v_partner_id;
  select count(*) into v_orders from public.orders where partner_profile_id=v_partner_id;
  return jsonb_build_object('clicks',v_clicks,'orders',v_orders);
end;
$$;
revoke all on function public.get_my_partner_referral_stats() from public, anon;
grant execute on function public.get_my_partner_referral_stats() to authenticated;
