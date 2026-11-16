create table public.affiliate_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(btrim(full_name)) between 2 and 120),
  email text not null check (char_length(btrim(email)) between 5 and 254 and position('@' in email) > 1),
  phone text check (phone is null or char_length(phone) <= 40),
  social_handle text check (social_handle is null or char_length(social_handle) <= 160),
  primary_platform text not null check (char_length(btrim(primary_platform)) between 2 and 80),
  audience_size text not null check (audience_size in (
    'Under 1,000',
    '1,000–5,000',
    '5,001–10,000',
    '10,001–50,000',
    'More than 50,000'
  )),
  promotion_channels text check (promotion_channels is null or char_length(promotion_channels) <= 500),
  motivation text not null check (char_length(btrim(motivation)) between 30 and 2500),
  status text not null default 'new' check (status in ('new','reviewing','approved','declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index affiliate_applications_status_created_at_idx
  on public.affiliate_applications (status, created_at desc);

create index affiliate_applications_email_created_at_idx
  on public.affiliate_applications (lower(email), created_at desc);

alter table public.affiliate_applications enable row level security;

revoke all on table public.affiliate_applications from public, anon, authenticated;
grant insert (full_name, email, phone, social_handle, primary_platform, audience_size, promotion_channels, motivation)
  on public.affiliate_applications to anon, authenticated;
grant select on public.affiliate_applications to authenticated;
grant update (status, updated_at) on public.affiliate_applications to authenticated;

create policy "Public may submit affiliate applications"
  on public.affiliate_applications
  for insert
  to anon, authenticated
  with check (
    status = 'new'
    and char_length(btrim(full_name)) between 2 and 120
    and char_length(btrim(email)) between 5 and 254
    and position('@' in email) > 1
    and (phone is null or char_length(phone) <= 40)
    and (social_handle is null or char_length(social_handle) <= 160)
    and char_length(btrim(primary_platform)) between 2 and 80
    and audience_size in ('Under 1,000','1,000–5,000','5,001–10,000','10,001–50,000','More than 50,000')
    and (promotion_channels is null or char_length(promotion_channels) <= 500)
    and char_length(btrim(motivation)) between 30 and 2500
  );

create policy "Affiliate admins may read applications"
  on public.affiliate_applications
  for select
  to authenticated
  using ((select private.has_admin_role(array['owner','store_manager','marketing_manager'])));

create policy "Affiliate admins may update application status"
  on public.affiliate_applications
  for update
  to authenticated
  using ((select private.has_admin_role(array['owner','store_manager','marketing_manager'])))
  with check ((select private.has_admin_role(array['owner','store_manager','marketing_manager'])));
