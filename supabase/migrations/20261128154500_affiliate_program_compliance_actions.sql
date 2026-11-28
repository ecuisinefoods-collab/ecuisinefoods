-- Affiliate compliance history and owner-controlled inactivation.
-- Feature-branch draft only. NOT applied to Supabase.

begin;

create table if not exists public.affiliate_program_compliance_actions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.affiliate_program_members(id) on delete restrict,
  action_type text not null check (action_type in ('reminder','personal_follow_up','formal_warning','inactivated','reactivated')),
  action_note text not null check (length(trim(action_note)) between 3 and 2000),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists affiliate_program_compliance_member_idx
  on public.affiliate_program_compliance_actions(member_id, created_at desc);

grant select, insert on public.affiliate_program_compliance_actions to authenticated;
alter table public.affiliate_program_compliance_actions enable row level security;

create policy affiliate_program_compliance_read_own
  on public.affiliate_program_compliance_actions for select to authenticated
  using (
    exists (select 1 from public.affiliate_program_members m
      where m.id=member_id and m.user_id=auth.uid())
  );

create policy affiliate_program_compliance_manager_read
  on public.affiliate_program_compliance_actions for select to authenticated
  using (
    exists (select 1 from public.admin_profiles a
      where a.user_id=auth.uid() and a.is_active=true and a.role in ('owner','affiliate_manager'))
  );

create policy affiliate_program_compliance_manager_insert
  on public.affiliate_program_compliance_actions for insert to authenticated
  with check (
    created_by=auth.uid()
    and action_type in ('reminder','personal_follow_up','formal_warning')
    and exists (select 1 from public.admin_profiles a
      where a.user_id=auth.uid() and a.is_active=true and a.role in ('owner','affiliate_manager'))
  );

create or replace function public.affiliate_program_owner_set_member_status(
  p_member_id uuid,
  p_status text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_before text;
begin
  if auth.uid() is null or not exists (
    select 1 from public.admin_profiles a
    where a.user_id=auth.uid() and a.role='owner' and a.is_active=true
  ) then raise exception 'Only the active account owner can change affiliate access status.'; end if;
  if p_status not in ('active','inactive','suspended','exited') then
    raise exception 'Choose a supported affiliate status.';
  end if;
  if nullif(trim(p_reason),'') is null then
    raise exception 'A reason is required for this status change.';
  end if;
  select status into v_before from public.affiliate_program_members where id=p_member_id for update;
  if not found then raise exception 'Affiliate membership was not found.'; end if;
  if v_before=p_status then return; end if;

  update public.affiliate_program_members set status=p_status,updated_at=now() where id=p_member_id;
  insert into public.affiliate_program_compliance_actions(member_id,action_type,action_note,created_by)
  values (p_member_id,
    case when p_status='inactive' then 'inactivated' when p_status='active' then 'reactivated' else 'formal_warning' end,
    trim(p_reason),auth.uid());
  insert into public.affiliate_program_audit_log(actor_user_id,entity_type,entity_id,action,reason,before_data,after_data)
  values (auth.uid(),'affiliate_member',p_member_id,'status_changed',trim(p_reason),
    jsonb_build_object('status',v_before),jsonb_build_object('status',p_status));
end;
$$;

revoke all on function public.affiliate_program_owner_set_member_status(uuid,text,text) from public,anon,authenticated;
grant execute on function public.affiliate_program_owner_set_member_status(uuid,text,text) to authenticated;

commit;
