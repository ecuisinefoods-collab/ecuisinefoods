-- Affiliate role expectations and participation monitoring.
-- Feature-branch draft only. Do not apply to production until reviewed and explicitly approved.

begin;

alter table public.affiliate_program_applications
  add column if not exists responsibilities_accepted boolean not null default false,
  add column if not exists responsibilities_version text,
  add column if not exists responsibilities_accepted_at timestamptz;

alter table public.affiliate_program_applications
  drop constraint if exists affiliate_program_applications_responsibilities_ack_check;
alter table public.affiliate_program_applications
  add constraint affiliate_program_applications_responsibilities_ack_check
  check (
    (responsibilities_accepted = false and responsibilities_version is null and responsibilities_accepted_at is null)
    or
    (responsibilities_accepted = true and responsibilities_version is not null and responsibilities_accepted_at is not null)
  );

grant insert (
  full_name, email, phone, location, requested_model, experience_note,
  responsibilities_accepted, responsibilities_version, responsibilities_accepted_at
) on public.affiliate_program_applications to anon, authenticated;

create table if not exists public.affiliate_program_participation_log (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.affiliate_program_members(id) on delete restrict,
  activity_type text not null check (activity_type in (
    'social_media_engagement',
    'whatsapp_status',
    'affiliate_group_participation',
    'training',
    'campaign_participation',
    'product_knowledge',
    'customer_engagement',
    'brand_guideline_compliance',
    'sales_reporting',
    'other'
  )),
  activity_date date not null default (now() at time zone 'Africa/Lagos')::date,
  participation_status text not null default 'completed'
    check (participation_status in ('completed','missed','excused','follow_up_required')),
  manager_note text,
  evidence_reference text,
  recorded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists affiliate_program_participation_member_date_idx
  on public.affiliate_program_participation_log(member_id, activity_date desc);
create index if not exists affiliate_program_participation_type_date_idx
  on public.affiliate_program_participation_log(activity_type, activity_date desc);

grant select, insert on public.affiliate_program_participation_log to authenticated;
alter table public.affiliate_program_participation_log enable row level security;

create policy affiliate_program_participation_read_own
  on public.affiliate_program_participation_log for select to authenticated
  using (
    exists (
      select 1 from public.affiliate_program_members m
      where m.id = member_id and m.user_id = auth.uid()
    )
  );

create policy affiliate_program_participation_manager_read
  on public.affiliate_program_participation_log for select to authenticated
  using (
    exists (
      select 1 from public.admin_profiles a
      where a.user_id = auth.uid() and a.is_active = true
        and a.role in ('owner','affiliate_manager')
    )
  );

create policy affiliate_program_participation_manager_insert
  on public.affiliate_program_participation_log for insert to authenticated
  with check (
    recorded_by = auth.uid()
    and exists (
      select 1 from public.admin_profiles a
      where a.user_id = auth.uid() and a.is_active = true
        and a.role in ('owner','affiliate_manager')
    )
  );

-- The manager can record a participation event but cannot edit or delete history.
-- Owner retains the same insert capability; immutable audit-style records preserve accountability.

commit;
