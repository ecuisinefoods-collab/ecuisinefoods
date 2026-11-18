-- Affiliate programme settings, individual commission rates and verifiable 30-day referral attribution.
alter table public.affiliate_commission_settings
  add column if not exists commission_model text not null default 'individual'
    check (commission_model in ('uniform','individual','tiered')),
  add column if not exists payout_schedule text not null default 'weekly'
    check (payout_schedule in ('weekly','monthly','threshold','manual')),
  add column if not exists approval_mode text not null default 'staff'
    check (approval_mode in ('staff','owner_only','automatic')),
  add column if not exists referral_window_days integer not null default 30
    check (referral_window_days between 1 and 90);

update public.affiliate_commission_settings
set commission_rate = 15.00,
    commission_model = 'individual',
    payout_schedule = 'weekly',
    approval_mode = 'staff',
    referral_window_days = 30,
    updated_at = now()
where id = true;

alter table public.partner_profiles
  add column if not exists commission_rate_override numeric(5,2)
    check (commission_rate_override is null or (commission_rate_override >= 0 and commission_rate_override <= 100));

comment on column public.partner_profiles.commission_rate_override is
  'Owner-managed individual affiliate commission rate. NULL uses the programme default.';

-- Only the owner may change an individual commission override, even though approved
-- affiliate managers can update other profile-management fields.
create or replace function private.guard_partner_commission_override_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.commission_rate_override is distinct from old.commission_rate_override
     and not private.has_admin_role(array['owner']::text[]) then
    raise exception 'Only the eCuisine owner may change an individual affiliate commission rate.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_partner_commission_override_owner on public.partner_profiles;
create trigger trg_guard_partner_commission_override_owner
before update of commission_rate_override on public.partner_profiles
for each row execute function private.guard_partner_commission_override_owner();

-- Record the visitor's one-use attribution token as a hash. The raw token remains
-- in the visitor's browser and is never persisted in the database.
alter table public.partner_referral_clicks
  add column if not exists attribution_token_hash text;

create index if not exists partner_referral_clicks_attribution_token_idx
  on public.partner_referral_clicks(attribution_token_hash, created_at desc)
  where attribution_token_hash is not null;

-- Prevent legacy two-argument calls from creating unverified referral attribution.
revoke all on function public.record_partner_referral_click(text,text) from public, anon, authenticated;
revoke all on function public.attach_partner_referral_to_order(bigint,text,text) from public, anon, authenticated;

create or replace function public.record_partner_referral_click(
  p_referral_code text,
  p_landing_path text default '/shop',
  p_attribution_token text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_partner_id uuid;
  v_code text := upper(btrim(coalesce(p_referral_code,'')));
  v_token text := btrim(coalesce(p_attribution_token,''));
begin
  if v_code !~ '^[A-Z0-9-]{4,40}$' or v_token !~ '^[A-Fa-f0-9-]{32,80}$' then
    return false;
  end if;

  select id into v_partner_id
  from public.partner_profiles
  where upper(partner_code) = v_code
    and status = 'active'
  limit 1;

  if v_partner_id is null then return false; end if;

  insert into public.partner_referral_clicks(
    partner_id, referral_code, landing_path, attribution_token_hash
  )
  values (
    v_partner_id,
    v_code,
    case when left(coalesce(p_landing_path,''),1)='/' and length(p_landing_path)<=300
      then p_landing_path else '/shop' end,
    md5(v_token)
  );

  return true;
end;
$$;

revoke all on function public.record_partner_referral_click(text,text,text) from public;
grant execute on function public.record_partner_referral_click(text,text,text) to anon, authenticated;

create or replace function public.attach_partner_referral_to_order(
  p_order_number bigint,
  p_tracking_code text,
  p_referral_code text,
  p_attribution_token text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_partner_id uuid;
  v_window_days integer := 30;
  v_code text := upper(btrim(coalesce(p_referral_code,'')));
  v_token text := btrim(coalesce(p_attribution_token,''));
begin
  if p_order_number is null
     or p_tracking_code is null
     or length(p_tracking_code) < 20
     or v_code !~ '^[A-Z0-9-]{4,40}$'
     or v_token !~ '^[A-Fa-f0-9-]{32,80}$' then
    return false;
  end if;

  select coalesce(referral_window_days,30)
    into v_window_days
  from public.affiliate_commission_settings
  where id = true;

  select id into v_partner_id
  from public.partner_profiles
  where upper(partner_code) = v_code
    and status = 'active'
  limit 1;

  if v_partner_id is null then return false; end if;

  update public.orders o
  set partner_profile_id = v_partner_id,
      referral_code = v_code
  where o.order_number = p_order_number
    and o.tracking_token_hash = md5(p_tracking_code)
    and o.partner_profile_id is null
    and exists (
      select 1
      from public.partner_referral_clicks c
      where c.partner_id = v_partner_id
        and upper(c.referral_code) = v_code
        and c.attribution_token_hash = md5(v_token)
        and c.created_at <= o.created_at
        and c.created_at >= o.created_at - make_interval(days => v_window_days)
    );

  return found;
end;
$$;

revoke all on function public.attach_partner_referral_to_order(bigint,text,text,text) from public;
grant execute on function public.attach_partner_referral_to_order(bigint,text,text,text) to anon, authenticated;

-- Use an affiliate's approved override when present; otherwise use the 15% programme default.
create or replace function public.sync_affiliate_order_commission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_partner_id uuid;
  v_rate numeric(5,2);
  v_partner_rate numeric(5,2);
  v_eligible numeric(12,2);
  v_is_self_referral boolean := false;
begin
  if new.partner_profile_id is null then return new; end if;

  select p.id,
         p.commission_rate_override,
         (
           (p.user_id is not null and new.customer_user_id = p.user_id)
           or (nullif(trim(new.email),'') is not null and lower(trim(new.email)) = lower(trim(a.email)))
         )
    into v_partner_id, v_partner_rate, v_is_self_referral
  from public.partner_profiles p
  left join public.affiliate_applications a on a.id = p.application_id
  where p.id = new.partner_profile_id;

  if v_partner_id is null then return new; end if;

  if new.status = 'Completed' and lower(coalesce(new.payment_status,'')) = 'paid' then
    select s.commission_rate into v_rate
    from public.affiliate_commission_settings s where s.id = true;
    v_rate := coalesce(v_partner_rate, v_rate, 15.00);
    v_eligible := greatest(coalesce(new.subtotal,0) - coalesce(new.discount_amount,0),0);

    insert into public.affiliate_commissions(
      order_id, order_number, partner_id, referral_code,
      eligible_sales_amount, commission_rate, commission_amount, status, is_self_referral
    ) values (
      new.id, new.order_number, v_partner_id, coalesce(new.referral_code,''),
      v_eligible, v_rate, round(v_eligible * v_rate / 100,2), 'earned', coalesce(v_is_self_referral,false)
    ) on conflict (order_id) do update
      set is_self_referral = excluded.is_self_referral,
          updated_at = now();
  elsif lower(coalesce(new.status,'')) = 'cancelled'
     or lower(coalesce(new.payment_status,'')) in ('refunded','partially_refunded','chargeback') then
    update public.affiliate_commissions
    set status = 'reversed',
        reversal_reason = case
          when lower(coalesce(new.status,'')) = 'cancelled' then 'Order cancelled'
          else 'Payment refunded or charged back'
        end,
        updated_at = now()
    where order_id = new.id and status in ('earned','approved');
  end if;
  return new;
end;
$$;

-- Affiliates can see their own effective rate without granting them access to
-- the private programme settings table.
create or replace function public.get_my_partner_referral_stats()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_partner_id uuid;
  v_partner_rate numeric(5,2);
  v_default_rate numeric(5,2);
  v_clicks integer := 0;
  v_orders integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Sign in to view your partner referral statistics.';
  end if;

  select id, commission_rate_override
    into v_partner_id, v_partner_rate
  from public.partner_profiles
  where user_id = auth.uid() and status = 'active'
  limit 1;

  if v_partner_id is null then
    raise exception 'No active partner profile is linked to this account.';
  end if;

  select commission_rate into v_default_rate
  from public.affiliate_commission_settings
  where id = true;

  select count(*) into v_clicks
  from public.partner_referral_clicks
  where partner_id = v_partner_id;

  select count(*) into v_orders
  from public.orders
  where partner_profile_id = v_partner_id;

  return jsonb_build_object(
    'clicks', v_clicks,
    'orders', v_orders,
    'commission_rate', coalesce(v_partner_rate, v_default_rate, 15.00)
  );
end;
$$;

revoke all on function public.get_my_partner_referral_stats() from public, anon;
grant execute on function public.get_my_partner_referral_stats() to authenticated;

notify pgrst, 'reload schema';
