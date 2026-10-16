-- Settings (roadmap step 4): reminder email preferences, and deleting your
-- own account.

-- Which reminder emails a rider wants. Task and odometer reminders are on by
-- default (that's what riders sign up for; every email will carry an
-- unsubscribe link); the monthly summary is opt-in. Push gets its own columns
-- when it exists.
alter table public.profiles
  add column email_task_reminders boolean not null default true,
  add column email_odometer_reminders boolean not null default true,
  add column email_monthly_summary boolean not null default false;

-- Deletes the signed-in rider's account. Everything they own goes with it
-- through foreign keys: profile, bikes, tasks, service logs and share links
-- cascade; manuals, schedules and models they submitted stay for other
-- riders, with submitted_by set to null. Runs as its owner (postgres), which
-- may delete from auth.users, so the app never needs the service-role key.
create function public.delete_my_account() returns void
    language plpgsql security definer
    set search_path to ''
    as $$
declare
  rider uuid := (select auth.uid());
begin
  if rider is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = rider;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
