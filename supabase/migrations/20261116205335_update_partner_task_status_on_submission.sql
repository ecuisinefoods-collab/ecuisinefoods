create or replace function private.mark_partner_task_submitted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.partner_tasks
  set status = 'submitted', updated_at = now()
  where id = new.task_id
    and assigned_partner_id = new.partner_id
    and status in ('assigned','in_progress','needs_revision');
  return new;
end;
$$;

drop trigger if exists partner_submission_updates_task_status on public.partner_task_submissions;
create trigger partner_submission_updates_task_status
after insert on public.partner_task_submissions
for each row execute function private.mark_partner_task_submitted();
