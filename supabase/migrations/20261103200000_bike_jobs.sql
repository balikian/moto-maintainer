-- Repairs and upgrades (lib/jobs.ts): one-time jobs a rider means to do on a
-- bike, outside the recurring maintenance tasks. A repair is something broken
-- to fix; an upgrade is a mod or accessory, with an estimated cost and links to
-- the products being compared. A job is done when a service record points at
-- it (service_logs.job_id, at most one): deleting that record opens the job
-- again, and removing a done job leaves its record in the history, still
-- labelled a repair or upgrade (service_logs.job_kind).

create table public.bike_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  motorcycle_id uuid not null,
  kind text not null check (kind in ('repair', 'upgrade')),
  name text not null check (char_length(btrim(name)) between 1 and 200),
  notes text check (char_length(notes) <= 2000),
  estimated_cost numeric(10,2) check (estimated_cost >= 0),
  -- [{ "url": "https://…", "label": "Slip-on, $899" | null }], read through cleanJobLinks.
  links jsonb not null default '[]'
    check (jsonb_typeof(links) = 'array' and jsonb_array_length(links) <= 10 and octet_length(links::text) <= 8000),
  created_at timestamp with time zone not null default now(),
  unique (id, user_id),
  foreign key (motorcycle_id, user_id) references public.motorcycles (id, user_id) on delete cascade
);

create index bike_jobs_motorcycle_id_idx on public.bike_jobs (motorcycle_id);

alter table public.bike_jobs enable row level security;

create policy "Owners manage their repairs and upgrades" on public.bike_jobs to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on table public.bike_jobs to authenticated;

comment on table public.bike_jobs is 'Repairs and upgrades a rider plans for a bike: one-time jobs, not recurring tasks.';

alter table public.service_logs
  add column job_id uuid,
  add column job_kind text check (job_kind in ('repair', 'upgrade')),
  add constraint service_logs_job_fkey foreign key (job_id, user_id)
    references public.bike_jobs (id, user_id) on delete set null (job_id);

-- One service record per job: logging it is what marks it done.
create unique index service_logs_job_id_key on public.service_logs (job_id) where job_id is not null;

comment on column public.service_logs.job_id is 'The repair or upgrade this record finished; null for anything else, or once the job is removed.';
comment on column public.service_logs.job_kind is 'repair or upgrade when the record finished one (kept after the job is removed); null otherwise.';

-- The shared history labels repairs and upgrades too. Otherwise the same as
-- 20261030120000_shared_history_specs.sql; create or replace keeps the grants.
create or replace function public.get_shared_history(share_token text) returns json
    language sql stable security definer
    set search_path to ''
    as $$
  select json_build_object(
    'bike', json_build_object(
      'year', m.year,
      'make', m.make,
      'model', m.model,
      'current_mileage', m.current_mileage
    ),
    'unit_system', coalesce(p.unit_system, 'imperial'),
    'specs', coalesce(m.specs -> 'values', '{}'::jsonb),
    'manual_specs', coalesce((
      select ms.specs
      from public.model_specs ms
      where ms.status = 'approved'
        and lower(ms.make) = lower(btrim(m.make))
        and lower(ms.model) = lower(btrim(m.model))
        and m.year between ms.year_from and ms.year_to
      order by ms.year_to - ms.year_from, ms.created_at desc
      limit 1
    ), '{}'::jsonb),
    'logs', coalesce((
      select json_agg(
        json_build_object(
          'id', l.id,
          'task_id', l.task_id,
          'task_name', l.task_name,
          'performed_at', l.performed_at,
          'odometer_at_service', l.odometer_at_service,
          'cost', l.cost,
          'notes', l.notes,
          'shop', l.shop,
          'job_kind', l.job_kind
        )
        order by l.performed_at desc, l.created_at desc
      )
      from public.service_logs l
      where l.motorcycle_id = m.id
    ), '[]'::json)
  )
  from public.history_shares s
  join public.motorcycles m on m.id = s.motorcycle_id and m.user_id = s.user_id
  left join public.profiles p on p.id = s.user_id
  where s.token = share_token
    and s.revoked_at is null
    and length(share_token) >= 32;
$$;
