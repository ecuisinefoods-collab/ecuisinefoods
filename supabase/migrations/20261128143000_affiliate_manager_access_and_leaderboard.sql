-- eCuisinefoods Affiliate Programme: manager access, safe leaderboard and reporting.
-- Feature branch only. Apply only after isolated database validation and explicit release approval.

begin;

-- Extend the admin role vocabulary without changing existing assignments.
alter table public.admin_profiles drop constraint if exists admin_profiles_role_check;
alter table public.admin_profiles
  add constraint admin_profiles_role_check
  check (role = any (array[
    'owner','store_manager','finance_officer','marketing_manager',
    'order_officer','analyst','affiliate_manager'
  ]::text[]));

create table if not exists public.affiliate_program_manager_followups (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.affiliate_program_members(id) on delete restrict,
  manager_user_id uuid not null references auth.users(id) on delete restrict,
  contact_status text not null default 'not_contacted'
    check (contact_status in ('not_contacted','contacted','interested','onboarding','not_interested','closed')),
  followup_note text,
  contacted_at timestamptz,
  next_followup_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(member_id, manager_user_id),
  check (followup_note is null or length(followup_note) <= 4000)
);

create index if not exists affiliate_program_manager_followups_manager_idx
  on public.affiliate_program_manager_followups(manager_user_id, updated_at desc);

grant select, insert, update on public.affiliate_program_manager_followups to authenticated;
alter table public.affiliate_program_manager_followups enable row level security;

create policy affiliate_program_manager_followups_owner_all
  on public.affiliate_program_manager_followups for all to authenticated
  using (private.has_admin_role(array['owner']))
  with check (private.has_admin_role(array['owner']));

create policy affiliate_program_manager_followups_manager_read
  on public.affiliate_program_manager_followups for select to authenticated
  using (private.has_admin_role(array['affiliate_manager']) and manager_user_id = auth.uid());

create policy affiliate_program_manager_followups_manager_insert
  on public.affiliate_program_manager_followups for insert to authenticated
  with check (private.has_admin_role(array['affiliate_manager']) and manager_user_id = auth.uid());

create policy affiliate_program_manager_followups_manager_update
  on public.affiliate_program_manager_followups for update to authenticated
  using (private.has_admin_role(array['affiliate_manager']) and manager_user_id = auth.uid())
  with check (private.has_admin_role(array['affiliate_manager']) and manager_user_id = auth.uid());

-- Manager roster exposes only affiliate contact details and verified aggregate performance.
-- It does not expose bank data, customer data, payment evidence, payout data or raw sale records.
create or replace function public.get_affiliate_program_manager_roster(
  p_period_month date default date_trunc('month', current_date)::date
)
returns table (
  member_id uuid,
  affiliate_code text,
  full_name text,
  email text,
  phone text,
  location text,
  affiliate_model text,
  level text,
  member_status text,
  programme_start_date date,
  approved_sales_count bigint,
  pending_sales_count bigint,
  approved_sales_amount numeric,
  approved_units bigint,
  latest_approved_sale_date date,
  target_sales_amount numeric,
  target_units integer,
  sales_target_progress numeric,
  units_target_progress numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.has_admin_role(array['owner','affiliate_manager']) then
    raise exception 'Only the owner or assigned Affiliate Sales & Growth Manager may view the affiliate roster.';
  end if;
  if p_period_month is null or extract(day from p_period_month) <> 1 then
    raise exception 'Choose the first day of a calendar month.';
  end if;

  return query
  with sale_totals as (
    select
      s.member_id,
      count(distinct s.id) filter (where s.status = 'approved' and s.payment_status = 'paid')::bigint as approved_count,
      count(distinct s.id) filter (where s.status = 'pending_verification')::bigint as pending_count,
      coalesce(sum(i.quantity * i.unit_selling_price) filter (where s.status = 'approved' and s.payment_status = 'paid'),0)::numeric(14,2) as sales_amount,
      coalesce(sum(i.quantity) filter (where s.status = 'approved' and s.payment_status = 'paid'),0)::bigint as units,
      max(s.sale_date) filter (where s.status = 'approved' and s.payment_status = 'paid') as latest_sale
    from public.affiliate_program_sales s
    left join public.affiliate_program_sale_items i on i.sale_id = s.id
    where s.sale_date >= p_period_month
      and s.sale_date < (p_period_month + interval '1 month')::date
    group by s.member_id
  )
  select
    m.id, m.affiliate_code, coalesce(a.full_name,'Affiliate')::text,
    coalesce(u.email,a.email,'')::text, coalesce(a.phone,'')::text,
    a.location, m.affiliate_model, m.level, m.status, m.programme_start_date,
    coalesce(st.approved_count,0)::bigint, coalesce(st.pending_count,0)::bigint,
    coalesce(st.sales_amount,0)::numeric(14,2), coalesce(st.units,0)::bigint,
    st.latest_sale, t.target_sales_amount, t.target_units,
    case when t.target_sales_amount > 0
      then round(coalesce(st.sales_amount,0) / t.target_sales_amount * 100,1)
      else null end::numeric,
    case when t.target_units > 0
      then round(coalesce(st.units,0)::numeric / t.target_units * 100,1)
      else null end::numeric
  from public.affiliate_program_members m
  left join public.affiliate_program_applications a on a.id = m.application_id
  left join auth.users u on u.id = m.user_id
  left join sale_totals st on st.member_id = m.id
  left join public.affiliate_program_monthly_targets t
    on t.member_id = m.id and t.period_month = p_period_month
  order by coalesce(st.sales_amount,0) desc, m.affiliate_code;
end;
$$;

revoke all on function public.get_affiliate_program_manager_roster(date) from public, anon;
grant execute on function public.get_affiliate_program_manager_roster(date) to authenticated;

-- Leaderboard is available only to active programme members and contains no private contact or financial details.
create or replace function public.get_affiliate_program_leaderboard(
  p_period_month date default date_trunc('month', current_date)::date
)
returns table (
  rank_position bigint,
  affiliate_code text,
  display_name text,
  level text,
  approved_sales_amount numeric,
  approved_units bigint,
  target_assigned boolean,
  target_achieved boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.affiliate_program_members m
    where m.user_id = auth.uid() and m.status = 'active'
  ) then
    raise exception 'An active affiliate account is required to view the leaderboard.';
  end if;
  if p_period_month is null or extract(day from p_period_month) <> 1 then
    raise exception 'Choose the first day of a calendar month.';
  end if;

  return query
  with totals as (
    select s.member_id,
      coalesce(sum(i.quantity * i.unit_selling_price) filter (where s.status='approved' and s.payment_status='paid'),0)::numeric(14,2) as sales_amount,
      coalesce(sum(i.quantity) filter (where s.status='approved' and s.payment_status='paid'),0)::bigint as units
    from public.affiliate_program_sales s
    left join public.affiliate_program_sale_items i on i.sale_id=s.id
    where s.sale_date >= p_period_month
      and s.sale_date < (p_period_month + interval '1 month')::date
    group by s.member_id
  ), ranked as (
    select m.id, m.affiliate_code, coalesce(a.full_name,'Affiliate')::text as display_name,
      m.level, coalesce(totals.sales_amount,0)::numeric(14,2) as sales_amount,
      coalesce(totals.units,0)::bigint as units,
      (target.id is not null) as target_assigned,
      case when target.id is null then false
        else (target.target_sales_amount is null or target.target_sales_amount = 0 or coalesce(totals.sales_amount,0) >= target.target_sales_amount)
         and (target.target_units is null or target.target_units = 0 or coalesce(totals.units,0) >= target.target_units)
      end as target_achieved
    from public.affiliate_program_members m
    left join public.affiliate_program_applications a on a.id=m.application_id
    left join totals on totals.member_id=m.id
    left join public.affiliate_program_monthly_targets target
      on target.member_id=m.id and target.period_month=p_period_month
    where m.status='active'
  )
  select row_number() over(order by r.sales_amount desc, r.units desc, r.affiliate_code),
    r.affiliate_code, r.display_name, r.level, r.sales_amount, r.units, r.target_assigned, r.target_achieved
  from ranked r
  order by r.sales_amount desc, r.units desc, r.affiliate_code
  limit 20;
end;
$$;

revoke all on function public.get_affiliate_program_leaderboard(date) from public, anon;
grant execute on function public.get_affiliate_program_leaderboard(date) to authenticated;

-- Manager scorecard: sales and target metrics are calculated from verified records.
-- Only operational counts and narrative are entered by the manager; owner retains reward approval.
create or replace function public.affiliate_program_save_manager_scorecard(
  p_period_month date,
  p_inactive_affiliates_contacted integer,
  p_reactivated_affiliates integer,
  p_new_recruits integer,
  p_recruits_reaching_first_target integer,
  p_manager_notes text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_sales numeric(14,2);
  v_active_count integer;
  v_target_achievers integer;
begin
  if auth.uid() is null or not private.has_admin_role(array['owner','affiliate_manager']) then
    raise exception 'Only the owner or assigned Affiliate Sales & Growth Manager may submit a scorecard.';
  end if;
  if p_period_month is null or extract(day from p_period_month) <> 1 then
    raise exception 'Choose the first day of a calendar month.';
  end if;
  if least(coalesce(p_inactive_affiliates_contacted,0),coalesce(p_reactivated_affiliates,0),coalesce(p_new_recruits,0),coalesce(p_recruits_reaching_first_target,0)) < 0 then
    raise exception 'Scorecard counts cannot be negative.';
  end if;
  if p_manager_notes is not null and length(p_manager_notes)>4000 then
    raise exception 'Manager notes must be 4,000 characters or fewer.';
  end if;

  select coalesce(sum(i.quantity*i.unit_selling_price),0)::numeric(14,2)
  into v_sales
  from public.affiliate_program_sales s
  join public.affiliate_program_sale_items i on i.sale_id=s.id
  where s.sale_date>=p_period_month and s.sale_date<(p_period_month+interval '1 month')::date
    and s.status='approved' and s.payment_status='paid';

  select count(distinct s.member_id)::integer into v_active_count
  from public.affiliate_program_sales s
  where s.sale_date>=p_period_month and s.sale_date<(p_period_month+interval '1 month')::date
    and s.status='approved' and s.payment_status='paid';

  select count(*)::integer into v_target_achievers
  from public.affiliate_program_monthly_targets t
  where t.period_month=p_period_month
    and (t.target_sales_amount is not null or t.target_units is not null)
    and exists (
      select 1 from public.affiliate_program_members m
      where m.id=t.member_id and (
        (t.target_sales_amount is null or t.target_sales_amount=0 or (
          select coalesce(sum(i.quantity*i.unit_selling_price),0)
          from public.affiliate_program_sales s join public.affiliate_program_sale_items i on i.sale_id=s.id
          where s.member_id=m.id and s.sale_date>=p_period_month and s.sale_date<(p_period_month+interval '1 month')::date
            and s.status='approved' and s.payment_status='paid'
        ) >= t.target_sales_amount)
        and (t.target_units is null or t.target_units=0 or (
          select coalesce(sum(i.quantity),0)
          from public.affiliate_program_sales s join public.affiliate_program_sale_items i on i.sale_id=s.id
          where s.member_id=m.id and s.sale_date>=p_period_month and s.sale_date<(p_period_month+interval '1 month')::date
            and s.status='approved' and s.payment_status='paid'
        ) >= t.target_units)
      )
    );

  insert into public.affiliate_program_manager_scorecards (
    manager_user_id,period_month,verified_group_sales_amount,affiliates_with_verified_sales,target_achievers,
    inactive_affiliates_contacted,reactivated_affiliates,new_recruits,recruits_reaching_first_target,manager_notes
  ) values (
    auth.uid(),p_period_month,v_sales,v_active_count,v_target_achievers,
    coalesce(p_inactive_affiliates_contacted,0),coalesce(p_reactivated_affiliates,0),
    coalesce(p_new_recruits,0),coalesce(p_recruits_reaching_first_target,0),nullif(trim(p_manager_notes),'')
  )
  on conflict(manager_user_id,period_month) do update set
    verified_group_sales_amount=excluded.verified_group_sales_amount,
    affiliates_with_verified_sales=excluded.affiliates_with_verified_sales,
    target_achievers=excluded.target_achievers,
    inactive_affiliates_contacted=excluded.inactive_affiliates_contacted,
    reactivated_affiliates=excluded.reactivated_affiliates,
    new_recruits=excluded.new_recruits,
    recruits_reaching_first_target=excluded.recruits_reaching_first_target,
    manager_notes=excluded.manager_notes
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.affiliate_program_save_manager_scorecard(date,integer,integer,integer,integer,text) from public, anon;
grant execute on function public.affiliate_program_save_manager_scorecard(date,integer,integer,integer,integer,text) to authenticated;

create or replace function public.get_affiliate_program_manager_scorecards()
returns table (
  id uuid, period_month date, verified_group_sales_amount numeric,
  affiliates_with_verified_sales integer, target_achievers integer,
  inactive_affiliates_contacted integer, reactivated_affiliates integer,
  new_recruits integer, recruits_reaching_first_target integer,
  manager_notes text, created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.has_admin_role(array['owner','affiliate_manager']) then
    raise exception 'Only the owner or assigned Affiliate Sales & Growth Manager may view manager scorecards.';
  end if;
  return query
  select s.id,s.period_month,s.verified_group_sales_amount,s.affiliates_with_verified_sales,
    s.target_achievers,s.inactive_affiliates_contacted,s.reactivated_affiliates,s.new_recruits,
    s.recruits_reaching_first_target,s.manager_notes,s.created_at
  from public.affiliate_program_manager_scorecards s
  where private.has_admin_role(array['owner']) or s.manager_user_id=auth.uid()
  order by s.period_month desc limit 24;
end;
$$;

revoke all on function public.get_affiliate_program_manager_scorecards() from public, anon;
grant execute on function public.get_affiliate_program_manager_scorecards() to authenticated;

-- Owner-controlled level progression. No automatic thresholds are invented.
create or replace function public.affiliate_program_set_member_level(
  p_member_id uuid, p_new_level text, p_effective_from date, p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous text;
begin
  if auth.uid() is null or not private.has_admin_role(array['owner']) then
    raise exception 'Only the active account owner can change affiliate levels.';
  end if;
  if p_new_level not in ('beginner','intermediate','advanced') or p_effective_from is null
    or p_effective_from > current_date or nullif(trim(p_reason),'') is null then
    raise exception 'Provide a valid level, effective date and reason.';
  end if;
  select level into v_previous from public.affiliate_program_members where id=p_member_id for update;
  if not found then raise exception 'Affiliate membership not found.'; end if;
  if v_previous=p_new_level then raise exception 'The affiliate is already on that level.'; end if;
  update public.affiliate_program_members set level=p_new_level,updated_at=now() where id=p_member_id;
  insert into public.affiliate_program_level_history(member_id,previous_level,new_level,effective_from,reason,changed_by)
  values(p_member_id,v_previous,p_new_level,p_effective_from,trim(p_reason),auth.uid());
  insert into public.affiliate_program_audit_log(actor_user_id,entity_type,entity_id,action,reason,before_data,after_data)
  values(auth.uid(),'affiliate_member',p_member_id,'level_changed',trim(p_reason),
    jsonb_build_object('level',v_previous),jsonb_build_object('level',p_new_level,'effective_from',p_effective_from));
end;
$$;

revoke all on function public.affiliate_program_set_member_level(uuid,text,date,text) from public, anon, authenticated;
grant execute on function public.affiliate_program_set_member_level(uuid,text,date,text) to authenticated;


-- Affiliates may maintain their own payout details through narrowly scoped RPCs.
-- Direct table reads remain owner-only.
create or replace function public.get_affiliate_program_own_payout_details()
returns table(bank_name text, account_name text, account_number text, updated_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.affiliate_program_members m
    where m.user_id=auth.uid() and m.status in ('active','onboarding')
  ) then
    raise exception 'An approved affiliate account is required.';
  end if;
  return query
  select d.bank_name,d.account_name,d.account_number,d.updated_at
  from public.affiliate_program_payout_details d
  join public.affiliate_program_members m on m.id=d.member_id
  where m.user_id=auth.uid()
  limit 1;
end;
$$;

revoke all on function public.get_affiliate_program_own_payout_details() from public, anon;
grant execute on function public.get_affiliate_program_own_payout_details() to authenticated;

create or replace function public.affiliate_program_update_own_payout_details(
  p_bank_name text, p_account_name text, p_account_number text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in is required.'; end if;
  select m.id into v_member_id
  from public.affiliate_program_members m
  where m.user_id=auth.uid() and m.status in ('active','onboarding')
  limit 1;
  if v_member_id is null then raise exception 'An approved affiliate account is required.'; end if;
  if length(trim(coalesce(p_bank_name,''))) not between 2 and 100
    or length(trim(coalesce(p_account_name,''))) not between 2 and 160
    or trim(coalesce(p_account_number,'')) !~ '^[0-9]{10}$' then
    raise exception 'Enter a bank name, account name and valid 10-digit account number.';
  end if;
  insert into public.affiliate_program_payout_details(member_id,bank_name,account_name,account_number,updated_by,updated_at)
  values(v_member_id,trim(p_bank_name),trim(p_account_name),trim(p_account_number),auth.uid(),now())
  on conflict(member_id) do update set
    bank_name=excluded.bank_name,account_name=excluded.account_name,
    account_number=excluded.account_number,updated_by=auth.uid(),updated_at=now();
end;
$$;

revoke all on function public.affiliate_program_update_own_payout_details(text,text,text) from public, anon;
grant execute on function public.affiliate_program_update_own_payout_details(text,text,text) to authenticated;

commit;
