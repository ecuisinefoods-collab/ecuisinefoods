# Affiliate Programme Foundation — Test Plan

This plan applies to `20261128120000_affiliate_program_foundation.sql`. The migration is a draft on the feature branch and has not been applied to any database.

## Preflight
- Confirm the target is a disposable local/test database, never the live project.
- Apply migrations in order and confirm the schema is created without errors.
- Confirm all new tables have RLS enabled and explicit authenticated/anon grants match this migration.
- Confirm the legacy affiliate tables and rows are unchanged.

## Role and access matrix

| Scenario | Expected result |
|---|---|
| Anonymous visitor submits an application with `user_id = null` | Insert succeeds |
| Anonymous visitor reads applications | Denied |
| Anonymous visitor updates or deletes applications | Denied |
| Authenticated applicant submits an application with `user_id = auth.uid()` | Insert succeeds |
| Applicant reads their own application | Allowed |
| Applicant reads another applicant's application | Denied |
| Affiliate reads own membership | Allowed |
| Affiliate reads another member's profile | Denied |
| Affiliate reads own stock transfer and items | Allowed |
| Affiliate reads another member's stock transfers | Denied |
| Affiliate reads own sales and sale items | Allowed |
| Affiliate reads another member's sales | Denied |
| Affiliate inserts a sale for their own active membership in pending verification | Allowed |
| Affiliate inserts a sale for another member | Denied |
| Affiliate inserts a sale as already approved or with review metadata | Denied |
| Affiliate updates or deletes a sale after submission | Denied |
| Affiliate reads and updates own payout details | Allowed |
| Affiliate reads or updates another member's payout details | Denied |
| Manager/non-owner reads payout details | Denied |
| Manager/non-owner changes stock transfer, verifies sale, or reads audit log | Denied |
| Owner reads and manages programme records | Allowed |

## Integrity and workflow tests
- Application email is normalised by the application before insert; duplicate applications are reviewed operationally rather than silently merged.
- Affiliate code and sale/transfer numbers are unique.
- Quantities must be positive; prices cannot be negative.
- Invalid affiliate model, level, member status, payment status and sale status are rejected by constraints.
- Sale rows and stock-transfer rows cannot be hard-deleted due to restrictive foreign keys.
- Only approved, paid, verified sales are eligible for performance calculations in the next phase; the current foundation intentionally does not calculate commissions, margins, targets or payouts.
- Reseller available stock must later be derived from confirmed transfers less approved sold quantities and authorised adjustments; it must not be maintained as a second un-reconciled counter.

## Known limits of this first migration
- It establishes the first programme data foundation, not the complete portal.
- It does not yet implement database-enforced stock balance checks, atomic sale approval, earnings, commission rate history, monthly target snapshots, levels, leaderboard, leader rewards, manager tools, announcements or training resources.
- The owner-only policy currently uses the existing active `admin_profiles.role = 'owner'` identity. The manager role and its restricted permissions must be designed in a later migration.
- The database migration is not approved for production until these tests pass in an isolated test database and all outstanding commercial settlement decisions are resolved.
