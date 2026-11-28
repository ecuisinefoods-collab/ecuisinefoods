-- Targeted rollback snapshot for the legacy affiliate access-policy migration.
-- Copies the affected legacy application rows and access metadata into the private schema.
-- This is not a full database backup; it preserves the specific objects changed by the next migrations.

begin;

create table if not exists private.affiliate_applications_backup_20261128 as
select * from public.affiliate_applications;

create table if not exists private.affiliate_applications_policies_backup_20261128 as
select
  now() as captured_at,
  schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname='public' and tablename='affiliate_applications';

create table if not exists private.affiliate_applications_grants_backup_20261128 as
select now() as captured_at, grantee, privilege_type, table_name
from information_schema.role_table_grants
where table_schema='public' and table_name='affiliate_applications'
union all
select now() as captured_at, grantee, privilege_type, table_name
from information_schema.role_column_grants
where table_schema='public' and table_name='affiliate_applications';

create table if not exists private.admin_profiles_role_constraint_backup_20261128 as
select now() as captured_at, conname, pg_get_constraintdef(oid) as constraint_definition
from pg_constraint
where conrelid='public.admin_profiles'::regclass and contype='c';

revoke all on private.affiliate_applications_backup_20261128 from public, anon, authenticated;
revoke all on private.affiliate_applications_policies_backup_20261128 from public, anon, authenticated;
revoke all on private.affiliate_applications_grants_backup_20261128 from public, anon, authenticated;
revoke all on private.admin_profiles_role_constraint_backup_20261128 from public, anon, authenticated;

comment on table private.affiliate_applications_backup_20261128 is
  'Targeted private rollback snapshot of legacy affiliate application rows before retiring legacy application access.';
comment on table private.affiliate_applications_policies_backup_20261128 is
  'Targeted private rollback snapshot of legacy affiliate application RLS policies.';
comment on table private.affiliate_applications_grants_backup_20261128 is
  'Targeted private rollback snapshot of legacy affiliate application table and column grants.';
comment on table private.admin_profiles_role_constraint_backup_20261128 is
  'Targeted private rollback snapshot of admin profile role check constraints before affiliate manager role changes.';

commit;
