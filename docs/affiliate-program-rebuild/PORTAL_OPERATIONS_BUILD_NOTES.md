# Affiliate Portal and Operations — Current Build Notes

This is the current implementation snapshot on `feature/affiliate-program-rebuild`. It is not deployed and the database migrations have not been applied to the live Supabase project.

## Public application
- Public page: `/affiliates`
- Applicant selects reseller or commission-based model.
- Public form collects name, email, phone, location and a short experience note.
- Bank details are not collected on the public form.

## Owner onboarding
1. Review the submitted application at `/admin/affiliates`.
2. Change its status to approved.
3. Invite the applicant's email through Supabase Dashboard → Authentication → Users.
4. Wait for the applicant to accept the invite and confirm their email.
5. Open `/admin/affiliate-activation`, assign an affiliate code and programme start date, then activate.
6. New members start at Beginner level. Historical affiliate sales are not imported.

The activation RPC is owner-only and checks that the approved applicant has a confirmed Supabase Auth account matching the application email. It does not create passwords or send invitations itself.

## Affiliate portal
- Private sign-in page and dashboard: `/affiliate`
- Shows programme identity, level, affiliate code, monthly target (when assigned), sales, transfers, earnings, announcements and training resources.
- Allows a member to submit one product/pack-size line per sale record through an atomic database RPC.
- Sale submissions remain pending until owner review.
- No bank details are displayed in the portal.
- The dashboard does not invent commission percentages, targets or payout calculations.

## Owner operations
- Sales verification: `/admin/affiliate-sales`
- Stock transfer recording: `/admin/affiliate-stock`
- Stock transfers are created as recorded and only become confirmed after payment is paid/not-required and an owner confirms receipt.
- Reseller sale approval checks paid status and confirmed available stock, with member-row locking to serialize stock approvals.
- Rejected sales require a review note.
- Commission sale approval is deliberately blocked until management confirms the customer-fund remittance/settlement model. Sales can be submitted, but they cannot yet become approved.

## Financial and data safeguards
- Reseller stock transfer lines require an acquisition price so margins can later be calculated from actual records.
- Earning records are immutable after creation; corrections must use reversal/adjustment records.
- Bank/payout details remain owner-only through the Data API.
- Owner-only actions are enforced again inside database security-definer RPCs; frontend role checks are only an additional UX layer.
- All new programme work remains isolated on the feature branch. No production deployment or database migration has occurred.

## Known work remaining
- Affiliate Sales & Growth Manager role and restricted team dashboard.
- Leaderboard and verified performance aggregates.
- Target progress calculation and level progression rules.
- Commission settlement model and approved rates by level.
- Reseller earnings calculation, commission calculation, payout approvals and payout scheduling.
- Secure owner/finance payout-detail handling and admin member profile management.
- Exchanges/returns policy and sale correction/resubmission path.
- Notification integrations, resource/announcement management UI and pilot test scenarios.
- Full isolated database migration test; Docker is not installed on the user's computer, so local Supabase CLI testing is not currently available.
