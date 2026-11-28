# Affiliate Programme Rebuild — Implementation Specification

**Working branch:** `feature/affiliate-program-rebuild`  
**Status:** Design baseline; no production database changes or deployment have been made.

## 1. Product direction

Replace the legacy referral/content-creator programme as the active affiliate experience with one physical-sales programme supporting two earning models:

- **Reseller:** receives stock through an authorised stock transfer, sells to customers, and earns the difference between the approved acquisition price and the actual selling price.
- **Commission affiliate:** generates customer sales and earns a configured commission on eligible, paid, admin-verified sales.

The programme is intended to support the existing affiliate community (approximately 40 people, with a reactivation priority), designated stockists, and future growth. The first release must support both earning models.

## 2. Decisions already approved

- All affiliates apply or are invited and require management approval before activation.
- Start the programme's performance history fresh from its official launch date. Do not import historical referral sales as new-programme sales.
- Pilot with approximately 5–8 affiliates for 14 days before official launch.
- Admin/owner records stock transfers initially. Stock collection is not a customer sale.
- Affiliates submit each customer sale; management verifies it. Only approved eligible sales count towards targets, levels, leaderboard and rewards.
- The owner retains sole authority to approve/reject sales.
- Affiliate Sales & Growth Manager has a dedicated team dashboard and reporting responsibility, but cannot approve sales, change commission rates, edit bank details, override owner decisions, or delete financial records.
- Levels: Beginner, Intermediate and Advanced. Monthly targets and rates are configurable; no percentages or thresholds are assumed.
- Leader rewards are performance-based and consider group verified sales, active affiliates, target achievers, recruitment and successful activation. Recruitment alone is not a reward trigger.
- Bank details are private and restricted to authorised finance/management roles. Never expose them in affiliate views or leaderboards.
- WhatsApp is the primary communication channel; the portal is the system of record.
- Keep existing affiliate/referral records for historical reference. Retire old flows from active use; do not destructively delete them.
- Do not use the legacy 15% commission as a default or imply it remains approved.

## 3. Proposed data domains

Use a new, clearly namespaced set of programme tables. Do not overload referral-oriented `partner_profiles` or `affiliate_commissions` with incompatible semantics.

1. **Applications and membership**
   - Applications with affiliate type requested, contact/location details, review state and timestamps.
   - Approved membership linked to `auth.users`, with unique affiliate code, affiliate type, level, activation date and status.
   - Separate sensitive payout/bank details with restricted access.

2. **Stock custody**
   - Stock-transfer header and item records: source (company/designated stockist/another affiliate), receiving affiliate, product variant, quantity, collection/payment state, reference, recorded-by and timestamps.
   - Transfer history is separate from customer sales.
   - Available affiliate stock is derived from confirmed inbound transfers less approved sold quantities and authorised adjustments. Avoid maintaining a second un-reconciled stock counter.

3. **Customer sales and verification**
   - Affiliate-submitted sale header and item rows with product variant, quantity, actual selling price, sale date, payment state and evidence/reference.
   - Status lifecycle: Submitted → Pending Verification → Approved or Rejected; cancellation is separately recorded with reason.
   - Only the owner/authorised admin verification action can approve. Every decision records actor, timestamp and reason.
   - Prevent duplicate submissions and quantity over-selling against affiliate-held stock for reseller sales.
   - Do not collect unnecessary customer personal data. Customer data must never appear in leaderboard/team views.

4. **Earnings and settlement**
   - Reseller margin and commission affiliate earnings are separate calculation paths.
   - Commission rates are versioned/configurable by level and effective date; the rate is not embedded as a hard-coded assumption.
   - Earnings are created only from eligible approved sales. Financial entries are append-only; corrections use reversal/adjustment records.
   - The exact settlement path for commission affiliate customer funds and reseller retained proceeds remains a business decision and must be finalised before live payouts.

5. **Performance, targets and rewards**
   - Monthly target configuration and per-member snapshots.
   - Level progression history, based only on verified eligible sales.
   - Leaderboard aggregates approved sales and target progress; no bank/customer details.
   - Leader monthly scorecard and reward record with auditable criteria and management approval.
   - Recruitment activation credit only after a recruit reaches their first monthly target.

6. **Engagement and learning**
   - Announcements, campaigns, competitions, training/resource library and completion tracking.
   - Product education content must use approved product facts only; no unsupported health claims.
   - Weekly leader scorecard: group verified sales, affiliates with sales, target achievers, inactive affiliates contacted, reactivated affiliates, new recruits and recruits reaching their first target.

7. **Audit**
   - Append-only audit trail for status, sale verification, stock movements, target/level changes, earnings, payouts and reward decisions.

## 4. Roles and authority

| Role | Permitted scope |
|---|---|
| Owner / authorised administrator | Approve applications, record transfers, verify/reject sales, configure targets/rates, approve rewards and payouts, view sensitive finance data |
| Affiliate Sales & Growth Manager | Team activation, onboarding, training, communications, progress and aggregate performance reporting |
| Affiliate | Own profile, own stock-transfer history, submit own sales, view own performance/earnings and public-to-affiliates leaderboard |
| Stockist | Not a separate v1 login role; stockist/source can be recorded by management. A restricted role can be added later if operationally needed |

The manager must not be able to promote themselves, alter their permissions, approve sales, change financial terms or access bank details.

## 5. Experience and route plan

- `/affiliates`: explain the new reseller and commission models, eligibility and approval process; remove legacy creator/referral promises and the old 15% claim.
- `/affiliate`: authenticated affiliate portal with sales entry, stock, targets, level, earnings, leaderboard, resources and announcements.
- `/admin/affiliates`: application review and member administration.
- `/admin/partners` (or a deliberate replacement route): stock transfers, sale verification, programme configuration and reporting.
- Dedicated manager view: team activity, onboarding/reactivation, weekly scorecard and monthly performance.
- Preserve existing storefront and unrelated admin routes.

## 6. Security and data integrity requirements

- RLS on every new table in the exposed `public` schema.
- Explicit table grants: Supabase no longer automatically exposes new public-schema tables through the Data API by default. Grant only the required roles and rely on RLS for row-level access.
- Use active admin-profile roles from the database for authorisation. Never trust user-editable auth metadata for permissions.
- Sensitive bank fields must be isolated and not selected by affiliate/manager clients.
- Prefer narrow, authenticated RPCs for privileged state transitions. Any security-definer function must have a fixed safe search path, explicit caller/role checks and tightly scoped EXECUTE grants.
- Enforce stock availability, payment eligibility, approval actor, duplicate protection and financial calculations in the database—not only in the browser.
- No service-role or secret key in client-side code or `NEXT_PUBLIC_*` variables.
- Keep financial records immutable; use reversals/adjustments rather than deletion.

## 7. Legacy transition

- New programme records start at official launch; no historical affiliate sales are migrated into the new performance system.
- Existing applications, partner profiles, referral clicks, commissions, tasks, submissions, appeals and audit records remain retained for historical reference.
- Remove legacy referral-first content and actions from active public/member/admin interfaces after replacement routes are ready.
- Do not drop old tables or functions as part of the initial rollout. Archive/deprecate them in a later, separately reviewed cleanup after the new system has been proven and retention requirements checked.

## 8. Known repository/database safeguards

- Work is isolated to this feature branch. Render production deployment must not be triggered by direct changes to `main`.
- The Supabase project currently inspected is the existing live project. No schema changes have been applied for this rebuild.
- The recorded database migration history currently ends at `20261124151616`; the repository contains later financial-control migrations dated `20261124152000`, `20261124152500` and `20261124154000` that are not listed in the database migration history. These must be reconciled against the actual live schema before any migration push.
- The repository also contains an affiliate-manager performance migration whose recorded history is not a one-to-one match with the deployed database history. The manager function exists in the database, so do not reapply that migration blindly.
- The README's checkout readiness statement is stale relative to several later feature files; use inspected implementation and deployed schema rather than the README alone.

## 9. Business decisions still required before live financial activation

1. **Commission affiliate settlement:** when a commission affiliate receives customer payment, do they remit the sale proceeds to eCuisinefoods, or does eCuisinefoods collect payment directly?
2. **Reseller settlement:** confirm that reseller buys/collects stock at the approved reseller price and retains the customer payment, with margin equal to selling price less acquisition price.
3. **Rates:** commission percentages for Beginner, Intermediate and Advanced.
4. **Targets:** target metric (sales value, units, or both) and monthly threshold for each level.
5. **Leader rewards:** thresholds and amounts for monthly performance payment.
6. **Payout schedule:** frequency, minimum payout, and approval/recording process.
7. **Returns/exchanges:** no refunds was the stated policy; confirm whether product exchanges or damaged/short-stock adjustments are allowed.
8. **Sale evidence:** accepted proof/reference types and when stockist confirmation is required.

These values can be represented as configurable settings during development, but the portal must not calculate or promise real payouts until they are approved.

## 10. Delivery sequence

1. Finish schema and migration-history review; create an isolated development database environment before applying DDL.
2. Build and test applications, membership, roles and secure profile access.
3. Build stock transfers and affiliate stock ledger.
4. Build sale submission, admin verification and audit trail.
5. Add configurable targets, levels, earnings, leaderboard and manager scorecard.
6. Add announcements, campaigns, training and onboarding/reactivation tools.
7. Run security review, functional tests and the 14-day controlled pilot.
8. Merge to `main` and deploy only after user review and pilot approval.
