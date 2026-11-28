# Repository and Database Review Findings

**Date reviewed:** 28 November 2026  
**Branch:** `feature/affiliate-program-rebuild`  
**Scope:** Read-only inspection. No live database changes were made.

## Confirmed legacy behaviour

- `/affiliates` is a content-creator/referral application page and publicly promises a standard 15% commission.
- `/affiliate` is a referral/task dashboard. It calls the legacy partner-claim RPC, reads referral click/order stats and commission ledger data, and allows bank-detail updates.
- `/admin/affiliates` reviews the legacy creator application.
- `/admin/partners` manages referral profiles, referral commissions, creator tasks and submissions.
- The admin partners page includes an `affiliate_manager` role path backed by `get_admin_affiliate_performance()`. The database function currently exists and returns legacy referral metrics; it is not the new team-sales manager dashboard.
- These active experiences must be replaced by the new sales-based workflow. Existing underlying records remain retained.

## High-priority legacy data-access concern

The current `public.affiliate_applications` table stores `bank_name`, `bank_account_name` and `bank_account_number` alongside ordinary application data.

The database currently grants the `authenticated` role SELECT on those bank columns. The table also has a permissive SELECT RLS policy allowing owner, store manager and marketing manager roles to read application rows, plus a separate finance read policy. Because permissive policies are combined with OR semantics, the finance-only policy does not narrow the broader application-read policy. Therefore, the database policy design appears to permit marketing managers with application access to query bank columns directly, even though the current UI selects only non-bank fields.

**Required treatment in the replacement:** store payout details in a separate table with narrowly scoped RLS and grants for owner/finance-authorised access only. Never expose payout details in manager or affiliate views.

**Production caution:** this review did not change the live policy or move existing bank data. A separate, explicitly reviewed security migration is needed to harden the legacy table while preserving its existing bank details. Do not assume the frontend's selected columns are a security boundary.

## Migration-history reconciliation

- The live database's recorded migration list ends at `20261124151616`.
- The repository contains later files `20261124152000_financial_record_retention.sql`, `20261124152500_financial_approval_and_reversals.sql` and `20261124154000_restrict_order_and_cleanup_deletion.sql`, which are absent from the recorded history.
- The live schema already contains `financial_transactions.reversal_of_id`, an effect introduced by the 1525 migration. This demonstrates why simply applying missing migration files is unsafe: some SQL effects may already have been applied manually or through another path.
- The repository contains `20261118110000_add_affiliate_manager_performance_role.sql`, while the live history does not show that exact migration version; however, `public.get_admin_affiliate_performance()` exists in the live database. This migration must not be replayed blindly either.

**Next step:** compare each pending migration's intended objects with live columns, indexes, constraints, triggers, functions, policies, grants and function ACLs. Then decide whether to record a reconciled migration, create a corrective migration, or leave the effect untouched. This work must happen before any production migration push.

## Supabase platform note

Supabase's 28 April 2026 breaking-change notice states that new public-schema tables are no longer automatically exposed through the Data API (enforced for all projects from 30 October 2026). New programme tables therefore need deliberate Data API grants in addition to RLS. RLS remains mandatory for exposed tables.

## Current protection status

- Feature work remains on `feature/affiliate-program-rebuild`.
- The inspected Supabase project is the existing live project.
- No new programme tables, production data changes, destructive operations, merges or deployments have been performed.
