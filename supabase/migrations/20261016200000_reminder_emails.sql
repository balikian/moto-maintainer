-- Reminder emails (roadmap step 5). A daily job in the app (Vercel Cron →
-- /api/cron/reminders) reads what's due for every rider, sends one email
-- each through Resend, and records what it sent so nothing goes twice.
--
-- The app never holds the service-role key. Instead the job calls the
-- security definer functions below with a job secret: a random value made
-- here and kept in Vault, which the app has as CRON_SECRET. Each database
-- gets its own. To read it (SQL Editor):
--   select decrypted_secret from vault.decrypted_secrets where name = 'reminder_job_secret';

-- When each bike's odometer was last entered or confirmed, for the
-- "update your mileage" check-in. Any update that sets current_mileage
-- counts, even to the same reading (the rider confirming it).
alter table public.motorcycles
  add column odometer_updated_at timestamp with time zone not null default now();

-- Best guess for existing bikes: the latest of when the bike was added,
-- last edited, or last had service logged.
update public.motorcycles m
set odometer_updated_at = greatest(
  m.created_at,
  m.updated_at,
  coalesce((select max(l.created_at) from public.service_logs l where l.motorcycle_id = m.id), m.created_at)
);

create function public.touch_odometer_updated_at() returns trigger
    language plpgsql
    set search_path to ''
    as $$
begin
  new.odometer_updated_at := now();
  return new;
end;
$$;

create trigger motorcycles_touch_odometer
  before update of current_mileage on public.motorcycles
  for each row execute function public.touch_odometer_updated_at();

-- A private token per rider for the unsubscribe links in emails, so turning
-- reminders off works without signing in.
alter table public.profiles
  add column email_token uuid not null default gen_random_uuid();
create unique index profiles_email_token_key on public.profiles (email_token);

-- What the job has sent: one row per reminder, keyed by what it was about
-- (e.g. a task's "soon" for its current service cycle). No policies: only
-- the job's functions below read or write it.
create table public.notifications_sent (
    user_id uuid not null references auth.users(id) on delete cascade,
    key text not null check (length(key) between 1 and 200),
    sent_at timestamp with time zone not null default now(),
    primary key (user_id, key)
);
alter table public.notifications_sent enable row level security;

-- The job secret: 64 random hex characters.
select vault.create_secret(
  replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  'reminder_job_secret',
  'The reminder email job''s secret; the app has it as CRON_SECRET.'
);

create function public.reminder_job_allowed(job_secret text) returns boolean
    language sql stable security definer
    set search_path to ''
    as $$
  select exists (
    select 1 from vault.decrypted_secrets
    where name = 'reminder_job_secret' and decrypted_secret = job_secret
  );
$$;

-- Everything the job needs, for riders with a confirmed email and at least
-- one reminder turned on. Pass spend_from/spend_to (a month) to include each
-- bike's service count and spending in it, for the monthly summary.
create function public.reminder_job_data(job_secret text, spend_from date default null, spend_to date default null) returns json
    language plpgsql stable security definer
    set search_path to ''
    as $$
begin
  if not public.reminder_job_allowed(job_secret) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  return (
    select coalesce(json_agg(json_build_object(
      'user_id', p.id,
      'email', u.email,
      'email_token', p.email_token,
      'unit_system', coalesce(p.unit_system, 'imperial'),
      'task_reminders', p.email_task_reminders,
      'odometer_reminders', p.email_odometer_reminders,
      'monthly_summary', p.email_monthly_summary,
      'sent', coalesce((select json_agg(n.key) from public.notifications_sent n where n.user_id = p.id), '[]'::json),
      'bikes', coalesce((
        select json_agg(json_build_object(
          'id', m.id,
          'year', m.year,
          'make', m.make,
          'model', m.model,
          'current_mileage', m.current_mileage,
          'odometer_updated_at', m.odometer_updated_at,
          'tasks', coalesce((
            select json_agg(json_build_object(
              'id', t.id,
              'task_name', t.task_name,
              'interval_mileage', t.interval_mileage,
              'interval_months', coalesce(t.interval_months, 0),
              'last_performed_mileage', t.last_performed_mileage,
              'last_performed_date', t.last_performed_date
            ))
            from public.maintenance_tasks t
            where t.motorcycle_id = m.id
          ), '[]'::json),
          'spent', case when spend_from is null then null else (
            select json_build_object('services', count(*), 'total', coalesce(sum(l.cost), 0))
            from public.service_logs l
            where l.motorcycle_id = m.id
              and (l.performed_at at time zone 'UTC')::date >= spend_from
              and (l.performed_at at time zone 'UTC')::date < spend_to
          ) end
        ) order by m.created_at)
        from public.motorcycles m
        where m.user_id = p.id
      ), '[]'::json)
    )), '[]'::json)
    from public.profiles p
    join auth.users u on u.id = p.id
    where u.email is not null
      and u.email_confirmed_at is not null
      and u.deleted_at is null
      and (p.email_task_reminders or p.email_odometer_reminders or p.email_monthly_summary)
  );
end;
$$;

-- Records reminders as sent before the email goes out, and returns the keys
-- that weren't already there, so two runs can't send the same thing.
create function public.claim_reminders(job_secret text, rider uuid, keys text[]) returns text[]
    language plpgsql security definer
    set search_path to ''
    as $$
declare
  claimed text[];
begin
  if not public.reminder_job_allowed(job_secret) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  with inserted as (
    insert into public.notifications_sent (user_id, key)
    select rider, k from unnest(keys) as k
    on conflict do nothing
    returning key
  )
  select coalesce(array_agg(key), '{}') into claimed from inserted;
  return claimed;
end;
$$;

-- Undoes claim_reminders when the email couldn't be sent, so the next run
-- tries again.
create function public.release_reminders(job_secret text, rider uuid, keys text[]) returns void
    language plpgsql security definer
    set search_path to ''
    as $$
begin
  if not public.reminder_job_allowed(job_secret) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  delete from public.notifications_sent where user_id = rider and key = any(keys);
end;
$$;

-- The unsubscribe link: turns off one kind of reminder email ('daily': task
-- and odometer reminders; 'monthly'; or 'all') for the rider with this
-- token. Returns false for an unknown token.
create function public.unsubscribe_reminders(token uuid, kind text) returns boolean
    language plpgsql security definer
    set search_path to ''
    as $$
begin
  if kind not in ('daily', 'monthly', 'all') then
    raise exception 'Unknown kind of email: %', kind using errcode = '22023';
  end if;

  update public.profiles
  set email_task_reminders = case when kind in ('daily', 'all') then false else email_task_reminders end,
      email_odometer_reminders = case when kind in ('daily', 'all') then false else email_odometer_reminders end,
      email_monthly_summary = case when kind in ('monthly', 'all') then false else email_monthly_summary end
  where email_token = token;
  return found;
end;
$$;

revoke all on function public.touch_odometer_updated_at() from public, anon, authenticated;
revoke all on function public.reminder_job_allowed(text) from public, anon, authenticated;

-- The job calls these with the app's publishable key (role anon); the job
-- secret is what lets it in.
revoke all on function public.reminder_job_data(text, date, date) from public;
revoke all on function public.claim_reminders(text, uuid, text[]) from public;
revoke all on function public.release_reminders(text, uuid, text[]) from public;
revoke all on function public.unsubscribe_reminders(uuid, text) from public;
grant execute on function public.reminder_job_data(text, date, date) to anon, authenticated;
grant execute on function public.claim_reminders(text, uuid, text[]) to anon, authenticated;
grant execute on function public.release_reminders(text, uuid, text[]) to anon, authenticated;
grant execute on function public.unsubscribe_reminders(uuid, text) to anon, authenticated;
