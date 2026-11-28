# Affiliate Programme v1 — Release Readiness

## Implemented on the feature branch

- New public application process for reseller and commission-based applicants.
- Owner-only application review and account activation after verified Supabase Auth invitation.
- Private affiliate portal with sales submission, target summary, stock history, announcements, learning resources and leaderboard.
- Affiliate-owned payout detail maintenance through narrowly scoped RPCs; direct bank-detail table access remains owner-only.
- Owner-managed stock transfers with payment/receipt confirmation.
- Affiliate sale submission and owner-only verification, including reseller stock availability checks.
- Affiliate Sales & Growth Manager workspace with team roster, verified sales aggregates, target progress, follow-up notes and monthly scorecards.
- Owner controls for per-affiliate monthly targets, audited level changes and manual leader reward review/payment status.
- Restricted navigation and database permissions for the affiliate_manager role.
- Legacy referral records remain separate and are not used for new programme performance.

## Automated checks

The feature-branch GitHub Actions workflow now runs:
1. TypeScript validation.
2. Targeted affiliate ESLint checks.
3. Next.js production build.
4. Disposable PostgreSQL 17 migration test using a minimal Supabase-compatible auth/admin/product schema.

The migration test applies the six new affiliate programme migrations in order and asserts that the key programme tables and RPCs exist. It does not alter the live Supabase project.

## Commercial decisions still required

These are intentionally not guessed or hard-coded:

1. **Commission settlement:** whether commission affiliates collect customer funds and remit them to eCuisinefoods, or whether eCuisinefoods collects customer payment directly.
2. **Commission rates:** exact Beginner, Intermediate and Advanced rates, after margin review.
3. **Reseller margin costing:** how a sold unit is matched to its stock acquisition cost when an affiliate has received stock at different prices (for example, FIFO or weighted-average costing).
4. **Target benchmarks:** default monthly sales/unit targets for each level and model. Individual monthly targets can already be assigned by the owner.
5. **Manager reward framework:** thresholds and amounts. The owner can already record and approve a manually reviewed reward.
6. **Payout cadence:** when approved earnings/rewards are paid.

Until commission settlement is agreed, commission-based sale approval is deliberately blocked. Reseller margin earnings are also not auto-calculated until the acquisition-cost allocation method is approved. No commission rate, target benchmark or reward amount is pre-filled.

## Live release requirements

Before production release:
- Review and apply the six new migrations to the live Supabase project in order.
- Assign the Affiliate Sales & Growth Manager role to the selected person only after the migration is installed.
- Create/confirm the affiliate manager account and test owner/manager/affiliate access boundaries.
- Run the 5–8 affiliate, 14-day controlled pilot before the official programme launch.
- Set the official programme start date. New programme performance begins from that date; historical legacy sales are not migrated.
- Merge the approved feature branch into `main`. The connected Render service is configured to auto-deploy commits to `main`.

## Current production state

No new affiliate programme migration has been applied to live Supabase. No feature-branch code has been merged into `main`. No Render deployment has been triggered. The current production website remains unchanged.
