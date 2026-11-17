-- Persist reusable product categories for the eCuisine catalogue.
create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  constraint product_categories_name_unique unique (name)
);

alter table public.product_categories enable row level security;
grant select on public.product_categories to anon, authenticated;
grant insert, update, delete on public.product_categories to authenticated;

drop policy if exists "Anyone can view product categories" on public.product_categories;
create policy "Anyone can view product categories"
on public.product_categories for select to anon, authenticated
using (true);

drop policy if exists "Store managers manage product categories" on public.product_categories;
create policy "Store managers manage product categories"
on public.product_categories for all to authenticated
using (
  exists (
    select 1 from public.admin_profiles ap
    where ap.user_id = auth.uid()
      and ap.is_active = true
      and ap.role in ('owner', 'store_manager')
  )
)
with check (
  exists (
    select 1 from public.admin_profiles ap
    where ap.user_id = auth.uid()
      and ap.is_active = true
      and ap.role in ('owner', 'store_manager')
  )
);

insert into public.product_categories (name, slug)
select distinct p.category,
  lower(trim(both '-' from regexp_replace(p.category, '[^a-zA-Z0-9]+', '-', 'g')))
from public.products p
where nullif(trim(p.category), '') is not null
on conflict (name) do nothing;
