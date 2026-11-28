-- eCuisinefoods Affiliate Programme v1 performance and engagement foundation
-- Feature-branch draft only. NOT applied to any database.
-- No commission percentages, target quantities, reward amounts or payout cadence are pre-filled.

begin;

create table if not exists public.affiliate_program_level_rules (
  id uuid primary key default gen_random_uuid(),
  affiliate_model text not null check (affiliate_model in ('reseller','commission')),
  level text not null check (level in ('beginner','intermediate','advanced')),
  monthly_sales_target_amount numeric(14,2) check (monthly_sales_target_amount is null or monthly_sales_target_amount >= 0),
  monthly_units_target integer check (monthly_units_target is null or monthly_units_target >= 0),
  commission_rate_percent numeric(5,2) check (commission_rate_percent is null or commission_rate_percent between 0 and 100),
  effective_from date not null,
  effective_to date,
  is_active boolean not null default false,
  configured_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check (effective_to is null or effective_to >= effective_from),
  check (not is_active or monthly_sales_target_amount is not null or monthly_units_target is not null),
  check (not is_active or affiliate_model <> 'commission' or commission_rate_percent is not null)
);

create unique index if not exists affiliate_program_level_rules_active_unique
  on public.affiliate_program_level_rules(affiliate_model, level)
  where is_active = true;

create table if not exists public.affiliate_program_monthly_targets (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.affiliate_program_members(id) on delete restrict,
  period_month date not null check (extract(day from period_month) = 1),
  target_sales_amount numeric(14,2) check (target_sales_amount is null or target_sales_amount >= 0),
  target_units integer check (target_units is null or target_units >= 0),
  assigned_level text not null check (assigned_level in ('beginner','intermediate','advanced')),
  assigned_by uuid not null references auth.users(id),
  notes text,
  created_at timestamptz not null default now(),
  unique(member_id, period_month),
  check (target_sales_amount is not null or target_units is not null)
);

create index if not exists affiliate_program_monthly_targets_period_idx
  on public.affiliate_program_monthly_targets(period_month, member_id);

create table if not exists public.affiliate_program_level_history (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.affiliate_program_members(id) on delete restrict,
  previous_level text check (previous_level in ('beginner','intermediate','advanced')),
  new_level text not null check (new_level in ('beginner','intermediate','advanced')),
  effective_from date not null,
  reason text not null,
  changed_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists affiliate_program_level_history_member_idx
  on public.affiliate_program_level_history(member_id, effective_from desc);

create table if not exists public.affiliate_program_earnings (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.affiliate_program_members(id) on delete restrict,
  sale_id uuid not null references public.affiliate_program_sales(id) on delete restrict,
  earning_type text not null check (earning_type in ('reseller_margin','commission')),
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null default 'NGN' check (currency = 'NGN'),
  status text not null default 'pending'
    check (status in ('pending','approved','payable','paid','reversed')),
  calculation_snapshot jsonb not null,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  paid_by uuid references auth.users(id),
  paid_at timestamptz,
  payout_reference text,
  reversal_of uuid references public.affiliate_program_earnings(id),
  reversal_reason text,
  created_at timestamptz not null default now(),
  check ((status not in ('approved','payable','paid')) or (approved_by is not null and approved_at is not null)),
  check ((status <> 'paid') or (paid_by is not null and paid_at is not null))
);

create unique index if not exists affiliate_program_earnings_sale_type_unique
  on public.affiliate_program_earnings(sale_id, earning_type)
  where reversal_of is null;
create index if not exists affiliate_program_earnings_member_idx
  on public.affiliate_program_earnings(member_id, created_at desc);

create table if not exists public.affiliate_program_manager_scorecards (
  id uuid primary key default gen_random_uuid(),
  manager_user_id uuid not null references auth.users(id),
  period_month date not null check (extract(day from period_month) = 1),
  verified_group_sales_amount numeric(14,2) not null default 0 check (verified_group_sales_amount >= 0),
  affiliates_with_verified_sales integer not null default 0 check (affiliates_with_verified_sales >= 0),
  target_achievers integer not null default 0 check (target_achievers >= 0),
  inactive_affiliates_contacted integer not null default 0 check (inactive_affiliates_contacted >= 0),
  reactivated_affiliates integer not null default 0 check (reactivated_affiliates >= 0),
  new_recruits integer not null default 0 check (new_recruits >= 0),
  recruits_reaching_first_target integer not null default 0 check (recruits_reaching_first_target >= 0),
  manager_notes text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(manager_user_id, period_month)
);

create table if not exists public.affiliate_program_leader_rewards (
  id uuid primary key default gen_random_uuid(),
  scorecard_id uuid not null references public.affiliate_program_manager_scorecards(id) on delete restrict,
  reward_amount numeric(14,2) not null check (reward_amount > 0),
  currency text not null default 'NGN' check (currency = 'NGN'),
  reward_reason text not null,
  status text not null default 'pending_approval'
    check (status in ('pending_approval','approved','paid','rejected')),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  paid_by uuid references auth.users(id),
  paid_at timestamptz,
  payout_reference text,
  created_at timestamptz not null default now(),
  check ((status not in ('approved','paid')) or (approved_by is not null and approved_at is not null)),
  check ((status <> 'paid') or (paid_by is not null and paid_at is not null))
);

create table if not exists public.affiliate_program_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  audience text not null default 'all' check (audience in ('all','reseller','commission')),
  is_published boolean not null default false,
  published_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.affiliate_program_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  resource_type text not null check (resource_type in ('document','video','link','image')),
  resource_url text not null,
  audience text not null default 'all' check (audience in ('all','reseller','commission')),
  is_published boolean not null default false,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Explicit grants; RLS restricts all records to the intended member or owner.
grant select, insert, update on public.affiliate_program_level_rules to authenticated;
grant select, insert, update on public.affiliate_program_monthly_targets to authenticated;
grant select, insert, update on public.affiliate_program_level_history to authenticated;
grant select, insert, update on public.affiliate_program_earnings to authenticated;
grant select, insert, update on public.affiliate_program_manager_scorecards to authenticated;
grant select, insert, update on public.affiliate_program_leader_rewards to authenticated;
grant select, insert, update on public.affiliate_program_announcements to authenticated;
grant select, insert, update on public.affiliate_program_resources to authenticated;

alter table public.affiliate_program_level_rules enable row level security;
alter table public.affiliate_program_monthly_targets enable row level security;
alter table public.affiliate_program_level_history enable row level security;
alter table public.affiliate_program_earnings enable row level security;
alter table public.affiliate_program_manager_scorecards enable row level security;
alter table public.affiliate_program_leader_rewards enable row level security;
alter table public.affiliate_program_announcements enable row level security;
alter table public.affiliate_program_resources enable row level security;

-- Active rules and published learning/announcements are readable by approved programme members.
create policy affiliate_program_level_rules_member_read
  on public.affiliate_program_level_rules for select to authenticated
  using (is_active and exists (select 1 from public.affiliate_program_members m where m.user_id = auth.uid() and m.status = 'active'));
create policy affiliate_program_level_rules_owner_all
  on public.affiliate_program_level_rules for all to authenticated
  using (exists (select 1 from public.admin_profiles a where a.user_id = auth.uid() and a.role = 'owner' and a.is_active = true))
  with check (exists (select 1 from public.admin_profiles a where a.user_id = auth.uid() and a.role = 'owner' and a.is_active = true));

create policy affiliate_program_monthly_targets_read_own
  on public.affiliate_program_monthly_targets for select to authenticated
  using (exists (select 1 from public.affiliate_program_members m where m.id = member_id and m.user_id = auth.uid()));
create policy affiliate_program_monthly_targets_owner_all
  on public.affiliate_program_monthly_targets for all to authenticated
  using (exists (select 1 from public.admin_profiles a where a.user_id = auth.uid() and a.role = 'owner' and a.is_active = true))
  with check (exists (select 1 from public.admin_profiles a where a.user_id = auth.uid() and a.role = 'owner' and a.is_active = true));

create policy affiliate_program_level_history_read_own
  on public.affiliate_program_level_history for select to authenticated
  using (exists (select 1 from public.affiliate_program_members m where m.id = member_id and m.user_id = auth.uid()));
create policy affiliate_program_level_history_owner_all
  on public.affiliate_program_level_history for all to authenticated
  using (exists (select 1 from public.admin_profiles a where a.user_id = auth.uid() and a.role = 'owner' and a.is_active = true))
  with check (exists (select 1 from public.admin_profiles a where a.user_id = auth.uid() and a.role = 'owner' and a.is_active = true));

create policy affiliate_program_earnings_read_own
  on public.affiliate_program_earnings for select to authenticated
  using (exists (select 1 from public.affiliate_program_members m where m.id = member_id and m.user_id = auth.uid()));
create policy affiliate_program_earnings_owner_all
  on public.affiliate_program_earnings for all to authenticated
  using (exists (select 1 from public.admin_profiles a where a.user_id = auth.uid() and a.role = 'owner' and a.is_active = true))
  with check (exists (select 1 from public.admin_profiles a where a.user_id = auth.uid() and a.role = 'owner' and a.is_active = true));

-- The manager dashboard will receive safe aggregate access in a later, dedicated role/RPC migration.
create policy affiliate_program_manager_scorecards_owner_all
  on public.affiliate_program_manager_scorecards for all to authenticated
  using (exists (select 1 from public.admin_profiles a where a.user_id = auth.uid() and a.role = 'owner' and a.is_active = true))
  with check (exists (select 1 from public.admin_profiles a where a.user_id = auth.uid() and a.role = 'owner' and a.is_active = true));
create policy affiliate_program_leader_rewards_owner_all
  on public.affiliate_program_leader_rewards for all to authenticated
  using (exists (select 1 from public.admin_profiles a where a.user_id = auth.uid() and a.role = 'owner' and a.is_active = true))
  with check (exists (select 1 from public.admin_profiles a where a.user_id = auth.uid() and a.role = 'owner' and a.is_active = true));

create policy affiliate_program_announcements_member_read
  on public.affiliate_program_announcements for select to authenticated
  using (is_published and exists (select 1 from public.affiliate_program_members m where m.user_id = auth.uid() and m.status = 'active')
    and (audience = 'all' or exists (select 1 from public.affiliate_program_members m where m.user_id = auth.uid() and m.affiliate_model = audience)));
create policy affiliate_program_announcements_owner_all
  on public.affiliate_program_announcements for all to authenticated
  using (exists (select 1 from public.admin_profiles a where a.user_id = auth.uid() and a.role = 'owner' and a.is_active = true))
  with check (exists (select 1 from public.admin_profiles a where a.user_id = auth.uid() and a.role = 'owner' and a.is_active = true));

create policy affiliate_program_resources_member_read
  on public.affiliate_program_resources for select to authenticated
  using (is_published and exists (select 1 from public.affiliate_program_members m where m.user_id = auth.uid() and m.status = 'active')
    and (audience = 'all' or exists (select 1 from public.affiliate_program_members m where m.user_id = auth.uid() and m.affiliate_model = audience)));
create policy affiliate_program_resources_owner_all
  on public.affiliate_program_resources for all to authenticated
  using (exists (select 1 from public.admin_profiles a where a.user_id = auth.uid() and a.role = 'owner' and a.is_active = true))
  with check (exists (select 1 from public.admin_profiles a where a.user_id = auth.uid() and a.role = 'owner' and a.is_active = true));

commit;
