-- Owner-controlled activation of approved applications after the applicant has accepted an auth invite.
-- Feature-branch draft only. NOT applied to any database.

begin;

create or replace function public.affiliate_program_activate_application(
  p_application_id uuid,
  p_affiliate_code text,
  p_programme_start_date date
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_application public.affiliate_program_applications%rowtype;
  v_auth_user_id uuid;
  v_member_id uuid;
  v_code text;
begin
  if auth.uid() is null or not exists (
    select 1 from public.admin_profiles a
    where a.user_id = auth.uid() and a.role = 'owner' and a.is_active = true
  ) then
    raise exception 'Only the active account owner can activate affiliates.';
  end if;

  v_code := upper(trim(p_affiliate_code));
  if v_code !~ '^[A-Z0-9-]{4,24}$' then
    raise exception 'Affiliate code must be 4 to 24 letters, numbers or hyphens.';
  end if;
  if p_programme_start_date is null or p_programme_start_date > current_date then
    raise exception 'Enter a valid programme start date.';
  end if;

  select * into v_application
  from public.affiliate_program_applications
  where id = p_application_id
  for update;

  if not found or v_application.status <> 'approved' then
    raise exception 'Approve the application before activating the affiliate.';
  end if;

  select id into v_auth_user_id
  from auth.users
  where lower(email) = lower(v_application.email)
    and email_confirmed_at is not null
  limit 1;

  if v_auth_user_id is null then
    raise exception 'No confirmed sign-in account exists for this applicant. Invite them through Supabase Auth and ask them to accept the invitation first.';
  end if;

  if exists (select 1 from public.affiliate_program_members where user_id = v_auth_user_id)
    or exists (select 1 from public.affiliate_program_members where application_id = p_application_id) then
    raise exception 'This application or user already has an affiliate membership.';
  end if;

  insert into public.affiliate_program_members (
    user_id, application_id, affiliate_code, affiliate_model, level,
    status, programme_start_date, created_by
  ) values (
    v_auth_user_id, p_application_id, v_code, v_application.requested_model,
    'beginner', 'active', p_programme_start_date, auth.uid()
  ) returning id into v_member_id;

  insert into public.affiliate_program_audit_log (
    actor_user_id, entity_type, entity_id, action, after_data
  ) values (
    auth.uid(), 'affiliate_member', v_member_id, 'activated',
    jsonb_build_object('application_id',p_application_id,'user_id',v_auth_user_id,
      'affiliate_code',v_code,'affiliate_model',v_application.requested_model,
      'programme_start_date',p_programme_start_date)
  );

  return v_member_id;
end;
$$;

revoke all on function public.affiliate_program_activate_application(uuid,text,date) from public, anon, authenticated;
grant execute on function public.affiliate_program_activate_application(uuid,text,date) to authenticated;

commit;
