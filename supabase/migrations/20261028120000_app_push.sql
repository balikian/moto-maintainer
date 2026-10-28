-- Push in the phone app (roadmap step 7). The app's web view has no web
-- push, so the app gets the phone's own notifications: on Android through
-- Firebase Cloud Messaging, which gives each install a token. Tokens are
-- saved in push_subscriptions beside the browsers' push addresses, as kind
-- 'fcm' with the token in endpoint and no keys (Firebase encrypts on its own).

alter table public.push_subscriptions
  add column kind text not null default 'web' check (kind in ('web', 'fcm')),
  alter column p256dh drop not null,
  alter column auth drop not null,
  drop constraint push_subscriptions_endpoint_check,
  add constraint push_subscriptions_address_check check (
    case kind
      when 'web' then endpoint like 'https://%' and length(endpoint) <= 1000 and p256dh is not null and auth is not null
      else endpoint ~ '^[A-Za-z0-9:_-]{1,4096}$' and p256dh is null and auth is null
    end
  );

-- Saves the phone app's Firebase token for the signed-in rider. Like
-- save_push_subscription, a token someone else saved (they signed in on this
-- phone before) moves to this rider.
create function public.save_app_push_device(device_token text) returns void
    language plpgsql security definer
    set search_path to ''
    as $$
declare
  rider uuid := (select auth.uid());
begin
  if rider is null then
    raise exception 'Not signed in';
  end if;
  insert into public.push_subscriptions (user_id, kind, endpoint)
  values (rider, 'fcm', device_token)
  on conflict on constraint push_subscriptions_endpoint_key do update
    set user_id = excluded.user_id, kind = excluded.kind, p256dh = null, auth = null, created_at = now();
end;
$$;

revoke all on function public.save_app_push_device(text) from public, anon;
grant execute on function public.save_app_push_device(text) to authenticated;

-- The job's data, now with each device's kind. Otherwise the same as before.
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
        select json_agg(json_build_object('kind', s.kind, 'endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth) order by s.created_at)
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
