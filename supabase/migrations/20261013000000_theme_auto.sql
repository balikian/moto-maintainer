-- Theme gains Auto ('system'), which follows the device's light or dark
-- setting. New profiles start on Auto; existing riders keep what they have.
-- Safe to re-run.

alter table public.profiles alter column theme set default 'system';

alter table public.profiles drop constraint if exists profiles_theme_check;
alter table public.profiles
  add constraint profiles_theme_check check (theme in ('system', 'light', 'dark'));
