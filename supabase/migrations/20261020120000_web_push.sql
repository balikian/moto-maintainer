-- Web push (roadmap step 5). Riders turn push on per device on More; the
-- browser gives each device a push address (an endpoint at Google, Apple or
-- Mozilla's push service, plus two keys that encrypt the message), saved
-- here. The daily reminder job sends the same task and odometer reminders
-- as the email, by push, to every device the rider turned on.

-- Which reminders go by push, separate from the email switches (turning
-- reminder emails off, or unsubscribing from one, leaves push alone). Push
-- only goes to devices with a row in push_subscriptions.
alter table public.profiles
  add column push_task_reminders boolean not null default true,
  add column push_odometer_reminders boolean not null default true;

-- One row per device. Riders can see and delete their own; saving goes
-- through save_push_subscription below, since a device's endpoint may still
-- belong to someone who signed in on it before.
create table public.push_subscriptions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    endpoint text not null unique check (endpoint like 'https://%' and length(endpoint) <= 1000),
    p256dh text not null check (length(p256dh) between 1 and 200),
    auth text not null check (length(auth) between 1 and 100),
    created_at timestamp with time zone not null default now()
);
create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;

create policy "Read own push subscriptions" on public.push_subscriptions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Delete own push subscriptions" on public.push_subscriptions
  for delete to authenticated using (user_id = (select auth.uid()));

-- Saves this device's push address for the signed-in rider. An endpoint
-- belongs to one browser, so if another account had it (someone else signed
-- in on this device before), it moves to this rider.
create function public.save_push_subscription(push_endpoint text, push_p256dh text, push_auth text) returns void
    language plpgsql security definer
    set search_path to ''
    as $$
declare
  rider uuid := (select auth.uid());
begin
  if rider is null then
    raise exception 'Not signed in';
  end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values (rider, push_endpoint, push_p256dh, push_auth)
  on conflict on constraint push_subscriptions_endpoint_key do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, created_at = now();
end;
$$;

revoke all on function public.save_push_subscription(text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;

-- The job deletes devices the push service says are gone (the rider
-- uninstalled the app, cleared the site's data or blocked notifications).
create function public.remove_push_subscriptions(job_secret text, endpoints text[]) returns void
    language plpgsql security definer
    set search_path to ''
    as $$
begin
  if not public.reminder_job_allowed(job_secret) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  delete from public.push_subscriptions where endpoint = any(endpoints);
end;
$$;

revoke all on function public.remove_push_subscriptions(text, text[]) from public;
grant execute on function public.remove_push_subscriptions(text, text[]) to anon, authenticated;

-- The job's data, now with each rider's push switches and devices, and
-- riders who get only push. Otherwise the same as before.
create or replace function public.reminder_job_data(job_secret text, spend_from date default null, spend_to date default null) returns json
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
      'push_task_reminders', p.push_task_reminders,
      'push_odometer_reminders', p.push_odometer_reminders,
      'push', coalesce((
        select json_agg(json_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth) order by s.created_at)
        from public.push_subscriptions s
        where s.user_id = p.id
      ), '[]'::json),
      'sent', coalesce((select json_agg(n.key) from public.notifications_sent n where n.user_id = p.id), '[]'::json),
      'bikes', coalesce((
        select json_agg(json_build_object(
          'id', m.id,
          'year', m.year,
          'make', m.make,
          'model', m.model,
          'current_mileage', m.current_mileage,
          'created_at', m.created_at,
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
      and (
        p.email_task_reminders or p.email_odometer_reminders or p.email_monthly_summary
        or ((p.push_task_reminders or p.push_odometer_reminders)
            and exists (select 1 from public.push_subscriptions s where s.user_id = p.id))
      )
  );
end;
$$;
