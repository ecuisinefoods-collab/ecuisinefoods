# Affiliate Programme Performance and Engagement Test Plan

This plan applies to `20261128123000_affiliate_program_performance_and_engagement.sql`. It is a feature-branch draft and has not been applied to any database.

## Configuration safety
- Newly inserted level rules are inactive by default.
- An active rule must define at least one monthly target metric.
- An active commission-model rule must have an explicitly approved commission percentage.
- No commission percentage, monthly target, leader reward or payout schedule is assumed by this migration.
- Effective dates cannot run backwards and one active rule per model/level is allowed.

## Member privacy
- An active member can read only their own monthly target, level history and earnings.
- An active member can read published announcements and resources for their own affiliate model or all members.
- An inactive/suspended member cannot read active programme rules, announcements or resources through the member policies.
- An affiliate cannot read another member's targets, earnings, level history or private manager scorecard.
- A manager/non-owner cannot read leader rewards or scorecards until a later dedicated, limited-access design is added.

## Financial integrity
- Earning amounts, member/sale links, earning type, currency and calculation snapshot cannot be edited after creation.
- Earning records cannot be deleted; corrections must use a reversal/adjustment record.
- Only owner can insert or change earnings and leader rewards.
- Approved/payable/paid earnings require approval actor and timestamp.
- Paid earnings require payment actor and timestamp.
- Reward approvals and payouts require actor and timestamp.

## Important unimplemented behaviour
- This migration stores rules, targets, earnings and scorecards; it does not calculate them.
- It does not yet define how customer funds are settled for commission affiliates or resellers.
- It does not implement atomic sale verification, stock consumption, target progress, level promotion, leaderboard aggregation, manager role permissions or WhatsApp/email notifications.
- Those functions require a separate reviewed database logic and role design before the programme can be used for live transactions.
