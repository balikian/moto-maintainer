-- Bike specs (lib/specs.ts): the numbers a rider looks up again and again,
-- like oil grade and amount, tire pressures and torques.
--
-- The manual's values are shared per model in model_specs, submitted
-- 'pending' and approved by an admin like model_schedules. Each bike keeps
-- its own values on top in motorcycles.specs ({ values, custom }), which the
-- existing motorcycles policies already limit to the owner. Server actions
-- check the shape (cleanBikeSpecs); the database only caps the size.

alter table public.motorcycles
  add column specs jsonb not null default '{}'::jsonb,
  add constraint motorcycles_specs_check check (jsonb_typeof(specs) = 'object' and pg_column_size(specs) <= 32768);

create table public.model_specs (
  id uuid primary key default gen_random_uuid(),
  make text not null check (length(btrim(make)) > 0),
  model text not null check (length(btrim(model)) > 0),
  year_from integer not null check (year_from between 1900 and 2100),
  year_to integer not null check (year_to between 1900 and 2100),
  -- { "<spec key>": { "text": … } or { "value": …, "max": …, "unit": … }, with the manual's "page" }
  specs jsonb not null default '{}'::jsonb check (jsonb_typeof(specs) = 'object' and pg_column_size(specs) <= 32768),
  source text check (length(source) <= 300),
  manual_id uuid references public.bike_manuals(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  submitted_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  reviewed_at timestamp with time zone,
  check (year_from <= year_to)
);

create index model_specs_make_model_idx on public.model_specs (lower(make), lower(model));

alter table public.model_specs enable row level security;

create policy "Read approved or own specs" on public.model_specs for select to authenticated
  using (status = 'approved' or submitted_by = (select auth.uid()) or (select public.is_app_admin()));

create policy "Submit specs" on public.model_specs for insert to authenticated
  with check (submitted_by = (select auth.uid()) and (status = 'pending' or (select public.is_app_admin())));

create policy "Admins review specs" on public.model_specs for update to authenticated
  using ((select public.is_app_admin())) with check ((select public.is_app_admin()));

create policy "Delete own pending specs" on public.model_specs for delete to authenticated
  using ((select public.is_app_admin()) or (submitted_by = (select auth.uid()) and status = 'pending'));

grant select, insert, update, delete on table public.model_specs to authenticated;
