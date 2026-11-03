-- Storage mode: a bike put away for the season. stored_on is the day it went
-- into storage (null while it's on the road); storage_checklist holds the
-- ticked items of the storage and "back on the road" checklists
-- (lib/storage.ts); battery_type tunes the battery advice. The daily reminder
-- job asks about a stored bike's battery every four weeks, so its data now
-- includes these. The existing motorcycles policies already limit them to the
-- owner.

alter table public.motorcycles
  add column stored_on date,
  add column battery_type text check (battery_type in ('standard', 'lithium')),
  add column storage_checklist text[] not null default '{}' check (cardinality(storage_checklist) <= 30);

comment on column public.motorcycles.stored_on is
  'The day the bike went into storage; null while it''s on the road.';
comment on column public.motorcycles.battery_type is
  'standard (lead-acid, AGM, gel) or lithium; null if not given.';
comment on column public.motorcycles.storage_checklist is
  'Ticked storage and back-on-the-road checklist items (keys in lib/storage.ts).';

-- The job's data, now with each bike's storage day and battery type. Otherwise the same as before.
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
          'stored_on', m.stored_on,
          'battery_type', m.battery_type,
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
