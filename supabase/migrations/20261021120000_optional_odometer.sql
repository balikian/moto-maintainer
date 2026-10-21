-- The odometer is optional when adding a bike and when logging service.
-- A bike without a reading (current_mileage null) has its tasks count by
-- time only until the rider enters one. A service logged without a reading
-- (odometer_at_service null) moves its task's miles to the bike's odometer
-- at the time it was logged.

alter table public.motorcycles
  alter column current_mileage drop not null,
  alter column current_mileage drop default;

alter table public.service_logs
  alter column odometer_at_service drop not null;
