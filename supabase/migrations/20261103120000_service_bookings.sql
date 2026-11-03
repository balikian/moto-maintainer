-- Booked service (lib/bookings.ts): a visit the rider has scheduled for a
-- bike, at a shop or at home: the day, an optional time, the tasks it covers
-- and notes. Removed when the rider logs it or cancels it. The two-column
-- foreign keys keep a booking on its owner's own bike and shop; a removed
-- shop leaves the booking without one.

alter table public.motorcycles
  add constraint motorcycles_id_user_key unique (id, user_id);

create table public.service_bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  motorcycle_id uuid not null,
  shop_id uuid,
  booked_on date not null,
  -- The shop's local time, as the rider typed it; null for just the day.
  booked_time time without time zone,
  -- The bike's tasks it covers. Ids of tasks deleted since are skipped when shown.
  task_ids uuid[] not null default '{}' check (cardinality(task_ids) <= 200),
  notes text check (char_length(notes) <= 1000),
  created_at timestamp with time zone not null default now(),
  foreign key (motorcycle_id, user_id) references public.motorcycles (id, user_id) on delete cascade,
  foreign key (shop_id, user_id) references public.shops (id, user_id) on delete set null (shop_id)
);

create index service_bookings_motorcycle_id_idx on public.service_bookings (motorcycle_id, booked_on);
create index service_bookings_shop_id_idx on public.service_bookings (shop_id);

alter table public.service_bookings enable row level security;

create policy "Owners manage their bookings" on public.service_bookings to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on table public.service_bookings to authenticated;

comment on table public.service_bookings is 'Service a rider has booked for a bike: day, optional time, shop, tasks, notes.';
