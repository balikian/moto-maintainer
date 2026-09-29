-- Run this in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- It is safe to run more than once.
--
-- Removes the older per-action RLS policies. Postgres combines policies with
-- OR, so any looser old policy would override the owner-only ones created in
-- 20260929000000_columns_and_rls.sql. Those four "Owners manage ..." policies
-- cover select, insert, update, and delete, so the app keeps working.

-- motorcycles
drop policy if exists "Users can view their own motorcycles" on public.motorcycles;
drop policy if exists "Users can insert their own motorcycles" on public.motorcycles;
drop policy if exists "Users can update their own motorcycles" on public.motorcycles;
drop policy if exists "Users can delete their own motorcycles" on public.motorcycles;

-- maintenance_tasks
drop policy if exists "Users can view their own tasks" on public.maintenance_tasks;
drop policy if exists "Users can insert their own tasks" on public.maintenance_tasks;
drop policy if exists "Users can update their own tasks" on public.maintenance_tasks;
drop policy if exists "Users can delete their own tasks" on public.maintenance_tasks;

-- service_logs
drop policy if exists "Users can view service logs for their own bikes" on public.service_logs;
drop policy if exists "Users can insert their own service logs" on public.service_logs;
drop policy if exists "Users can delete their own service logs" on public.service_logs;

-- profiles
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

-- Check: this should now list exactly four policies, one per table.
select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename in ('motorcycles', 'maintenance_tasks', 'service_logs', 'profiles')
order by tablename, policyname;
