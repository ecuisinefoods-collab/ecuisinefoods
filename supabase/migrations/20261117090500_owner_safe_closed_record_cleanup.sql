-- Owner-only cleanup of closed operational records; customer and financial history is retained.
create or replace function public.admin_cleanup_closed_records()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conversations integer := 0;
  v_inquiries integer := 0;
  v_applications integer := 0;
  v_rate_limits integer := 0;
  v_user uuid := auth.uid();
begin
  if v_user is null or not private.has_admin_role(array['owner']::text[]) then
    raise exception 'Only the active owner account can run database cleanup.';
  end if;
  delete from public.assistant_conversations where status = 'resolved';
  get diagnostics v_conversations = row_count;
  delete from public.partnership_inquiries where status = 'closed';
  get diagnostics v_inquiries = row_count;
  delete from public.affiliate_applications a
  where a.status = 'declined'
    and not exists (select 1 from public.partner_profiles p where p.application_id = a.id);
  get diagnostics v_applications = row_count;
  delete from public.assistant_rate_limits;
  get diagnostics v_rate_limits = row_count;
  insert into public.admin_audit_logs(actor_user_id, action, resource_type, details)
  values(v_user, 'cleanup_closed_records', 'database_cleanup',
    jsonb_build_object('resolved_conversations',v_conversations,'closed_inquiries',v_inquiries,
      'declined_applications',v_applications,'assistant_rate_limits',v_rate_limits));
  return jsonb_build_object('resolved_conversations',v_conversations,'closed_inquiries',v_inquiries,
    'declined_applications',v_applications,'assistant_rate_limits',v_rate_limits);
end;
$$;
revoke all on function public.admin_cleanup_closed_records() from public;
grant execute on function public.admin_cleanup_closed_records() to authenticated;
