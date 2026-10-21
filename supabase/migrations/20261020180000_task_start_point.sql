-- A task can have no start point yet: nobody has said when the work was last
-- done, so it can't come due. A newly added bike's tasks start that way, and
-- the rider logs a past service, starts counting today, or counts from new.
-- (They used to count from new, which showed a used bike's whole checklist
-- as overdue.) No start point is last_performed_mileage null, with the date.

alter table public.maintenance_tasks
  alter column last_performed_mileage drop not null,
  alter column last_performed_mileage drop default;

alter table public.maintenance_tasks
  add constraint maintenance_tasks_start_point_check
  check (last_performed_mileage is not null or last_performed_date is null);

-- Tasks still on the old automatic from-new start (0 miles, January 1 of the
-- model year) with no service ever logged for them lose it, so their riders
-- are asked when the work was last done instead of seeing it all overdue.
update public.maintenance_tasks t
set last_performed_mileage = null, last_performed_date = null
from public.motorcycles m
where m.id = t.motorcycle_id
  and t.last_performed_mileage = 0
  and t.last_performed_date = make_date(m.year, 1, 1)
  and not exists (select 1 from public.service_logs l where l.task_id = t.id);
