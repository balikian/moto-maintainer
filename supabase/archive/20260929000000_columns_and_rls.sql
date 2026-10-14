-- Run this in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- It is safe to run more than once.
--
-- 1. Adds columns the app needs that don't exist yet.
-- 2. Turns on row-level security (RLS) so each user can only see and change
--    their own bikes, tasks, service logs, and profile.

-- ---------------------------------------------------------------------------
-- 1. Missing columns
-- ---------------------------------------------------------------------------

-- Notes on custom maintenance tasks ("Add Custom Task" fails without this).
alter table public.maintenance_tasks add column if not exists notes text;

-- Light/dark preference, next to the existing unit_system column.
alter table public.profiles add column if not exists theme text not null default 'dark';

-- unit_system: store exactly 'imperial' or 'metric', which is what the app
-- writes. Existing values like 'mi' / 'km' are converted; anything else
-- becomes 'imperial'. First drop any old check constraint on the column.
do $$
declare
  existing record;
begin
  for existing in
    select con.conname
    from pg_constraint con
    join pg_attribute att on att.attrelid = con.conrelid and att.attnum = any (con.conkey)
    where con.conrelid = 'public.profiles'::regclass
      and con.contype = 'c'
      and att.attname = 'unit_system'
  loop
    execute format('alter table public.profiles drop constraint %I', existing.conname);
  end loop;
end $$;

alter table public.profiles alter column unit_system drop default;
alter table public.profiles
  alter column unit_system type text
  using case
    when lower(unit_system::text) in ('metric', 'km', 'kilometers', 'kilometres') then 'metric'
    else 'imperial'
  end;
alter table public.profiles alter column unit_system set default 'imperial';
alter table public.profiles
  add constraint profiles_unit_system_check check (unit_system in ('imperial', 'metric'));

-- ---------------------------------------------------------------------------
-- 2. Row-level security
-- ---------------------------------------------------------------------------

alter table public.motorcycles enable row level security;
alter table public.maintenance_tasks enable row level security;
alter table public.service_logs enable row level security;
alter table public.profiles enable row level security;

-- motorcycles: a user owns the rows where user_id is their id.
drop policy if exists "Owners manage their motorcycles" on public.motorcycles;
create policy "Owners manage their motorcycles" on public.motorcycles
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- maintenance_tasks: must be the owner, and the bike must be theirs too.
drop policy if exists "Owners manage their maintenance tasks" on public.maintenance_tasks;
create policy "Owners manage their maintenance tasks" on public.maintenance_tasks
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.motorcycles m
      where m.id = motorcycle_id and m.user_id = (select auth.uid())
    )
  );

-- service_logs: same rule as tasks.
drop policy if exists "Owners manage their service logs" on public.service_logs;
create policy "Owners manage their service logs" on public.service_logs
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.motorcycles m
      where m.id = motorcycle_id and m.user_id = (select auth.uid())
    )
  );

-- profiles: the row's id is the user's id.
drop policy if exists "Owners manage their profile" on public.profiles;
create policy "Owners manage their profile" on public.profiles
  for all to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ---------------------------------------------------------------------------
-- Check: list every policy on these tables. Anything besides the four above
-- (for example an old "allow all" policy) is worth a look, because Postgres
-- combines policies with OR and a permissive one would override these.
-- ---------------------------------------------------------------------------
select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename in ('motorcycles', 'maintenance_tasks', 'service_logs', 'profiles')
order by tablename, policyname;
