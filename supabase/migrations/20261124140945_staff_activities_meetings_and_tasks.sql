alter table public.admin_profiles
  add column if not exists department text,
  add column if not exists job_title text,
  add column if not exists phone text;

create table if not exists public.staff_meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 3 and 180),
  meeting_type text not null check (meeting_type in ('management','general_staff','training','special')),
  visibility text not null default 'invited' check (visibility in ('company','invited')),
  agenda text not null default '',
  meeting_url text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  is_recurring boolean not null default false,
  recurrence_rule text,
  recurrence_until date,
  discussion_notes text,
  decisions text,
  action_points text,
  status text not null default 'scheduled' check (status in ('scheduled','cancelled','completed')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.staff_meeting_participants (
  meeting_id uuid not null references public.staff_meetings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  attendance text not null default 'pending' check (attendance in ('pending','attended','absent')),
  created_at timestamptz not null default now(),
  primary key (meeting_id,user_id)
);
create table if not exists public.staff_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 3 and 180),
  body text not null check (char_length(btrim(body)) between 1 and 8000),
  importance text not null default 'normal' check (importance in ('normal','important')),
  is_active boolean not null default true,
  published_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table if not exists public.staff_announcement_acknowledgements (
  announcement_id uuid not null references public.staff_announcements(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  acknowledged_at timestamptz not null default now(),
  primary key (announcement_id,user_id)
);
create table if not exists public.staff_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 3 and 180),
  description text not null default '',
  assigned_to_user_id uuid references auth.users(id),
  assigned_department text,
  assigned_by uuid not null references auth.users(id),
  assigned_at timestamptz not null default now(),
  due_at timestamptz,
  priority text not null default 'normal' check (priority in ('normal','urgent')),
  status text not null default 'pending' check (status in ('pending','accepted','in_progress','submitted_for_review','completed','cancelled')),
  completion_notes text,
  review_note text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_tasks_has_assignee check (assigned_to_user_id is not null or nullif(btrim(assigned_department),'') is not null)
);
create table if not exists public.staff_task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.staff_tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  comment text not null check (char_length(btrim(comment)) between 1 and 3000),
  created_at timestamptz not null default now()
);
create table if not exists public.staff_task_extension_requests (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.staff_tasks(id) on delete cascade,
  requested_by uuid not null references auth.users(id),
  current_due_at timestamptz,
  requested_due_at timestamptz not null,
  reason text not null check (char_length(btrim(reason)) between 5 and 2000),
  status text not null default 'pending' check (status in ('pending','approved','declined')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  reviewer_note text,
  created_at timestamptz not null default now()
);
create table if not exists public.staff_dashboard_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null default '',
  notification_type text not null default 'reminder',
  related_type text,
  related_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists staff_meetings_starts_at_idx on public.staff_meetings(starts_at);
create index if not exists staff_meeting_participants_user_idx on public.staff_meeting_participants(user_id,meeting_id);
create index if not exists staff_tasks_assignee_due_idx on public.staff_tasks(assigned_to_user_id,due_at);
create index if not exists staff_tasks_department_due_idx on public.staff_tasks(assigned_department,due_at);
create index if not exists staff_task_comments_task_idx on public.staff_task_comments(task_id,created_at);
create index if not exists staff_notifications_user_created_idx on public.staff_dashboard_notifications(user_id,created_at desc);

alter table public.staff_meetings enable row level security;
alter table public.staff_meeting_participants enable row level security;
alter table public.staff_announcements enable row level security;
alter table public.staff_announcement_acknowledgements enable row level security;
alter table public.staff_tasks enable row level security;
alter table public.staff_task_comments enable row level security;
alter table public.staff_task_extension_requests enable row level security;
alter table public.staff_dashboard_notifications enable row level security;

grant select, insert, update, delete on public.staff_meetings to authenticated;
grant select, insert, update, delete on public.staff_meeting_participants to authenticated;
grant select, insert, update, delete on public.staff_announcements to authenticated;
grant select, insert, update, delete on public.staff_announcement_acknowledgements to authenticated;
grant select, insert, update, delete on public.staff_tasks to authenticated;
grant select, insert, update, delete on public.staff_task_comments to authenticated;
grant select, insert, update, delete on public.staff_task_extension_requests to authenticated;
grant select, insert, update, delete on public.staff_dashboard_notifications to authenticated;

drop policy if exists staff_meetings_owner_all on public.staff_meetings;
create policy staff_meetings_owner_all on public.staff_meetings for all to authenticated
using ((select private.has_admin_role(array['owner']::text[])))
with check ((select private.has_admin_role(array['owner']::text[])));
drop policy if exists staff_meetings_staff_read on public.staff_meetings;
create policy staff_meetings_staff_read on public.staff_meetings for select to authenticated
using (
  (select private.has_admin_role(array['owner','store_manager','finance_officer','marketing_manager','order_officer','analyst']::text[]))
  and (
    visibility = 'company'
    or exists (select 1 from public.staff_meeting_participants p where p.meeting_id = id and p.user_id = (select auth.uid()))
  )
);

drop policy if exists staff_meeting_participants_owner_all on public.staff_meeting_participants;
create policy staff_meeting_participants_owner_all on public.staff_meeting_participants for all to authenticated
using ((select private.has_admin_role(array['owner']::text[])))
with check ((select private.has_admin_role(array['owner']::text[])));
drop policy if exists staff_meeting_participants_self_read on public.staff_meeting_participants;
create policy staff_meeting_participants_self_read on public.staff_meeting_participants for select to authenticated
using (user_id = (select auth.uid()));
drop policy if exists staff_meeting_participants_self_attendance on public.staff_meeting_participants;
create policy staff_meeting_participants_self_attendance on public.staff_meeting_participants for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists staff_announcements_owner_all on public.staff_announcements;
create policy staff_announcements_owner_all on public.staff_announcements for all to authenticated
using ((select private.has_admin_role(array['owner']::text[])))
with check ((select private.has_admin_role(array['owner']::text[])));
drop policy if exists staff_announcements_staff_read on public.staff_announcements;
create policy staff_announcements_staff_read on public.staff_announcements for select to authenticated
using (
  is_active = true
  and (select private.has_admin_role(array['owner','store_manager','finance_officer','marketing_manager','order_officer','analyst']::text[]))
);
drop policy if exists staff_announcement_ack_self on public.staff_announcement_acknowledgements;
create policy staff_announcement_ack_self on public.staff_announcement_acknowledgements for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
drop policy if exists staff_announcement_ack_owner_read on public.staff_announcement_acknowledgements;
create policy staff_announcement_ack_owner_read on public.staff_announcement_acknowledgements for select to authenticated
using ((select private.has_admin_role(array['owner']::text[])));

drop policy if exists staff_tasks_owner_all on public.staff_tasks;
create policy staff_tasks_owner_all on public.staff_tasks for all to authenticated
using ((select private.has_admin_role(array['owner']::text[])))
with check ((select private.has_admin_role(array['owner']::text[])));
drop policy if exists staff_tasks_assignee_read on public.staff_tasks;
create policy staff_tasks_assignee_read on public.staff_tasks for select to authenticated
using (
  assigned_to_user_id = (select auth.uid())
  and (select private.has_admin_role(array['owner','store_manager','finance_officer','marketing_manager','order_officer','analyst']::text[]))
);
drop policy if exists staff_tasks_assignee_update on public.staff_tasks;
create policy staff_tasks_assignee_update on public.staff_tasks for update to authenticated
using (
  assigned_to_user_id = (select auth.uid())
  and (select private.has_admin_role(array['owner','store_manager','finance_officer','marketing_manager','order_officer','analyst']::text[]))
)
with check (assigned_to_user_id = (select auth.uid()));

create or replace function public.protect_staff_task_updates()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  is_owner boolean;
begin
  select coalesce(bool_or(role = 'owner' and is_active), false)
    into is_owner from public.admin_profiles where user_id = (select auth.uid());
  if is_owner then return new; end if;
  if new.assigned_to_user_id is distinct from old.assigned_to_user_id
     or new.assigned_department is distinct from old.assigned_department
     or new.assigned_by is distinct from old.assigned_by
     or new.title is distinct from old.title
     or new.description is distinct from old.description
     or new.assigned_at is distinct from old.assigned_at
     or new.due_at is distinct from old.due_at
     or new.priority is distinct from old.priority
     or new.review_note is distinct from old.review_note
     or new.reviewed_at is distinct from old.reviewed_at
     or new.reviewed_by is distinct from old.reviewed_by
     or new.created_at is distinct from old.created_at then
    raise exception 'Staff may only update their own task progress and completion notes.';
  end if;
  if new.status not in ('accepted','in_progress','submitted_for_review') then
    raise exception 'Staff may only accept, start, or submit their assigned tasks.';
  end if;
  return new;
end;
$$;
drop trigger if exists protect_staff_task_updates_trigger on public.staff_tasks;
create trigger protect_staff_task_updates_trigger before update on public.staff_tasks
for each row execute function public.protect_staff_task_updates();

drop policy if exists staff_task_comments_owner_all on public.staff_task_comments;
create policy staff_task_comments_owner_all on public.staff_task_comments for all to authenticated
using ((select private.has_admin_role(array['owner']::text[])))
with check ((select private.has_admin_role(array['owner']::text[])));
drop policy if exists staff_task_comments_assignee_read on public.staff_task_comments;
create policy staff_task_comments_assignee_read on public.staff_task_comments for select to authenticated
using (exists (select 1 from public.staff_tasks t where t.id = task_id and t.assigned_to_user_id = (select auth.uid())));
drop policy if exists staff_task_comments_assignee_insert on public.staff_task_comments;
create policy staff_task_comments_assignee_insert on public.staff_task_comments for insert to authenticated
with check (user_id = (select auth.uid()) and exists (select 1 from public.staff_tasks t where t.id = task_id and t.assigned_to_user_id = (select auth.uid())));

drop policy if exists staff_task_extensions_owner_all on public.staff_task_extension_requests;
create policy staff_task_extensions_owner_all on public.staff_task_extension_requests for all to authenticated
using ((select private.has_admin_role(array['owner']::text[])))
with check ((select private.has_admin_role(array['owner']::text[])));
drop policy if exists staff_task_extensions_assignee_read on public.staff_task_extension_requests;
create policy staff_task_extensions_assignee_read on public.staff_task_extension_requests for select to authenticated
using (requested_by = (select auth.uid()));
drop policy if exists staff_task_extensions_assignee_insert on public.staff_task_extension_requests;
create policy staff_task_extensions_assignee_insert on public.staff_task_extension_requests for insert to authenticated
with check (requested_by = (select auth.uid()) and exists (select 1 from public.staff_tasks t where t.id = task_id and t.assigned_to_user_id = (select auth.uid())));

drop policy if exists staff_notifications_self_all on public.staff_dashboard_notifications;
create policy staff_notifications_self_all on public.staff_dashboard_notifications for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
drop policy if exists staff_notifications_owner_read on public.staff_dashboard_notifications;
create policy staff_notifications_owner_read on public.staff_dashboard_notifications for select to authenticated
using ((select private.has_admin_role(array['owner']::text[])));

comment on table public.staff_meetings is 'eCuisine staff meetings, agendas, meeting links, notes and decisions.';
comment on table public.staff_tasks is 'Internal staff task assignments; separate from customer orders and partner tasks.';
comment on table public.staff_dashboard_notifications is 'In-app notifications for eCuisine staff workspaces.';
