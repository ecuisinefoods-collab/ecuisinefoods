-- Make affiliate self-purchases explicit in both the commission ledger and affiliate dashboard.
alter table public.affiliate_commissions
  add column if not exists is_self_referral boolean not null default false;

update public.affiliate_commissions c
set is_self_referral = (
  exists (
    select 1
    from public.orders o
    join public.partner_profiles p on p.id = c.partner_id
    left join public.affiliate_applications a on a.id = p.application_id
    where o.id = c.order_id
      and (
        (p.user_id is not null and o.customer_user_id = p.user_id)
        or (nullif(trim(o.email),'') is not null and lower(trim(o.email)) = lower(trim(a.email)))
      )
  )
);

create or replace function public.sync_affiliate_order_commission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_partner_id uuid;
  v_rate numeric(5,2);
  v_eligible numeric(12,2);
  v_is_self_referral boolean := false;
begin
  if new.partner_profile_id is null then return new; end if;

  select p.id,
         (
           (p.user_id is not null and new.customer_user_id = p.user_id)
           or (nullif(trim(new.email),'') is not null and lower(trim(new.email)) = lower(trim(a.email)))
         )
    into v_partner_id, v_is_self_referral
  from public.partner_profiles p
  left join public.affiliate_applications a on a.id = p.application_id
  where p.id = new.partner_profile_id;

  if v_partner_id is null then return new; end if;

  if new.status = 'Completed' and lower(coalesce(new.payment_status,'')) = 'paid' then
    select s.commission_rate into v_rate
    from public.affiliate_commission_settings s where s.id = true;
    v_rate := coalesce(v_rate,15.00);
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
$function$;

create or replace function public.get_my_partner_referral_orders()
returns table (
  order_number bigint,
  order_status text,
  payment_status text,
  created_at timestamptz,
  eligible_sales_amount numeric,
  referral_code text,
  is_self_referral boolean,
  commission_amount numeric,
  commission_status text
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_partner_id uuid;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Sign in to view affiliate referral orders.';
  end if;

  select p.id into v_partner_id
  from public.partner_profiles p
  where p.user_id = v_user_id and p.status = 'active'
  limit 1;

  if v_partner_id is null then
    raise exception 'No active affiliate profile is linked to this account.';
  end if;

  return query
  select
    o.order_number,
    o.status::text,
    coalesce(o.payment_status,'')::text,
    o.created_at,
    greatest(coalesce(o.subtotal,0) - coalesce(o.discount_amount,0),0)::numeric,
    coalesce(o.referral_code,'')::text,
    (
      (p.user_id is not null and o.customer_user_id = p.user_id)
      or (nullif(trim(o.email),'') is not null and lower(trim(o.email)) = lower(trim(a.email)))
    )::boolean,
    coalesce(c.commission_amount,0)::numeric,
    coalesce(c.status,'not_eligible')::text
  from public.orders o
  join public.partner_profiles p on p.id = o.partner_profile_id
  left join public.affiliate_applications a on a.id = p.application_id
  left join public.affiliate_commissions c on c.order_id = o.id
  where p.id = v_partner_id
  order by o.created_at desc
  limit 200;
end;
$function$;

revoke all on function public.get_my_partner_referral_orders() from public, anon;
grant execute on function public.get_my_partner_referral_orders() to authenticated;
