-- Run this in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- It is safe to run more than once.
--
-- Makes and models riders typed in because they weren't in the bike list
-- (for example "Norden 901 Expedition"). Once an admin approves one, it shows
-- up in everyone's make/model dropdowns.

create table if not exists public.custom_models (
  id uuid primary key default gen_random_uuid(),
  make text not null check (length(btrim(make)) between 1 and 60),
  model text not null check (length(btrim(model)) between 1 and 80),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  submitted_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- One row per make + model, however it's capitalized or spaced.
create unique index if not exists custom_models_make_model_key
  on public.custom_models (lower(btrim(make)), lower(btrim(model)));

alter table public.custom_models enable row level security;

drop policy if exists "Read approved or own custom models" on public.custom_models;
create policy "Read approved or own custom models" on public.custom_models
  for select to authenticated
  using (status = 'approved' or submitted_by = (select auth.uid()) or (select public.is_app_admin()));

drop policy if exists "Submit custom models" on public.custom_models;
create policy "Submit custom models" on public.custom_models
  for insert to authenticated
  with check (submitted_by = (select auth.uid()) and (status = 'pending' or (select public.is_app_admin())));

drop policy if exists "Admins review custom models" on public.custom_models;
create policy "Admins review custom models" on public.custom_models
  for update to authenticated
  using ((select public.is_app_admin()))
  with check ((select public.is_app_admin()));

drop policy if exists "Admins delete custom models" on public.custom_models;
create policy "Admins delete custom models" on public.custom_models
  for delete to authenticated
  using ((select public.is_app_admin()));
