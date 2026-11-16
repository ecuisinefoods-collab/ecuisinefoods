create table public.partner_profiles (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.affiliate_applications(id) on delete cascade,
  user_id uuid unique references auth.users(id) on delete set null,
  partner_code text not null unique,
  status text not null default 'active' check (status in ('active','paused','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.partner_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 3 and 160),
  description text not null check (char_length(btrim(description)) between 10 and 3000),
  task_type text not null check (task_type in ('product_promotion','social_engagement','content_creation','community_support','campaign','other')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status text not null default 'assigned' check (status in ('assigned','in_progress','submitted','approved','needs_revision','cancelled')),
  assigned_partner_id uuid not null references public.partner_profiles(id) on delete cascade,
  due_at timestamptz,
  product_id uuid references public.products(id) on delete set null,
  reference_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.partner_task_submissions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.partner_tasks(id) on delete cascade,
  partner_id uuid not null references public.partner_profiles(id) on delete cascade,
  submission_text text not null check (char_length(btrim(submission_text)) between 5 and 3000),
  proof_url text,
  status text not null default 'pending' check (status in ('pending','approved','needs_revision')),
  reviewer_note text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);
create index partner_tasks_assigned_due_idx on public.partner_tasks(assigned_partner_id, due_at);
create index partner_task_submissions_partner_idx on public.partner_task_submissions(partner_id, submitted_at desc);
create or replace function private.create_partner_profile_for_approved_application()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'approved' and (tg_op = 'INSERT' or old.status is distinct from 'approved') then
    insert into public.partner_profiles(application_id, partner_code)
    values (new.id, 'EC' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)))
    on conflict (application_id) do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists affiliate_application_create_partner on public.affiliate_applications;
create trigger affiliate_application_create_partner after insert or update of status on public.affiliate_applications
for each row execute function private.create_partner_profile_for_approved_application();
create or replace function private.claim_ecuisine_partner_account()
returns uuid language plpgsql security definer set search_path = '' as $$
declare current_email text; claimed_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in before claiming your partner account.'; end if;
  select lower(email) into current_email from auth.users where id = auth.uid();
  if current_email is null then raise exception 'Your account email could not be verified.'; end if;
  update public.partner_profiles p set user_id = auth.uid(), updated_at = now()
  from public.affiliate_applications a
  where p.application_id = a.id and p.user_id is null and p.status = 'active'
    and a.status = 'approved' and lower(a.email) = current_email
  returning p.id into claimed_id;
  if claimed_id is null then select id into claimed_id from public.partner_profiles where user_id = auth.uid() and status = 'active'; end if;
  if claimed_id is null then raise exception 'No approved eCuisine partner application matches this email.'; end if;
  return claimed_id;
end;
$$;
create or replace function public.claim_ecuisine_partner_account()
returns uuid language sql security invoker set search_path = '' as $$ select private.claim_ecuisine_partner_account(); $$;
revoke all on function private.claim_ecuisine_partner_account() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.claim_ecuisine_partner_account() to authenticated;
revoke all on function public.claim_ecuisine_partner_account() from public, anon;
grant execute on function public.claim_ecuisine_partner_account() to authenticated;
alter table public.partner_profiles enable row level security;
alter table public.partner_tasks enable row level security;
alter table public.partner_task_submissions enable row level security;
revoke all on public.partner_profiles, public.partner_tasks, public.partner_task_submissions from public, anon, authenticated;
grant select on public.partner_profiles to authenticated;
grant update (status, updated_at) on public.partner_profiles to authenticated;
grant select, insert, update, delete on public.partner_tasks to authenticated;
grant select, insert, update on public.partner_task_submissions to authenticated;
create policy "Partners can read their own profile" on public.partner_profiles for select to authenticated
using (user_id = (select auth.uid()) or (select private.has_admin_role(array['owner','store_manager','marketing_manager'])));
create policy "Partner admins can manage partner profiles" on public.partner_profiles for update to authenticated
using ((select private.has_admin_role(array['owner','store_manager','marketing_manager'])))
with check ((select private.has_admin_role(array['owner','store_manager','marketing_manager'])));
create policy "Partners and admins can read assigned tasks" on public.partner_tasks for select to authenticated
using (assigned_partner_id in (select id from public.partner_profiles where user_id = (select auth.uid())) or (select private.has_admin_role(array['owner','store_manager','marketing_manager'])));
create policy "Partner admins can create tasks" on public.partner_tasks for insert to authenticated
with check ((select private.has_admin_role(array['owner','store_manager','marketing_manager'])));
create policy "Partner admins can update tasks" on public.partner_tasks for update to authenticated
using ((select private.has_admin_role(array['owner','store_manager','marketing_manager'])))
with check ((select private.has_admin_role(array['owner','store_manager','marketing_manager'])));
create policy "Partner admins can delete tasks" on public.partner_tasks for delete to authenticated
using ((select private.has_admin_role(array['owner','store_manager','marketing_manager'])));
create policy "Partners and admins can read task submissions" on public.partner_task_submissions for select to authenticated
using (partner_id in (select id from public.partner_profiles where user_id = (select auth.uid())) or (select private.has_admin_role(array['owner','store_manager','marketing_manager'])));
create policy "Partners can submit their own assigned work" on public.partner_task_submissions for insert to authenticated
with check (partner_id in (select id from public.partner_profiles where user_id = (select auth.uid()))
and task_id in (select id from public.partner_tasks where assigned_partner_id = partner_id and status in ('assigned','in_progress','needs_revision')));
create policy "Partner admins can review submissions" on public.partner_task_submissions for update to authenticated
using ((select private.has_admin_role(array['owner','store_manager','marketing_manager'])))
with check ((select private.has_admin_role(array['owner','store_manager','marketing_manager'])));
