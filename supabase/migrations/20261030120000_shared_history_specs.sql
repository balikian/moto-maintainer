-- The shared history page shows the bike's specs too: its own values
-- (motorcycles.specs -> 'values'; never the rider's own rows in 'custom',
-- which can hold anything) and the manual's approved values for the model.
-- Visitors aren't signed in and can't read model_specs, so the function picks
-- the manual's specs the way lib/modelData.ts does: same make and model
-- (ignoring case), the year in range, narrowest range first, then newest.
-- create or replace keeps the function's grants.

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
          'shop', l.shop
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
