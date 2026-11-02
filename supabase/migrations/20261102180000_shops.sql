-- Preferred shop (lib/shops.ts): the rider's shops and mechanics, typed in by
-- hand, and the one each bike goes to. A shop belongs to one rider; a bike's
-- shop_id can only point at its owner's own shops (the two-column foreign
-- key), and removing a shop leaves its bikes with none. Service records keep
-- the place as text (service_logs.shop), so removing a shop changes no history.

create table public.shops (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  phone text check (char_length(phone) <= 40),
  email text check (char_length(email) <= 254),
  address text check (char_length(address) <= 200),
  website text check (char_length(website) <= 300),
  notes text check (char_length(notes) <= 1000),
  created_at timestamp with time zone not null default now(),
  unique (id, user_id)
);

create index shops_user_id_idx on public.shops (user_id);

alter table public.shops enable row level security;

create policy "Owners manage their shops" on public.shops to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on table public.shops to authenticated;

comment on table public.shops is 'A rider''s shops and mechanics, typed in by hand.';

alter table public.motorcycles
  add column shop_id uuid,
  add constraint motorcycles_shop_fkey foreign key (shop_id, user_id)
    references public.shops (id, user_id) on delete set null (shop_id);

create index motorcycles_shop_id_idx on public.motorcycles (shop_id);

comment on column public.motorcycles.shop_id is 'The rider''s preferred shop for this bike; null if none.';
