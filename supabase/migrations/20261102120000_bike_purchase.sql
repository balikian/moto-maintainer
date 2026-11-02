-- When the rider bought the bike, and the odometer then: optional, and set
-- together. Tasks without a start point can count from it ("Since I bought
-- it"), so a used bike's tasks don't have to count from new or from today.
-- The existing motorcycles policies already limit both to the owner.

alter table public.motorcycles
  add column purchased_on date,
  add column purchase_mileage integer,
  add constraint motorcycles_purchase_check check (
    (purchased_on is null) = (purchase_mileage is null)
    and (purchase_mileage is null or purchase_mileage >= 0)
  );

comment on column public.motorcycles.purchased_on is
  'When the rider bought the bike; null if not given. Set with purchase_mileage.';
comment on column public.motorcycles.purchase_mileage is
  'The odometer in miles when the rider bought the bike; null if not given.';
