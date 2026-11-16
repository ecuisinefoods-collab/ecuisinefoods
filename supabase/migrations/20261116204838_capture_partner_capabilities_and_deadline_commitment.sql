alter table public.affiliate_applications
  add column if not exists skills text check (skills is null or char_length(skills) <= 1200),
  add column if not exists availability text check (availability is null or char_length(availability) <= 120),
  add column if not exists preferred_activities text[] not null default '{}'::text[],
  add column if not exists deadline_commitment boolean not null default false;

alter table public.affiliate_applications
  add constraint affiliate_preferred_activities_allowed
  check (preferred_activities <@ array['Product promotion','Social media engagement','Content creation','Campaign support','Community support','Customer feedback']::text[]),
  add constraint affiliate_deadline_commitment_required check (deadline_commitment = true);

drop policy if exists "Public may submit affiliate applications" on public.affiliate_applications;
grant insert (full_name,email,phone,social_handle,primary_platform,audience_size,promotion_channels,motivation,skills,availability,preferred_activities,deadline_commitment)
  on public.affiliate_applications to anon, authenticated;

create policy "Public may submit affiliate applications"
  on public.affiliate_applications for insert to anon, authenticated
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
    and (skills is null or char_length(skills) <= 1200)
    and (availability is null or char_length(availability) <= 120)
    and preferred_activities <@ array['Product promotion','Social media engagement','Content creation','Campaign support','Community support','Customer feedback']::text[]
    and deadline_commitment = true
  );
