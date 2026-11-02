-- A shop's map link (lib/shops.ts readAddress): a Google or Apple Maps link
-- the rider pasted into the address, kept so Directions opens that exact
-- place, even when the link (a short share link) doesn't spell out the address.

alter table public.shops
  add column map_url text check (char_length(map_url) <= 500);

comment on column public.shops.map_url is 'A Google or Apple Maps link the rider pasted; Directions opens it. Null if none.';
