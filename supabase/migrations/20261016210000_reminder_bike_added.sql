-- Reminder emails wait a week after a bike is added (lib/reminders.ts), so
-- the rider can log past service or apply a schedule first. The job needs
-- each bike's created_at for that; otherwise the same as before.

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
      and (p.email_task_reminders or p.email_odometer_reminders or p.email_monthly_summary)
  );
end;
$$;
