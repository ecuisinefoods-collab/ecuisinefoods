insert into public.site_settings (setting_key, setting_value, updated_at)
values ('sales_counter_historical_baseline', '2500', now())
on conflict (setting_key) do nothing;

drop policy if exists "Public can read storefront presentation settings" on public.site_settings;

create policy "Public can read storefront presentation settings"
  on public.site_settings
  for select
  to anon, authenticated
  using (
    setting_key = any (array[
      'store_logo_url',
      'storefront_config',
      'about_page_config',
      'sales_counter_manual_value',
      'sales_counter_historical_baseline'
    ]::text[])
  );
