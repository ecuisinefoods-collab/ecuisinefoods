# Affiliate Sales & Growth Manager Dashboard — Build Specification

**Working branch:** feature/affiliate-program-rebuild  
**Status:** Approved product direction; implementation pending role and database access verification.

## Purpose

Give the Affiliate Sales & Growth Manager a focused operational workspace for activating affiliates, supporting the existing community, driving verified sales and submitting a weekly/monthly performance report. The dashboard is a management tool, not a financial administration console.

## Dashboard sections

### 1. Team overview
Show:
- Total active programme members.
- Affiliates with at least one approved eligible sale in the current month.
- Affiliates with no approved sale in the current month.
- Number and percentage of assigned monthly targets achieved.
- New members activated in the current month.
- Re-activated members (previously inactive, now recording eligible verified sales).

All figures must be calculated from the new programme's records only, beginning on the official launch date. Do not mix in historical legacy referral records.

### 2. Affiliate team register
Provide search and filters for:
- Affiliate name/code.
- Reseller or commission model.
- Beginner, Intermediate or Advanced level.
- Active, onboarding, inactive or other configured status.
- Current-month activity and target progress.

A manager may view ordinary contact details needed for follow-up (name, phone and location), programme model, activation date, level and verified performance. Never expose bank/account details, payout credentials, customer personal data, private payment evidence or unrestricted financial records.

### 3. Performance and target tracking
For each affiliate, show only source-backed values:
- Approved eligible sales value and units for the selected month.
- Assigned sales-value and/or unit target.
- Progress percentage only where the corresponding target exists and is greater than zero.
- Current level and any recorded level history.
- Pending sale submissions as a separate operational count; pending submissions must not be counted as achieved sales.

Do not calculate commission payouts, reseller margins or leader bonuses in this dashboard. Those depend on outstanding settlement, rate and reward decisions and must remain owner-controlled.

### 4. Reactivation workspace
Identify affiliates with no approved eligible sale during the configured activity window. Support manager-entered follow-up notes and follow-up dates, with a clear distinction between:
- Not yet contacted.
- Contacted.
- Interested / onboarding.
- Reactivated (confirmed by eligible approved activity).
- Not interested / follow-up closed.

The manager may recommend status changes but must not independently deactivate, remove or reactivate account access unless a separately approved permission is implemented.

### 5. Recruitment and onboarding
Track:
- New applications awaiting owner review (read-only).
- Approved applicants awaiting account activation.
- Newly activated affiliates.
- Recruits who have achieved their first monthly target.

The manager can coordinate contact, onboarding and training. Application decisions and account activation remain owner-only. Recruitment counts alone do not qualify for rewards.

### 6. Weekly scorecard and monthly report
Capture or calculate:
- Group verified sales value and units.
- Number of affiliates with approved eligible sales.
- Number and share of assigned targets achieved.
- Inactive affiliates contacted.
- Affiliates reactivated.
- New recruits activated.
- Recruits achieving their first monthly target.
- Key obstacles, actions taken and next week's priorities.

Keep a dated, auditable record of submitted reports. Do not turn unverified claims or pending sales into performance credit.

### 7. Training and announcements
Provide links to approved training resources and published programme announcements. Product education must use verified product information only and must not introduce unsupported health claims.

## Permissions and security

The manager role must be explicitly confirmed against the live admin_profiles role model and the new programme's RLS policies before enabling access. Do not guess a role identifier or weaken policies to make the page work.

Manager access should be read-only for member performance and programme reporting, with narrowly scoped write access only for follow-up notes and weekly scorecards. The manager must not:
- Approve, reject, cancel or alter submitted sales.
- Record or confirm stock transfers.
- Change commission rates, targets, level rules or payout settings.
- View bank details, payout credentials or private customer data.
- Approve rewards or payouts.
- Change their own role or permissions.
- Delete or rewrite financial/audit records.

The database must enforce these boundaries. Hiding controls in the interface is not sufficient.

## Acceptance checks

1. An authorised manager can see the team dashboard and permitted aggregate/member information.
2. An affiliate cannot access manager routes or team records.
3. A manager cannot approve sales or stock transfers through direct API/RPC calls.
4. Bank details, payment evidence and customer personal data remain inaccessible to the manager.
5. Pending, rejected, unpaid and legacy sales do not count towards verified performance.
6. Target progress is blank/not assigned when no valid target exists; no artificial 0% or 100% is shown.
7. Reports and follow-up notes are attributable to the manager and timestamped.
8. Owner access and authority remain unchanged.

## Implementation gate

Before building the live dashboard, inspect the exact feature-branch migrations and current database role/policy definitions. Then add the smallest required manager read policies and narrow RPCs for follow-up notes and scorecards. Test the access matrix in an isolated database before any live migration. No production schema change or deployment is authorised by this specification.
