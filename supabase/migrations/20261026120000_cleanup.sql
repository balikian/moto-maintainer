-- Leftovers from before migrations were kept (2026-10-14 baseline).

-- The first bikes table, replaced by motorcycles: nothing reads or writes it.
-- Stop instead of dropping it if a row ever made it in.
do $$
begin
  if exists (select 1 from public.bikes) then
    raise exception 'public.bikes has rows; look at them before dropping the table';
  end if;
end;
$$;

drop table public.bikes;

-- New profiles: no more is_dark_mode (theme replaced it, with its own
-- default), and a fixed search_path like the other security definer
-- functions, so it can't be pointed at look-alike tables.
create or replace function public.handle_new_user() returns trigger
    language plpgsql security definer
    set search_path to ''
    as $$
begin
  insert into public.profiles (id, full_name, unit_system)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Rider'),
    'imperial'
  );
  return new;
end;
$$;

alter table public.profiles drop column is_dark_mode;
