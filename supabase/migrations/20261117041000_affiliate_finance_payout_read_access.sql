drop policy if exists "Affiliate finance may read payout bank details" on public.affiliate_applications;
create policy "Affiliate finance may read payout bank details"
on public.affiliate_applications for select to authenticated
using (private.has_admin_role(array['owner'::text,'finance_officer'::text]));

drop policy if exists "Affiliate finance may read profiles for payouts" on public.partner_profiles;
create policy "Affiliate finance may read profiles for payouts"
on public.partner_profiles for select to authenticated
using (private.has_admin_role(array['owner'::text,'finance_officer'::text]));
