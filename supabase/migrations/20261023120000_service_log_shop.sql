-- Where a service was done: "Home", or the shop's name. Typed by the rider,
-- optional. Services on the same day, at the same odometer and place, show as
-- one visit in the history, so this also tells two visits on one day apart.
-- The shared history page shows it too.

alter table public.service_logs
  add column shop text,
  add constraint service_logs_shop_length check (shop is null or char_length(shop) <= 80);

comment on column public.service_logs.shop is
  'Where the service was done ("Home", a shop''s name); null if not given.';

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
