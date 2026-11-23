-- Everyone who has an account when this runs becomes a founding rider
-- (owner, 2026-11-23): the riders who joined before the announcement keep
-- SwingArm free for good. Later riders join through invite links or are
-- added by email on the admin page.
insert into public.founding_riders (user_id)
select id from auth.users
on conflict (user_id) do nothing;
