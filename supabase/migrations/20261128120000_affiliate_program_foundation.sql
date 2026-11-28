-- eCuisinefoods Affiliate Programme v1 foundation
-- Drafted on the feature branch only. NOT applied to any Supabase project.
-- Programme performance begins at the official launch date; no legacy sales are migrated.

begin;

create table if not exists public.affiliate_program_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null check (length(trim(full_name)) between 2 and 160),
  email text not null,
  phone text not null,
  location text,
  requested_model text not null check (requested_model in ('reseller','commission')),
  experience_note text,
  status text not null default 'submitted'
    check (status in ('submitted','under_review','approved','rejected','withdrawn')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists affiliate_program_applications_status_idx
  on public.affiliate_program_applications(status, created_at desc);
create index if not exists affiliate_program_applications_email_lower_idx
  on public.affiliate_program_applications(lower(email));

create table if not exists public.affiliate_program_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete restrict,
  application_id uuid unique references public.affiliate_program_applications(id) on delete set null,
  affiliate_code text not null unique,
  affiliate_model text not null check (affiliate_model in ('reseller','commission')),
  level text not null default 'beginner'
    check (level in ('beginner','intermediate','advanced')),
  status text not null default 'active'
    check (status in ('active','onboarding','inactive','suspended','exited')),
  joined_at timestamptz not null default now(),
  programme_start_date date not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists affiliate_program_members_status_idx
  on public.affiliate_program_members(status, level);
create index if not exists affiliate_program_members_model_idx
  on public.affiliate_program_members(affiliate_model);

-- Sensitive payout information is deliberately isolated from general profiles.
create table if not exists public.affiliate_program_payout_details (
  member_id uuid primary key references public.affiliate_program_members(id) on delete restrict,
  bank_name text not null,
  account_name text not null,
  account_number text not null check (account_number ~ '^[0-9]{10}$'),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.affiliate_program_stock_transfers (
  id uuid primary key default gen_random_uuid(),
  transfer_number text not null unique,
  recipient_member_id uuid not null references public.affiliate_program_members(id) on delete restrict,
  source_type text not null check (source_type in ('company','stockist','affiliate')),
  source_name text,
  payment_status text not null default 'pending'
    check (payment_status in ('pending','paid','not_required')),
  payment_reference text,
  transfer_status text not null default 'recorded'
    check (transfer_status in ('recorded','confirmed','cancelled')),
  transferred_at timestamptz not null default now(),
  recorded_by uuid not null references auth.users(id),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.affiliate_program_stock_transfer_items (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null references public.affiliate_program_stock_transfers(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  variant_id uuid references public.product_variants(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_acquisition_price numeric(12,2) check (unit_acquisition_price is null or unit_acquisition_price >= 0),
  created_at timestamptz not null default now()
);

create index if not exists affiliate_program_stock_transfers_member_idx
  on public.affiliate_program_stock_transfers(recipient_member_id, transferred_at desc);
create index if not exists affiliate_program_stock_transfer_items_transfer_idx
  on public.affiliate_program_stock_transfer_items(transfer_id);

create table if not exists public.affiliate_program_sales (
  id uuid primary key default gen_random_uuid(),
  sale_number text not null unique,
  member_id uuid not null references public.affiliate_program_members(id) on delete restrict,
  sale_date date not null,
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid','paid','partial')),
  status text not null default 'pending_verification'
    check (status in ('pending_verification','approved','rejected','cancelled')),
  payment_reference text,
  payment_evidence_url text,
  submitted_note text,
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  review_note text,
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users(id),
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.affiliate_program_sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.affiliate_program_sales(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  variant_id uuid references public.product_variants(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_selling_price numeric(12,2) not null check (unit_selling_price >= 0),
  created_at timestamptz not null default now()
);

create index if not exists affiliate_program_sales_member_date_idx
  on public.affiliate_program_sales(member_id, sale_date desc);
create index if not exists affiliate_program_sales_status_idx
  on public.affiliate_program_sales(status, payment_status, submitted_at desc);
create index if not exists affiliate_program_sale_items_sale_idx
  on public.affiliate_program_sale_items(sale_id);

create table if not exists public.affiliate_program_audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  reason text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists affiliate_program_audit_entity_idx
  on public.affiliate_program_audit_log(entity_type, entity_id, created_at desc);

-- Explicit Data API grants. Row-level policies below remain the actual access boundary.
grant select, insert, update on public.affiliate_program_applications to authenticated;
grant insert on public.affiliate_program_applications to anon;
grant select, insert, update on public.affiliate_program_members to authenticated;
grant select, insert, update on public.affiliate_program_payout_details to authenticated;
grant select, insert, update on public.affiliate_program_stock_transfers to authenticated;
grant select, insert, update on public.affiliate_program_stock_transfer_items to authenticated;
grant select, insert, update on public.affiliate_program_sales to authenticated;
grant select, insert, update on public.affiliate_program_sale_items to authenticated;
grant select on public.affiliate_program_audit_log to authenticated;
grant usage, select on sequence public.affiliate_program_audit_log_id_seq to authenticated;

alter table public.affiliate_program_applications enable row level security;
alter table public.affiliate_program_members enable row level security;
alter table public.affiliate_program_payout_details enable row level security;
alter table public.affiliate_program_stock_transfers enable row level security;
alter table public.affiliate_program_stock_transfer_items enable row level security;
alter table public.affiliate_program_sales enable row level security;
alter table public.affiliate_program_sale_items enable row level security;
alter table public.affiliate_program_audit_log enable row level security;

-- Application owners can submit and view their own applications; only owner reviews.
create policy affiliate_program_applications_submit_public
  on public.affiliate_program_applications for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());
create policy affiliate_program_applications_read_own
  on public.affiliate_program_applications for select to authenticated
  using (user_id = auth.uid());
create policy affiliate_program_applications_owner_all
  on public.affiliate_program_applications for all to authenticated
  using (exists (select 1 from public.admin_profiles a where a.user_id = auth.uid() and a.role = 'owner' and a.is_active = true))
  with check (exists (select 1 from public.admin_profiles a where a.user_id = auth.uid() and a.role = 'owner' and a.is_active = true));

-- Affiliates can read only their own membership. Owner manages membership.
create policy affiliate_program_members_read_own
  on public.affiliate_program_members for select to authenticated
  using (user_id = auth.uid());
create policy affiliate_program_members_owner_all
  on public.affiliate_program_members for all to authenticated
  using (exists (select 1 from public.admin_profiles a where a.user_id = auth.uid() and a.role = 'owner' and a.is_active = true))
  with check (exists (select 1 from public.admin_profiles a where a.user_id = auth.uid() and a.role = 'owner' and a.is_active = true));

-- Bank details are owner-only. No affiliate or team-manager policy is defined.
create policy affiliate_program_payout_owner_only
  on public.affiliate_program_payout_details for all to authenticated
  using (exists (select 1 from public.admin_profiles a where a.user_id = auth.uid() and a.role = 'owner' and a.is_active = true))
  with check (exists (select 1 from public.admin_profiles a where a.user_id = auth.uid() and a.role = 'owner' and a.is_active = true));

-- Affiliates see their own stock transfer history; only owner records and changes transfers.
create policy affiliate_program_stock_transfers_read_own
  on public.affiliate_program_stock_transfers for select to authenticated
  using (exists (select 1 from public.affiliate_program_members m where m.id = recipient_member_id and m.user_id = auth.uid()));
create policy affiliate_program_stock_transfers_owner_all
  on public.affiliate_program_stock_transfers for all to authenticated
  using (exists (select 1 from public.admin_profiles a where a.user_id = auth.uid() and a.role = 'owner' and a.is_active = true))
  with check (exists (select 1 from public.admin_profiles a where a.user_id = auth.uid() and a.role = 'owner' and a.is_active = true));
create policy affiliate_program_stock_transfer_items_read_own
  on public.affiliate_program_stock_transfer_items for select to authenticated
  using (exists (select 1 from public.affiliate_program_stock_transfers t join public.affiliate_program_members m on m.id = t.recipient_member_id where t.id = transfer_id and m.user_id = auth.uid()));
create policy affiliate_program_stock_transfer_items_owner_all
  on public.affiliate_program_stock_transfer_items for all to authenticated
  using (exists (select 1 from public.admin_profiles a where a.user_id = auth.uid() and a.role = 'owner' and a.is_active = true))
  with check (exists (select 1 from public.admin_profiles a where a.user_id = auth.uid() and a.role = 'owner' and a.is_active = true));

-- Affiliates submit their own sales and can read their own history. No affiliate UPDATE or DELETE grant/policy.
create policy affiliate_program_sales_read_own
  on public.affiliate_program_sales for select to authenticated
  using (exists (select 1 from public.affiliate_program_members m where m.id = member_id and m.user_id = auth.uid()));
create policy affiliate_program_sales_submit_own
  on public.affiliate_program_sales for insert to authenticated
  with check (
    status = 'pending_verification'
    and payment_status in ('paid','unpaid','partial')
    and reviewed_by is null and reviewed_at is null
    and exists (select 1 from public.affiliate_program_members m where m.id = member_id and m.user_id = auth.uid() and m.status = 'active')
  );
create policy affiliate_program_sales_owner_all
  on public.affiliate_program_sales for all to authenticated
  using (exists (select 1 from public.admin_profiles a where a.user_id = auth.uid() and a.role = 'owner' and a.is_active = true))
  with check (exists (select 1 from public.admin_profiles a where a.user_id = auth.uid() and a.role = 'owner' and a.is_active = true));

create policy affiliate_program_sale_items_read_own
  on public.affiliate_program_sale_items for select to authenticated
  using (exists (select 1 from public.affiliate_program_sales s join public.affiliate_program_members m on m.id = s.member_id where s.id = sale_id and m.user_id = auth.uid()));
create policy affiliate_program_sale_items_submit_own
  on public.affiliate_program_sale_items for insert to authenticated
  with check (exists (select 1 from public.affiliate_program_sales s join public.affiliate_program_members m on m.id = s.member_id where s.id = sale_id and m.user_id = auth.uid() and s.status = 'pending_verification'));
create policy affiliate_program_sale_items_owner_all
  on public.affiliate_program_sale_items for all to authenticated
  using (exists (select 1 from public.admin_profiles a where a.user_id = auth.uid() and a.role = 'owner' and a.is_active = true))
  with check (exists (select 1 from public.admin_profiles a where a.user_id = auth.uid() and a.role = 'owner' and a.is_active = true));

-- Audit records are visible only to owner; application code/RPC will write them through controlled flows.
create policy affiliate_program_audit_owner_read
  on public.affiliate_program_audit_log for select to authenticated
  using (exists (select 1 from public.admin_profiles a where a.user_id = auth.uid() and a.role = 'owner' and a.is_active = true));

commit;
