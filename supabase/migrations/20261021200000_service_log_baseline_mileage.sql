-- A service logged without an odometer reading counts its task's miles from
-- the bike's odometer at the time. That odometer is kept here, so when a newer
-- service is deleted and the task falls back to this one, it counts from the
-- same place, not from whatever the bike reads by then. Logs with a reading
-- store the same number. Null on records from before this column.

alter table public.service_logs
  add column baseline_mileage integer;

comment on column public.service_logs.baseline_mileage is
  'Miles the task counted from when this was logged: odometer_at_service, or the bike''s odometer if none was given.';
