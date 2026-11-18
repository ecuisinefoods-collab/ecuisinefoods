-- Give the dedicated affiliate_manager role a read-only, aggregate performance view.
-- The function intentionally returns no customer order or payout bank details.
create or replace function public.get_admin_affiliate_performance()
returns table (
  partner_id uuid,
  partner_code text,
  affiliate_name text,
  affiliate_email text,
  profile_status text,
  created_at timestamptz,
  commission_rate_override numeric(5,2),
  effective_commission_rate numeric(5,2),
  programme_default_rate numeric(5,2),
  referral_visits bigint,
  attributed_orders bigint,
  attributed_sales numeric(12,2),
  commission_earned numeric(12,2),
  commission_approved numeric(12,2),
  commission_paid numeric(12,2),
  commission_reversed numeric(12,2),
  conversion_rate numeric(7,2)
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in to view affiliate performance.';
  end if;

  if not private.has_admin_role(array['owner'::text,'affiliate_manager'::text]) then
    raise exception 'Only the owner and assigned affiliate manager may view affiliate performance.';
  end if;

  return query
  with click_totals as (
    select c.partner_id, count(*)::bigint as referral_visits
    from public.partner_referral_clicks c
    group by c.partner_id
  ),
  order_totals as (
    select
      o.partner_profile_id as partner_id,
      count(*)::bigint as attributed_orders,
      coalesce(sum(greatest(coalesce(o.subtotal,0) - coalesce(o.discount_amount,0),0)),0)::numeric(12,2) as attributed_sales
    from public.orders o
    where o.partner_profile_id is not null
      and lower(coalesce(o.status,'')) <> 'cancelled'
    group by o.partner_profile_id
  ),
  commission_totals as (
    select
      c.partner_id,
      coalesce(sum(c.commission_amount) filter (where c.status='earned'),0)::numeric(12,2) as commission_earned,
      coalesce(sum(c.commission_amount) filter (where c.status='approved'),0)::numeric(12,2) as commission_approved,
      coalesce(sum(c.commission_amount) filter (where c.status='paid'),0)::numeric(12,2) as commission_paid,
      coalesce(sum(c.commission_amount) filter (where c.status='reversed'),0)::numeric(12,2) as commission_reversed
    from public.affiliate_commissions c
    group by c.partner_id
  ),
  programme as (
    select coalesce(s.commission_rate,15.00)::numeric(5,2) as default_rate
    from public.affiliate_commission_settings s
    where s.id = true
    limit 1
  )
  select
    p.id,
    p.partner_code,
    coalesce(a.full_name,'Affiliate')::text,
    coalesce(a.email,'')::text,
    p.status::text,
    p.created_at,
    p.commission_rate_override,
    coalesce(p.commission_rate_override, (select default_rate from programme), 15.00)::numeric(5,2),
    coalesce((select default_rate from programme),15.00)::numeric(5,2),
    coalesce(ct.referral_visits,0)::bigint,
    coalesce(ot.attributed_orders,0)::bigint,
    coalesce(ot.attributed_sales,0)::numeric(12,2),
    coalesce(mt.commission_earned,0)::numeric(12,2),
    coalesce(mt.commission_approved,0)::numeric(12,2),
    coalesce(mt.commission_paid,0)::numeric(12,2),
    coalesce(mt.commission_reversed,0)::numeric(12,2),
    case when coalesce(ct.referral_visits,0) > 0
      then round(coalesce(ot.attributed_orders,0)::numeric / ct.referral_visits * 100,2)
      else 0::numeric end::numeric(7,2)
  from public.partner_profiles p
  left join public.affiliate_applications a on a.id = p.application_id
  left join click_totals ct on ct.partner_id = p.id
  left join order_totals ot on ot.partner_id = p.id
  left join commission_totals mt on mt.partner_id = p.id
  order by p.created_at desc;
end;
$$;

revoke all on function public.get_admin_affiliate_performance() from public, anon;
grant execute on function public.get_admin_affiliate_performance() to authenticated;

comment on function public.get_admin_affiliate_performance() is
  'Returns affiliate-level aggregate performance only to active owners and assigned affiliate managers. Does not expose customer order records or payout bank details.';
