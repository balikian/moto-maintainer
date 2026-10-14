-- The bike each rider last picked, so it follows them across devices and
-- sign-ins. Removing that bike clears it. Safe to re-run.

alter table public.profiles
  add column if not exists active_bike_id uuid references public.motorcycles (id) on delete set null;
