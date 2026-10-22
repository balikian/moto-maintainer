-- The daily email to admins listing what's waiting on the review page: manual
-- links and makes/models riders submitted (status 'pending'). The reminder
-- job reads it with its job secret, like reminder_job_data; the app still
-- holds no service-role key. Admins without a confirmed email are skipped.

create function public.admin_review_digest(job_secret text) returns jsonb
    language plpgsql stable security definer
    set search_path to ''
    as $$
begin
  if not public.reminder_job_allowed(job_secret) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'admins', coalesce((
      select jsonb_agg(jsonb_build_object('user_id', u.id, 'email', u.email) order by u.email)
      from public.app_admins a
      join auth.users u on u.id = a.user_id
      where u.email is not null and u.email_confirmed_at is not null
    ), '[]'::jsonb),
    'manuals', coalesce((
      select jsonb_agg(jsonb_build_object(
        'make', m.make, 'model', m.model, 'year_from', m.year_from, 'year_to', m.year_to,
        'url', m.url, 'submitted_at', m.created_at
      ) order by m.created_at)
      from public.bike_manuals m
      where m.status = 'pending'
    ), '[]'::jsonb),
    'models', coalesce((
      select jsonb_agg(jsonb_build_object('make', c.make, 'model', c.model, 'submitted_at', c.created_at) order by c.created_at)
      from public.custom_models c
      where c.status = 'pending'
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.admin_review_digest(text) from public;
grant execute on function public.admin_review_digest(text) to anon, authenticated;
