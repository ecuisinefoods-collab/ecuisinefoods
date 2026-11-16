drop policy if exists "Public can read storefront presentation settings" on public.site_settings;

create policy "Public can read storefront presentation settings"
on public.site_settings
for select
to anon, authenticated
using (
  setting_key = any (array[
    'store_logo_url'::text,
    'storefront_config'::text,
    'about_page_config'::text
  ])
);
