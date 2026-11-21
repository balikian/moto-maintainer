-- Founding riders (decided 2026-11-21): the first riders, invited personally
-- by the owner, keep everything free for good, the paid tier included, once
-- there is one. Riders become founding riders through an invite link
-- (/join/<code>, lib/invites.ts) or by an admin on the admin page.
--
-- Not a column on profiles: riders may update their whole profile row, so
-- they could set it themselves. Here riders can only read their own row;
-- rows are written by redeem_invite (checks the code) and by admins.

-- Invite links. 'founding' is the only kind for now; one-off invites for the
-- paid tier can add kinds later.
create table public.invites (
  code text primary key check (code ~ '^[a-z0-9]{6,32}$'),
  kind text not null default 'founding' check (kind in ('founding')),
  note text check (char_length(note) <= 200),
  active boolean not null default true,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamp with time zone not null default now()
);

alter table public.invites enable row level security;

create policy "Admins manage invites" on public.invites to authenticated
  using ((select public.is_app_admin())) with check ((select public.is_app_admin()));

grant select, insert, update, delete on table public.invites to authenticated;

comment on table public.invites is 'Invite links (/join/<code>). A founding invite makes whoever signs up through it a founding rider.';

create table public.founding_riders (
  user_id uuid primary key references auth.users(id) on delete cascade,
  -- The invite they came through; null when an admin added them by hand.
  invite_code text references public.invites(code) on delete set null,
  created_at timestamp with time zone not null default now()
);

alter table public.founding_riders enable row level security;

create policy "Riders see their own founding status" on public.founding_riders for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Admins manage founding riders" on public.founding_riders to authenticated
  using ((select public.is_app_admin())) with check ((select public.is_app_admin()));

grant select, insert, update, delete on table public.founding_riders to authenticated;

comment on table public.founding_riders is 'Riders who keep SwingArm free for good, paid tier included: invited personally at launch.';

-- Whether an invite link still works, for the join page (signed out too).
create function public.invite_is_open(p_code text) returns boolean
    language sql stable security definer
    set search_path to ''
    as $$
  select exists (select 1 from public.invites where code = lower(btrim(p_code)) and active);
$$;

revoke all on function public.invite_is_open(text) from public;
grant execute on function public.invite_is_open(text) to anon, authenticated;

-- Makes the signed-in rider a founding rider if the code is an active
-- founding invite. True when they are one afterwards (also if they already
-- were); false for an unknown or ended code.
create function public.redeem_invite(p_code text) returns boolean
    language plpgsql security definer
    set search_path to ''
    as $$
declare
  rider uuid := (select auth.uid());
  invite_code text;
begin
  if rider is null then
    raise exception 'Not signed in';
  end if;

  select i.code into invite_code
  from public.invites i
  where i.code = lower(btrim(p_code)) and i.active and i.kind = 'founding';
  if invite_code is null then
    return false;
  end if;

  insert into public.founding_riders (user_id, invite_code)
  values (rider, invite_code)
  on conflict (user_id) do nothing;
  return true;
end;
$$;

revoke all on function public.redeem_invite(text) from public, anon;
grant execute on function public.redeem_invite(text) to authenticated;

-- Admin page: founding riders with their sign-in email (in auth.users, which
-- the app can't read).
create function public.admin_founding_riders()
    returns table (user_id uuid, email text, invite_code text, created_at timestamp with time zone)
    language plpgsql stable security definer
    set search_path to ''
    as $$
begin
  if not public.is_app_admin() then
    raise exception 'Admins only';
  end if;
  return query
    select f.user_id, u.email::text, f.invite_code, f.created_at
    from public.founding_riders f
    join auth.users u on u.id = f.user_id
    order by f.created_at desc;
end;
$$;

revoke all on function public.admin_founding_riders() from public, anon;
grant execute on function public.admin_founding_riders() to authenticated;

-- Admin page: makes a rider a founding rider by their sign-in email, for
-- riders who signed up without the link. 'added', 'already' or 'not_found'.
create function public.admin_add_founding_rider(p_email text) returns text
    language plpgsql security definer
    set search_path to ''
    as $$
declare
  rider uuid;
begin
  if not public.is_app_admin() then
    raise exception 'Admins only';
  end if;

  select u.id into rider from auth.users u where lower(u.email) = lower(btrim(p_email)) limit 1;
  if rider is null then
    return 'not_found';
  end if;

  insert into public.founding_riders (user_id) values (rider) on conflict (user_id) do nothing;
  return case when found then 'added' else 'already' end;
end;
$$;

revoke all on function public.admin_add_founding_rider(text) from public, anon;
grant execute on function public.admin_add_founding_rider(text) to authenticated;
