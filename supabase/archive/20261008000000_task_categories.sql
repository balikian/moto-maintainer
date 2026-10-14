-- Run this in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- It is safe to run more than once.
--
-- A category for each maintenance task (Brakes, Engine, ...), so related jobs
-- can be done together. Empty for older rows; the app guesses from the task
-- name until someone picks one. Keep this list in sync with lib/taskCategories.ts.

alter table public.maintenance_tasks add column if not exists category text;
alter table public.model_schedule_tasks add column if not exists category text;

alter table public.maintenance_tasks drop constraint if exists maintenance_tasks_category_check;
alter table public.maintenance_tasks add constraint maintenance_tasks_category_check
  check (category is null or category in (
    'engine', 'brakes', 'drivetrain', 'wheels', 'suspension', 'cooling', 'electrical', 'controls', 'other'
  ));

alter table public.model_schedule_tasks drop constraint if exists model_schedule_tasks_category_check;
alter table public.model_schedule_tasks add constraint model_schedule_tasks_category_check
  check (category is null or category in (
    'engine', 'brakes', 'drivetrain', 'wheels', 'suspension', 'cooling', 'electrical', 'controls', 'other'
  ));
