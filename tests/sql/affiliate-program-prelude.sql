-- Minimal Supabase-compatible schema for isolated affiliate migration syntax checks.
create extension if not exists pgcrypto;
create role anon;
create role authenticated;
create schema auth;
create schema private;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  email_confirmed_at timestamptz
);
create or replace function auth.uid()
returns uuid language sql stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create table public.admin_profiles (
  user_id uuid primary key references auth.users(id),
  role text not null check (role = any (array[
    'owner','store_manager','finance_officer','marketing_manager','order_officer','analyst'
  ]::text[])),
  is_active boolean not null default true
);
create or replace function private.has_admin_role(required_roles text[] default null)
returns boolean language sql stable security definer set search_path=''
as $$
  select exists (
    select 1 from public.admin_profiles p
    where p.user_id=(select auth.uid()) and p.is_active=true
      and (required_roles is null or p.role=any(required_roles))
  )
$$;
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Test product',
  is_active boolean not null default true
);
create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  pack_size text not null default '500g',
  price numeric not null default 1
);
grant usage on schema auth,private to anon,authenticated;
grant usage on schema public to anon,authenticated;

-- Minimal private Supabase Storage surface for migration validation.
create schema storage;
create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null references storage.buckets(id),
  name text not null
);
alter table storage.objects enable row level security;
create or replace function storage.foldername(object_name text)
returns text[] language sql immutable
as $$ select string_to_array(object_name, '/') $$;
grant usage on schema storage to anon,authenticated;
grant select,insert on storage.objects to authenticated;

-- Minimal storefront order shape used by affiliate attribution validation.
create table public.orders (
  order_number bigint primary key,
  tracking_token_hash text not null unique,
  phone text not null,
  email text
);

-- Minimal legacy affiliate application table and the broad legacy policies being retired.
create table public.affiliate_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  social_handle text,
  primary_platform text not null,
  audience_size text not null,
  promotion_channels text,
  motivation text not null,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  skills text,
  availability text,
  preferred_activities text[] not null default '{}',
  deadline_commitment boolean not null default false,
  audience_description text,
  bank_name text,
  bank_account_name text,
  bank_account_number text
);
alter table public.affiliate_applications enable row level security;
grant select,insert,update on public.affiliate_applications to authenticated;
grant insert on public.affiliate_applications to anon;
create policy "Affiliate admins may read applications" on public.affiliate_applications
  for select to authenticated using (private.has_admin_role(array['owner','store_manager','marketing_manager']));
create policy "Affiliate admins may update application status" on public.affiliate_applications
  for update to authenticated using (private.has_admin_role(array['owner','store_manager','marketing_manager']))
  with check (private.has_admin_role(array['owner','store_manager','marketing_manager']));
create policy "Affiliate finance may read payout bank details" on public.affiliate_applications
  for select to authenticated using (private.has_admin_role(array['owner','finance_officer']));
create policy "Public may submit affiliate applications" on public.affiliate_applications
  for insert to anon,authenticated with check (status='new');

-- Legacy public partner-referral RPCs retired by the new programme migration.
create function public.record_partner_referral_click(p_referral_code text,p_landing_path text,p_attribution_token text)
returns uuid language sql security definer set search_path=public
as $$ select gen_random_uuid() $$;
create function public.attach_partner_referral_to_order(p_order_number bigint,p_tracking_code text,p_referral_code text,p_attribution_token text)
returns boolean language sql security definer set search_path=public
as $$ select false $$;
grant execute on function public.record_partner_referral_click(text,text,text) to anon,authenticated;
grant execute on function public.attach_partner_referral_to_order(bigint,text,text,text) to anon,authenticated;
