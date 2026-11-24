drop policy if exists staff_notifications_owner_insert on public.staff_dashboard_notifications;
create policy staff_notifications_owner_insert on public.staff_dashboard_notifications for insert to authenticated
with check ((select private.has_admin_role(array['owner']::text[])));

create or replace function public.protect_staff_meeting_attendance()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.meeting_id is distinct from old.meeting_id
     or new.user_id is distinct from old.user_id
     or new.created_at is distinct from old.created_at then
    raise exception 'Staff may only update their own attendance status.';
  end if;
  return new;
end;
$$;
drop trigger if exists protect_staff_meeting_attendance_trigger on public.staff_meeting_participants;
create trigger protect_staff_meeting_attendance_trigger before update on public.staff_meeting_participants
for each row execute function public.protect_staff_meeting_attendance();
