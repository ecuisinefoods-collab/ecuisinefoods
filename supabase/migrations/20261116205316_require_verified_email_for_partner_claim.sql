create or replace function private.claim_ecuisine_partner_account()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_email text;
  confirmed_at timestamptz;
  claimed_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in before claiming your partner account.'; end if;
  select lower(email), email_confirmed_at into current_email, confirmed_at
  from auth.users where id = auth.uid();
  if current_email is null or confirmed_at is null then
    raise exception 'Confirm your email address before claiming your partner account.';
  end if;
  select p.id into claimed_id
  from public.partner_profiles p
  join public.affiliate_applications a on a.id = p.application_id
  where p.user_id is null and p.status = 'active' and a.status = 'approved'
    and lower(a.email) = current_email
  order by a.created_at desc
  limit 1;
  if claimed_id is not null then
    update public.partner_profiles set user_id = auth.uid(), updated_at = now()
    where id = claimed_id and user_id is null returning id into claimed_id;
  end if;
  if claimed_id is null then
    select id into claimed_id from public.partner_profiles
    where user_id = auth.uid() and status = 'active' limit 1;
  end if;
  if claimed_id is null then raise exception 'No approved eCuisine partner application matches this email.'; end if;
  return claimed_id;
end;
$$;
