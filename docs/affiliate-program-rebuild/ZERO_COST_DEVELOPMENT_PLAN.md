# Zero-Additional-Cost Development and Testing Plan

**Applies to:** eCuisinefoods affiliate programme rebuild  
**Branch:** `feature/affiliate-program-rebuild`  
**Policy:** Do not create a paid Supabase branch, add paid infrastructure, or modify the live database as part of development without explicit approval.

## Recommended approach

Use the existing GitHub feature branch and the free local development tools first.

### 1. Code and UI work
- Continue building application code and SQL migration files in the feature branch.
- Keep all work isolated from `main`; Render production auto-deploy must not be triggered by feature-branch commits.
- Add automated type-check, lint and production-build checks. The current package scripts provide `build` and `lint`; add a type-check script and test scripts as the programme gains test coverage.
- Use GitHub Actions only within the repository's available free allowance. Do not add paid runners or third-party paid test services.

### 2. Local database testing
- Use the Supabase CLI and local Supabase stack (Docker) on the developer's machine where available. These are free tools, but Docker/local machine resources are required.
- Keep schema changes as versioned migration files in the repository.
- Seed only synthetic test users, products, stock transfers and sales. Never copy real customer, affiliate bank or production personal data into local tests.
- Test RLS and database constraints with separate simulated roles: unauthenticated, affiliate, manager, finance/authorised admin and owner.
- Verify the critical cases: affiliate can only access own records; manager can see permitted aggregate team data but cannot approve sales or access bank details; only owner/authorised administrator can approve/reject sales; duplicate submissions and over-selling are rejected; only approved eligible paid sales count towards performance.

### 3. If local Docker is unavailable
- Continue building the UI, business logic, SQL migrations and static checks without a hosted database.
- Use SQL review and mocked Supabase responses for non-security UI work.
- Do not treat mocks as proof that RLS, triggers, database functions or financial calculations are secure.
- Defer end-to-end database verification until a free local PostgreSQL/Supabase-compatible environment is available. Do not silently fall back to production.

### 4. Production safeguards
- The existing Supabase project is the live project. Do not run migrations, create or alter tables, change RLS/grants, insert test data, or alter auth users there during development.
- Before any future production migration: review SQL, confirm backup/recovery, reconcile the migration ledger, produce a before/after plan, and obtain explicit approval.
- Never use production as a staging environment.
- Do not create a paid Supabase branch unless the user later explicitly approves its cost.

## Cost boundary

This approach adds no new recurring hosting/database service by default. Local development may use the user's existing computer and already-installed tools. GitHub Actions usage depends on the account's included allowance. If a needed tool or usage would introduce a charge, stop and explain before proceeding.

## Immediate next steps

1. Review repository configuration and current app architecture.
2. Add a documented local setup and test workflow.
3. Build new affiliate programme code and migrations on the feature branch.
4. Validate TypeScript, lint and production build.
5. Test database migrations and RLS locally when local Supabase is available.
6. Keep the pilot and production release blocked until the database security tests and outstanding commercial rules are resolved.
