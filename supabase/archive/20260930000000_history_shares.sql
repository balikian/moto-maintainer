-- Run this in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- It is safe to run more than once.
--
-- Share links for a bike's service history. The owner creates a link with a
-- long random token; anyone with the link can view that one bike's history
-- (read-only) until the owner turns the link off.

-- ---------------------------------------------------------------------------
-- 1. Table of share links (only the owner can see or change their links)
-- ---------------------------------------------------------------------------

create table if not exists public.history_shares (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  user_id uuid not null references auth.users (id) on delete cascade,
  motorcycle_id uuid not null references public.motorcycles (id) on delete cascade,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists history_shares_motorcycle_id_idx on public.history_shares (motorcycle_id);

alter table public.history_shares enable row level security;

drop policy if exists "Owners manage their share links" on public.history_shares;
create policy "Owners manage their share links" on public.history_shares
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.motorcycles m
      where m.id = motorcycle_id and m.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Public read of one shared history, by token
-- ---------------------------------------------------------------------------
-- Visitors aren't signed in, so row-level security would hide everything from
-- them. This function runs with the table owner's rights ("security definer")
-- but only ever returns the bike and service logs behind one active token,
-- and nothing about the owner. It returns null for unknown or revoked tokens.

create or replace function public.get_shared_history(share_token text)
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object(
    'bike', json_build_object(
      'year', m.year,
      'make', m.make,
      'model', m.model,
      'current_mileage', m.current_mileage
    ),
    'unit_system', coalesce(p.unit_system, 'imperial'),
    'logs', coalesce((
      select json_agg(
        json_build_object(
          'id', l.id,
          'task_id', l.task_id,
          'task_name', l.task_name,
          'performed_at', l.performed_at,
          'odometer_at_service', l.odometer_at_service,
          'cost', l.cost,
          'notes', l.notes
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

revoke all on function public.get_shared_history(text) from public;
grant execute on function public.get_shared_history(text) to anon, authenticated;
