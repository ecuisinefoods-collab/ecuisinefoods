alter table public.affiliate_applications
  add column if not exists bank_name text,
  add column if not exists bank_account_name text,
  add column if not exists bank_account_number text;

alter table public.affiliate_applications
  drop constraint if exists affiliate_applications_bank_details_check;
alter table public.affiliate_applications
  add constraint affiliate_applications_bank_details_check check (
    (bank_name is null and bank_account_name is null and bank_account_number is null)
    or
    (char_length(btrim(bank_name)) between 2 and 100
      and char_length(btrim(bank_account_name)) between 2 and 120
      and bank_account_number ~ '^[0-9]{10}$')
  );

grant insert (bank_name, bank_account_name, bank_account_number)
  on public.affiliate_applications to anon, authenticated;

create or replace function public.get_my_affiliate_bank_details()
returns table(bank_name text, bank_account_name text, bank_account_number text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Sign in to view your bank details.'; end if;
  return query
    select a.bank_name, a.bank_account_name, a.bank_account_number
    from public.partner_profiles p
    join public.affiliate_applications a on a.id = p.application_id
    where p.user_id = auth.uid()
    limit 1;
end;
$$;

create or replace function public.update_my_affiliate_bank_details(
  p_bank_name text,
  p_bank_account_name text,
  p_bank_account_number text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_application_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in to update bank details.'; end if;
  if char_length(btrim(coalesce(p_bank_name,''))) < 2 or char_length(btrim(p_bank_name)) > 100 then
    raise exception 'Enter a valid bank name.';
  end if;
  if char_length(btrim(coalesce(p_bank_account_name,''))) < 2 or char_length(btrim(p_bank_account_name)) > 120 then
    raise exception 'Enter the account holder name.';
  end if;
  if coalesce(p_bank_account_number,'') !~ '^[0-9]{10}$' then
    raise exception 'Enter a valid 10-digit Nigerian account number.';
  end if;
  select application_id into v_application_id
  from public.partner_profiles
  where user_id = auth.uid() and status = 'active'
  limit 1;
  if v_application_id is null then raise exception 'No active affiliate profile found.'; end if;
  update public.affiliate_applications
  set bank_name = btrim(p_bank_name),
      bank_account_name = btrim(p_bank_account_name),
      bank_account_number = p_bank_account_number,
      updated_at = now()
  where id = v_application_id;
end;
$$;

revoke all on function public.get_my_affiliate_bank_details() from public, anon;
grant execute on function public.get_my_affiliate_bank_details() to authenticated;
revoke all on function public.update_my_affiliate_bank_details(text,text,text) from public, anon;
grant execute on function public.update_my_affiliate_bank_details(text,text,text) to authenticated;
