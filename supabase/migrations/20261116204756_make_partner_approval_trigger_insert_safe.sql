create or replace function private.create_partner_profile_for_approved_application()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'approved' then
    insert into public.partner_profiles(application_id, partner_code)
    values (new.id, 'EC' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)))
    on conflict (application_id) do nothing;
  end if;
  return new;
end;
$$;
