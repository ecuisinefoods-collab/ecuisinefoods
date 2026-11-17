-- Affiliate account action history and appeal workflow.
create table if not exists public.affiliate_account_actions (
 id uuid primary key default gen_random_uuid(),
 partner_profile_id uuid not null references public.partner_profiles(id) on delete cascade,
 actor_user_id uuid references auth.users(id) on delete set null,
 actor_email text, action text not null, previous_status text, new_status text, reason text,
 details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index if not exists affiliate_account_actions_partner_created_idx on public.affiliate_account_actions(partner_profile_id,created_at desc);
alter table public.affiliate_account_actions enable row level security;
revoke all on public.affiliate_account_actions from anon,authenticated;
grant select on public.affiliate_account_actions to authenticated;
drop policy if exists "Partners and admins can read affiliate account actions" on public.affiliate_account_actions;
create policy "Partners and admins can read affiliate account actions" on public.affiliate_account_actions for select to authenticated
using (exists(select 1 from public.partner_profiles p where p.id=affiliate_account_actions.partner_profile_id and p.user_id=(select auth.uid()))
 or (select private.has_admin_role(array['owner','store_manager','marketing_manager','analyst'])));

create table if not exists public.affiliate_appeals (
 id uuid primary key default gen_random_uuid(),
 partner_profile_id uuid not null references public.partner_profiles(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 appeal_text text not null check(char_length(btrim(appeal_text)) between 30 and 3000),
 status text not null default 'pending' check(status in ('pending','reviewing','upheld','reinstated','rejected')),
 admin_response text, reviewed_by uuid references auth.users(id) on delete set null,
 reviewed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists affiliate_appeals_partner_created_idx on public.affiliate_appeals(partner_profile_id,created_at desc);
create unique index if not exists affiliate_appeals_one_open_per_partner_idx on public.affiliate_appeals(partner_profile_id) where status in ('pending','reviewing');
alter table public.affiliate_appeals enable row level security;
revoke all on public.affiliate_appeals from anon,authenticated;
grant select,update on public.affiliate_appeals to authenticated;
drop policy if exists "Partners and admins can read affiliate appeals" on public.affiliate_appeals;
create policy "Partners and admins can read affiliate appeals" on public.affiliate_appeals for select to authenticated
using(user_id=(select auth.uid()) or (select private.has_admin_role(array['owner','store_manager','marketing_manager'])));
drop policy if exists "Affiliate admins can review appeals" on public.affiliate_appeals;
create policy "Affiliate admins can review appeals" on public.affiliate_appeals for update to authenticated
using((select private.has_admin_role(array['owner','store_manager','marketing_manager'])))
with check((select private.has_admin_role(array['owner','store_manager','marketing_manager'])));

create or replace function public.submit_my_affiliate_appeal(p_appeal_text text) returns uuid
language plpgsql security definer set search_path=''
as $$
declare v_partner_id uuid; v_appeal_id uuid;
begin
 if auth.uid() is null then raise exception 'Sign in to submit an appeal.'; end if;
 if char_length(btrim(coalesce(p_appeal_text,'')))<30 or char_length(btrim(p_appeal_text))>3000 then raise exception 'Please explain your appeal in at least 30 characters (maximum 3,000).'; end if;
 select id into v_partner_id from public.partner_profiles where user_id=auth.uid() and status in ('suspended','banned') limit 1;
 if v_partner_id is null then raise exception 'An appeal is available only for a suspended or banned affiliate account.'; end if;
 insert into public.affiliate_appeals(partner_profile_id,user_id,appeal_text) values(v_partner_id,auth.uid(),btrim(p_appeal_text)) returning id into v_appeal_id;
 return v_appeal_id;
end;
$$;
revoke all on function public.submit_my_affiliate_appeal(text) from public,anon;
grant execute on function public.submit_my_affiliate_appeal(text) to authenticated;

create or replace function public.log_affiliate_account_status_change() returns trigger
language plpgsql security definer set search_path=''
as $$
begin
 if old.status is distinct from new.status then
  insert into public.affiliate_account_actions(partner_profile_id,actor_user_id,actor_email,action,previous_status,new_status,reason,details)
  values(new.id,auth.uid(),nullif(auth.jwt()->>'email',''),'status_changed',old.status,new.status,new.restriction_reason,
   jsonb_build_object('restricted_at',new.restricted_at,'deleted_at',new.deleted_at));
 end if;
 return new;
end;
$$;
drop trigger if exists partner_profile_status_audit on public.partner_profiles;
create trigger partner_profile_status_audit after update of status on public.partner_profiles for each row execute function public.log_affiliate_account_status_change();

create or replace function public.log_affiliate_appeal_review() returns trigger
language plpgsql security definer set search_path=''
as $$
begin
 if old.status is distinct from new.status then
  insert into public.affiliate_account_actions(partner_profile_id,actor_user_id,actor_email,action,previous_status,new_status,reason,details)
  values(new.partner_profile_id,auth.uid(),nullif(auth.jwt()->>'email',''),'appeal_reviewed',old.status,new.status,new.admin_response,
   jsonb_build_object('appeal_id',new.id,'reviewed_at',new.reviewed_at));
 end if;
 return new;
end;
$$;
drop trigger if exists affiliate_appeal_review_audit on public.affiliate_appeals;
create trigger affiliate_appeal_review_audit after update of status on public.affiliate_appeals for each row execute function public.log_affiliate_appeal_review();

-- Existing linked affiliates can see restrictions and appeal; first-time claims remain active-only.
create or replace function private.claim_ecuisine_partner_account() returns uuid
language plpgsql security definer set search_path=''
as $$
declare current_email text; confirmed_at timestamptz; claimed_id uuid;
begin
 if auth.uid() is null then raise exception 'Sign in before claiming your partner account.'; end if;
 select lower(email),email_confirmed_at into current_email,confirmed_at from auth.users where id=auth.uid();
 if current_email is null or confirmed_at is null then raise exception 'Confirm your email address before claiming your partner account.'; end if;
 select p.id into claimed_id from public.partner_profiles p join public.affiliate_applications a on a.id=p.application_id
 where p.user_id is null and p.status='active' and a.status='approved' and lower(a.email)=current_email order by a.created_at desc limit 1;
 if claimed_id is not null then
  update public.partner_profiles set user_id=auth.uid(),updated_at=now() where id=claimed_id and user_id is null returning id into claimed_id;
 end if;
 if claimed_id is null then select id into claimed_id from public.partner_profiles where user_id=auth.uid() limit 1; end if;
 if claimed_id is null then raise exception 'No approved eCuisine partner application matches this email.'; end if;
 return claimed_id;
end;
$$;
revoke all on function private.claim_ecuisine_partner_account() from public;
grant execute on function private.claim_ecuisine_partner_account() to authenticated;
