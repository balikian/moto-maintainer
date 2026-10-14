-- Run this in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- It is safe to run more than once.
--
-- Shared, per-model reference data that every rider benefits from:
--   * bike_manuals: links to owner's manuals
--   * model_schedules / model_schedule_tasks: manufacturer maintenance schedules
-- Riders can submit entries; they see their own submissions right away, and
-- everyone else sees them once an admin approves them.

-- ---------------------------------------------------------------------------
-- 1. Admins
-- ---------------------------------------------------------------------------
-- A separate table with no policies, so it can only be changed here in the SQL
-- Editor, never through the app. (A flag on `profiles` wouldn't work: users
-- can edit their own profile row.) To make yourself an admin, run:
--
--   insert into public.app_admins (user_id)
--   select id from auth.users where email = 'you@example.com';

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.app_admins enable row level security;

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.app_admins where user_id = (select auth.uid()));
$$;
revoke all on function public.is_app_admin() from public;
grant execute on function public.is_app_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Owner's manual links
-- ---------------------------------------------------------------------------
-- Make/model are matched case-insensitively against the rider's bike. One row
-- can cover a range of model years.

create table if not exists public.bike_manuals (
  id uuid primary key default gen_random_uuid(),
  make text not null check (length(btrim(make)) > 0),
  model text not null check (length(btrim(model)) > 0),
  year_from integer not null check (year_from between 1900 and 2100),
  year_to integer not null check (year_to between 1900 and 2100),
  url text not null check (url ~* '^https?://\S+$' and length(url) <= 2000),
  label text not null default 'Owner''s manual' check (length(label) between 1 and 120),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  submitted_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check (year_from <= year_to)
);
create index if not exists bike_manuals_make_model_idx on public.bike_manuals (lower(make), lower(model));

alter table public.bike_manuals enable row level security;

drop policy if exists "Read approved or own manuals" on public.bike_manuals;
create policy "Read approved or own manuals" on public.bike_manuals
  for select to authenticated
  using (status = 'approved' or submitted_by = (select auth.uid()) or (select public.is_app_admin()));

drop policy if exists "Submit manuals" on public.bike_manuals;
create policy "Submit manuals" on public.bike_manuals
  for insert to authenticated
  with check (submitted_by = (select auth.uid()) and (status = 'pending' or (select public.is_app_admin())));

drop policy if exists "Admins review manuals" on public.bike_manuals;
create policy "Admins review manuals" on public.bike_manuals
  for update to authenticated
  using ((select public.is_app_admin()))
  with check ((select public.is_app_admin()));

drop policy if exists "Delete own pending manuals" on public.bike_manuals;
create policy "Delete own pending manuals" on public.bike_manuals
  for delete to authenticated
  using ((select public.is_app_admin()) or (submitted_by = (select auth.uid()) and status = 'pending'));

-- ---------------------------------------------------------------------------
-- 3. Manufacturer maintenance schedules
-- ---------------------------------------------------------------------------
-- Intervals are stored in the manual's own unit (mi or km) and converted when
-- a bike's tasks are created, so nothing is lost to rounding.

create table if not exists public.model_schedules (
  id uuid primary key default gen_random_uuid(),
  make text not null check (length(btrim(make)) > 0),
  model text not null check (length(btrim(model)) > 0),
  year_from integer not null check (year_from between 1900 and 2100),
  year_to integer not null check (year_to between 1900 and 2100),
  source text check (length(source) <= 300),
  manual_id uuid references public.bike_manuals (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  submitted_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check (year_from <= year_to)
);
create index if not exists model_schedules_make_model_idx on public.model_schedules (lower(make), lower(model));

create table if not exists public.model_schedule_tasks (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.model_schedules (id) on delete cascade,
  task_name text not null check (length(btrim(task_name)) between 1 and 120),
  interval_distance integer not null default 0 check (interval_distance >= 0),
  distance_unit text not null default 'mi' check (distance_unit in ('mi', 'km')),
  interval_months integer not null default 0 check (interval_months >= 0),
  is_diy boolean not null default true,
  sort_order integer not null default 0
);
create index if not exists model_schedule_tasks_schedule_id_idx on public.model_schedule_tasks (schedule_id);

alter table public.model_schedules enable row level security;
alter table public.model_schedule_tasks enable row level security;

drop policy if exists "Read approved or own schedules" on public.model_schedules;
create policy "Read approved or own schedules" on public.model_schedules
  for select to authenticated
  using (status = 'approved' or submitted_by = (select auth.uid()) or (select public.is_app_admin()));

drop policy if exists "Submit schedules" on public.model_schedules;
create policy "Submit schedules" on public.model_schedules
  for insert to authenticated
  with check (submitted_by = (select auth.uid()) and (status = 'pending' or (select public.is_app_admin())));

drop policy if exists "Admins review schedules" on public.model_schedules;
create policy "Admins review schedules" on public.model_schedules
  for update to authenticated
  using ((select public.is_app_admin()))
  with check ((select public.is_app_admin()));

drop policy if exists "Delete own pending schedules" on public.model_schedules;
create policy "Delete own pending schedules" on public.model_schedules
  for delete to authenticated
  using ((select public.is_app_admin()) or (submitted_by = (select auth.uid()) and status = 'pending'));

-- Tasks follow their schedule: visible when the schedule is visible, editable
-- by admins or by the submitter while the schedule is still pending.
drop policy if exists "Read tasks of visible schedules" on public.model_schedule_tasks;
create policy "Read tasks of visible schedules" on public.model_schedule_tasks
  for select to authenticated
  using (exists (select 1 from public.model_schedules s where s.id = schedule_id));

drop policy if exists "Edit tasks of own pending schedules" on public.model_schedule_tasks;
create policy "Edit tasks of own pending schedules" on public.model_schedule_tasks
  for all to authenticated
  using (
    (select public.is_app_admin())
    or exists (
      select 1 from public.model_schedules s
      where s.id = schedule_id and s.submitted_by = (select auth.uid()) and s.status = 'pending'
    )
  )
  with check (
    (select public.is_app_admin())
    or exists (
      select 1 from public.model_schedules s
      where s.id = schedule_id and s.submitted_by = (select auth.uid()) and s.status = 'pending'
    )
  );
