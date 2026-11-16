create table if not exists public.site_visit_events (
  id bigint generated always as identity primary key,
  visitor_id uuid not null,
  page_path text not null check (
    length(page_path) between 1 and 240
    and left(page_path, 1) = '/'
    and position('?' in page_path) = 0
    and position('#' in page_path) = 0
  ),
  referrer_host text check (referrer_host is null or length(referrer_host) <= 180),
  campaign_source text check (campaign_source is null or length(campaign_source) <= 100),
  created_at timestamptz not null default now()
);

create index if not exists site_visit_events_created_at_idx
  on public.site_visit_events (created_at desc);
create index if not exists site_visit_events_visitor_created_idx
  on public.site_visit_events (visitor_id, created_at desc);
create index if not exists site_visit_events_path_created_idx
  on public.site_visit_events (page_path, created_at desc);

alter table public.site_visit_events enable row level security;

revoke all on public.site_visit_events from anon, authenticated;
grant insert on public.site_visit_events to anon, authenticated;
grant select on public.site_visit_events to authenticated;

drop policy if exists "Public can record storefront visits" on public.site_visit_events;
create policy "Public can record storefront visits"
  on public.site_visit_events
  for insert
  to anon, authenticated
  with check (
    visitor_id is not null
    and length(page_path) between 1 and 240
    and left(page_path, 1) = '/'
    and position('?' in page_path) = 0
    and position('#' in page_path) = 0
    and (referrer_host is null or length(referrer_host) <= 180)
    and (campaign_source is null or length(campaign_source) <= 100)
  );

drop policy if exists "Admins can read storefront visit analytics" on public.site_visit_events;
create policy "Admins can read storefront visit analytics"
  on public.site_visit_events
  for select
  to authenticated
  using (
    (select private.has_admin_role(ARRAY['owner','store_manager','finance_officer','analyst']))
  );
