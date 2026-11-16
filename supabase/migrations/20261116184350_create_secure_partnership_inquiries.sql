create table public.partnership_inquiries (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(btrim(full_name)) between 2 and 120),
  email text not null check (char_length(btrim(email)) between 5 and 254 and position('@' in email) > 1),
  phone text check (phone is null or char_length(phone) <= 40),
  organization text check (organization is null or char_length(organization) <= 160),
  interest text not null check (interest in (
    'Retail distribution / stockist',
    'Wholesale supply',
    'Corporate & institutional supply',
    'Brand collaboration / marketing',
    'Strategic partnership / investment',
    'Other'
  )),
  message text not null check (char_length(btrim(message)) between 20 and 3000),
  status text not null default 'new' check (status in ('new','reviewing','contacted','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index partnership_inquiries_status_created_at_idx
  on public.partnership_inquiries (status, created_at desc);

alter table public.partnership_inquiries enable row level security;

revoke all on table public.partnership_inquiries from public, anon, authenticated;
grant insert (full_name, email, phone, organization, interest, message)
  on public.partnership_inquiries to anon, authenticated;
grant select on public.partnership_inquiries to authenticated;
grant update (status, updated_at) on public.partnership_inquiries to authenticated;

create policy "Public may submit partnership enquiries"
  on public.partnership_inquiries
  for insert
  to anon, authenticated
  with check (
    status = 'new'
    and char_length(btrim(full_name)) between 2 and 120
    and char_length(btrim(email)) between 5 and 254
    and position('@' in email) > 1
    and (phone is null or char_length(phone) <= 40)
    and (organization is null or char_length(organization) <= 160)
    and char_length(btrim(message)) between 20 and 3000
  );

create policy "Partnership admins may read enquiries"
  on public.partnership_inquiries
  for select
  to authenticated
  using ((select private.has_admin_role(array['owner','store_manager','marketing_manager'])));

create policy "Partnership admins may update enquiry status"
  on public.partnership_inquiries
  for update
  to authenticated
  using ((select private.has_admin_role(array['owner','store_manager','marketing_manager'])))
  with check ((select private.has_admin_role(array['owner','store_manager','marketing_manager'])));
