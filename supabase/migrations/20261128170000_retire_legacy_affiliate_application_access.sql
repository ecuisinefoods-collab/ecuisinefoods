-- Retire legacy affiliate application writes and restrict historical bank data to owner/finance.
-- Existing rows and bank details are preserved in place. Feature-branch draft only.

begin;

drop policy if exists "Affiliate admins may read applications" on public.affiliate_applications;
drop policy if exists "Affiliate admins may update application status" on public.affiliate_applications;
drop policy if exists "Public may submit affiliate applications" on public.affiliate_applications;

-- The remaining legacy finance SELECT policy permits only owner and finance_officer.
-- The legacy application workflow is retired; new applications use affiliate_program_applications.
revoke insert on public.affiliate_applications from anon, authenticated;
revoke update on public.affiliate_applications from authenticated;

commit;
