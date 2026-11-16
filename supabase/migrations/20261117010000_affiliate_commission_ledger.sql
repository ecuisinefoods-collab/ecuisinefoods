-- Affiliate commissions: 15% default, earned only for paid + completed orders.
create table if not exists public.affiliate_commission_settings (
  id boolean primary key default true check (id),
  commission_rate numeric(5,2) not null default 15.00 check (commission_rate >= 0 and commission_rate <= 100),
  commission_basis text not null default 'paid_and_completed' check (commission_basis = 'paid_and_completed'),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
insert into public.affiliate_commission_settings(id, commission_rate, commission_basis)
values (true, 15.00, 'paid_and_completed')
on conflict (id) do update set commission_rate = 15.00, commission_basis = 'paid_and_completed', updated_at = now();

create table if not exists public.affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete restrict,
  order_number bigint not null,
  partner_id uuid not null references public.partner_profiles(id) on delete restrict,
  referral_code text not null,
  eligible_sales_amount numeric(12,2) not null check (eligible_sales_amount >= 0),
  commission_rate numeric(5,2) not null check (commission_rate >= 0 and commission_rate <= 100),
  commission_amount numeric(12,2) not null check (commission_amount >= 0),
  status text not null default 'earned' check (status in ('earned','approved','paid','reversed')),
  earned_at timestamptz not null default now(),
  approved_at timestamptz,
  paid_at timestamptz,
  payout_reference text,
  reversal_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists affiliate_commissions_partner_status_idx on public.affiliate_commissions(partner_id,status,earned_at desc);
create index if not exists affiliate_commissions_status_idx on public.affiliate_commissions(status,earned_at desc);

alter table public.affiliate_commission_settings enable row level security;
alter table public.affiliate_commissions enable row level security;

drop policy if exists "Affiliate admins read commission settings" on public.affiliate_commission_settings;
create policy "Affiliate admins read commission settings" on public.affiliate_commission_settings
for select to authenticated using (private.has_admin_role(array['owner','store_manager','marketing_manager','finance_officer','analyst']::text[]));
drop policy if exists "Affiliate owners manage commission settings" on public.affiliate_commission_settings;
create policy "Affiliate owners manage commission settings" on public.affiliate_commission_settings
for all to authenticated using (private.has_admin_role(array['owner']::text[]))
with check (private.has_admin_role(array['owner']::text[]));

drop policy if exists "Affiliates read own commissions" on public.affiliate_commissions;
create policy "Affiliates read own commissions" on public.affiliate_commissions
for select to authenticated using (
  exists(select 1 from public.partner_profiles p where p.id = affiliate_commissions.partner_id and p.user_id = auth.uid())
);
drop policy if exists "Affiliate admins read commissions" on public.affiliate_commissions;
create policy "Affiliate admins read commissions" on public.affiliate_commissions
for select to authenticated using (private.has_admin_role(array['owner','store_manager','marketing_manager','finance_officer','analyst']::text[]));
drop policy if exists "Affiliate finance admins update commissions" on public.affiliate_commissions;
create policy "Affiliate finance admins update commissions" on public.affiliate_commissions
for update to authenticated using (private.has_admin_role(array['owner','finance_officer']::text[]))
with check (private.has_admin_role(array['owner','finance_officer']::text[]));

create or replace function public.sync_affiliate_order_commission()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_partner_id uuid; v_rate numeric(5,2); v_eligible numeric(12,2);
begin
  if new.partner_profile_id is null then return new; end if;
  if new.status = 'Completed' and lower(coalesce(new.payment_status,'')) = 'paid' then
    select p.id into v_partner_id from public.partner_profiles p where p.id = new.partner_profile_id;
    if v_partner_id is not null then
      select s.commission_rate into v_rate from public.affiliate_commission_settings s where s.id = true;
      v_rate := coalesce(v_rate,15.00);
      v_eligible := greatest(coalesce(new.subtotal,0) - coalesce(new.discount_amount,0),0);
      insert into public.affiliate_commissions(order_id,order_number,partner_id,referral_code,eligible_sales_amount,commission_rate,commission_amount,status)
      values(new.id,new.order_number,v_partner_id,coalesce(new.referral_code,''),v_eligible,v_rate,round(v_eligible*v_rate/100,2),'earned')
      on conflict(order_id) do nothing;
    end if;
  elsif lower(coalesce(new.status,'')) = 'cancelled' or lower(coalesce(new.payment_status,'')) in ('refunded','partially_refunded','chargeback') then
    update public.affiliate_commissions set status='reversed',
      reversal_reason=case when lower(coalesce(new.status,''))='cancelled' then 'Order cancelled' else 'Payment refunded or charged back' end,
      updated_at=now() where order_id=new.id and status in ('earned','approved');
  end if;
  return new;
end; $$;
drop trigger if exists trg_sync_affiliate_order_commission on public.orders;
create trigger trg_sync_affiliate_order_commission
after insert or update of status,payment_status,partner_profile_id,subtotal,discount_amount
on public.orders for each row execute function public.sync_affiliate_order_commission();
revoke all on function public.sync_affiliate_order_commission() from public,anon,authenticated;
grant select on public.affiliate_commission_settings to authenticated;
grant select,update on public.affiliate_commissions to authenticated;
