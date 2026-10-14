-- Baseline: the whole schema as it stood in production on 2026-10-14, so a
-- new, empty Supabase project can be built from these files alone. Made with
-- pg_dump (schema only, public schema) from production, plus the sign-up
-- trigger on auth.users, which lives outside public.
--
-- The migrations before this one were pasted into the SQL Editor on top of
-- tables first made in the dashboard; they're kept in supabase/archive/ for
-- reference. Production already has all of this: mark it applied there with
-- `npx supabase migration repair --status applied 20261014100000`.
--
-- Removed from the dump: psql-only lines, session settings, and statements a
-- fresh project already has or won't allow (the public schema itself, its
-- grants, and default privileges).

-- SQL functions below refer to tables created after them.
set check_function_bodies = false;



--
-- Name: get_shared_history(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_shared_history(share_token text) RETURNS json
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select json_build_object(
    'bike', json_build_object(
      'year', m.year,
      'make', m.make,
      'model', m.model,
      'current_mileage', m.current_mileage
    ),
    'unit_system', coalesce(p.unit_system, 'imperial'),
    'logs', coalesce((
      select json_agg(
        json_build_object(
          'id', l.id,
          'task_id', l.task_id,
          'task_name', l.task_name,
          'performed_at', l.performed_at,
          'odometer_at_service', l.odometer_at_service,
          'cost', l.cost,
          'notes', l.notes
        )
        order by l.performed_at desc, l.created_at desc
      )
      from public.service_logs l
      where l.motorcycle_id = m.id
    ), '[]'::json)
  )
  from public.history_shares s
  join public.motorcycles m on m.id = s.motorcycle_id and m.user_id = s.user_id
  left join public.profiles p on p.id = s.user_id
  where s.token = share_token
    and s.revoked_at is null
    and length(share_token) >= 32;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  insert into public.profiles (id, full_name, unit_system, is_dark_mode)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Rider'),
    'imperial',
    true
  );
  return new;
end;
$$;


--
-- Name: is_app_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_app_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select exists (select 1 from public.app_admins where user_id = (select auth.uid()));
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: app_admins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_admins (
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: bike_manuals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bike_manuals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    make text NOT NULL,
    model text NOT NULL,
    year_from integer NOT NULL,
    year_to integer NOT NULL,
    url text NOT NULL,
    label text DEFAULT 'Owner''s manual'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    submitted_by uuid DEFAULT auth.uid(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_at timestamp with time zone,
    CONSTRAINT bike_manuals_check CHECK ((year_from <= year_to)),
    CONSTRAINT bike_manuals_label_check CHECK (((length(label) >= 1) AND (length(label) <= 120))),
    CONSTRAINT bike_manuals_make_check CHECK ((length(btrim(make)) > 0)),
    CONSTRAINT bike_manuals_model_check CHECK ((length(btrim(model)) > 0)),
    CONSTRAINT bike_manuals_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))),
    CONSTRAINT bike_manuals_url_check CHECK (((url ~* '^https?://\S+$'::text) AND (length(url) <= 2000))),
    CONSTRAINT bike_manuals_year_from_check CHECK (((year_from >= 1900) AND (year_from <= 2100))),
    CONSTRAINT bike_manuals_year_to_check CHECK (((year_to >= 1900) AND (year_to <= 2100)))
);


--
-- Name: bikes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bikes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    year integer NOT NULL,
    make text NOT NULL,
    model text NOT NULL,
    current_mileage integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: custom_models; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.custom_models (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    make text NOT NULL,
    model text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    submitted_by uuid DEFAULT auth.uid(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_at timestamp with time zone,
    CONSTRAINT custom_models_make_check CHECK (((length(btrim(make)) >= 1) AND (length(btrim(make)) <= 60))),
    CONSTRAINT custom_models_model_check CHECK (((length(btrim(model)) >= 1) AND (length(btrim(model)) <= 80))),
    CONSTRAINT custom_models_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: history_shares; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.history_shares (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    token text NOT NULL,
    user_id uuid NOT NULL,
    motorcycle_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone
);


--
-- Name: maintenance_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maintenance_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    motorcycle_id uuid NOT NULL,
    user_id uuid NOT NULL,
    task_name text NOT NULL,
    interval_mileage integer DEFAULT 0 NOT NULL,
    interval_months integer DEFAULT 0,
    last_performed_mileage integer DEFAULT 0 NOT NULL,
    last_performed_date date,
    is_diy boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    notes text,
    category text,
    CONSTRAINT maintenance_tasks_category_check CHECK (((category IS NULL) OR (category = ANY (ARRAY['engine'::text, 'brakes'::text, 'drivetrain'::text, 'wheels'::text, 'suspension'::text, 'cooling'::text, 'electrical'::text, 'controls'::text, 'other'::text]))))
);


--
-- Name: model_schedule_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.model_schedule_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    schedule_id uuid NOT NULL,
    task_name text NOT NULL,
    interval_distance integer DEFAULT 0 NOT NULL,
    distance_unit text DEFAULT 'mi'::text NOT NULL,
    interval_months integer DEFAULT 0 NOT NULL,
    is_diy boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    category text,
    CONSTRAINT model_schedule_tasks_category_check CHECK (((category IS NULL) OR (category = ANY (ARRAY['engine'::text, 'brakes'::text, 'drivetrain'::text, 'wheels'::text, 'suspension'::text, 'cooling'::text, 'electrical'::text, 'controls'::text, 'other'::text])))),
    CONSTRAINT model_schedule_tasks_distance_unit_check CHECK ((distance_unit = ANY (ARRAY['mi'::text, 'km'::text]))),
    CONSTRAINT model_schedule_tasks_interval_distance_check CHECK ((interval_distance >= 0)),
    CONSTRAINT model_schedule_tasks_interval_months_check CHECK ((interval_months >= 0)),
    CONSTRAINT model_schedule_tasks_task_name_check CHECK (((length(btrim(task_name)) >= 1) AND (length(btrim(task_name)) <= 120)))
);


--
-- Name: model_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.model_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    make text NOT NULL,
    model text NOT NULL,
    year_from integer NOT NULL,
    year_to integer NOT NULL,
    source text,
    manual_id uuid,
    status text DEFAULT 'pending'::text NOT NULL,
    submitted_by uuid DEFAULT auth.uid(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_at timestamp with time zone,
    CONSTRAINT model_schedules_check CHECK ((year_from <= year_to)),
    CONSTRAINT model_schedules_make_check CHECK ((length(btrim(make)) > 0)),
    CONSTRAINT model_schedules_model_check CHECK ((length(btrim(model)) > 0)),
    CONSTRAINT model_schedules_source_check CHECK ((length(source) <= 300)),
    CONSTRAINT model_schedules_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))),
    CONSTRAINT model_schedules_year_from_check CHECK (((year_from >= 1900) AND (year_from <= 2100))),
    CONSTRAINT model_schedules_year_to_check CHECK (((year_to >= 1900) AND (year_to <= 2100)))
);


--
-- Name: motorcycles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.motorcycles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    make text NOT NULL,
    model text NOT NULL,
    year integer NOT NULL,
    current_mileage integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text,
    unit_system text DEFAULT 'imperial'::text,
    is_dark_mode boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    theme text DEFAULT 'system'::text NOT NULL,
    active_bike_id uuid,
    CONSTRAINT profiles_theme_check CHECK ((theme = ANY (ARRAY['system'::text, 'light'::text, 'dark'::text]))),
    CONSTRAINT profiles_unit_system_check CHECK ((unit_system = ANY (ARRAY['imperial'::text, 'metric'::text])))
);


--
-- Name: service_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid DEFAULT auth.uid() NOT NULL,
    motorcycle_id uuid NOT NULL,
    task_id uuid,
    task_name text NOT NULL,
    performed_at timestamp with time zone DEFAULT now() NOT NULL,
    odometer_at_service integer NOT NULL,
    cost numeric(10,2) DEFAULT 0.00,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: app_admins app_admins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_admins
    ADD CONSTRAINT app_admins_pkey PRIMARY KEY (user_id);


--
-- Name: bike_manuals bike_manuals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bike_manuals
    ADD CONSTRAINT bike_manuals_pkey PRIMARY KEY (id);


--
-- Name: bikes bikes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bikes
    ADD CONSTRAINT bikes_pkey PRIMARY KEY (id);


--
-- Name: custom_models custom_models_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_models
    ADD CONSTRAINT custom_models_pkey PRIMARY KEY (id);


--
-- Name: history_shares history_shares_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.history_shares
    ADD CONSTRAINT history_shares_pkey PRIMARY KEY (id);


--
-- Name: history_shares history_shares_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.history_shares
    ADD CONSTRAINT history_shares_token_key UNIQUE (token);


--
-- Name: maintenance_tasks maintenance_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_tasks
    ADD CONSTRAINT maintenance_tasks_pkey PRIMARY KEY (id);


--
-- Name: model_schedule_tasks model_schedule_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_schedule_tasks
    ADD CONSTRAINT model_schedule_tasks_pkey PRIMARY KEY (id);


--
-- Name: model_schedules model_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_schedules
    ADD CONSTRAINT model_schedules_pkey PRIMARY KEY (id);


--
-- Name: motorcycles motorcycles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.motorcycles
    ADD CONSTRAINT motorcycles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: service_logs service_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_logs
    ADD CONSTRAINT service_logs_pkey PRIMARY KEY (id);


--
-- Name: bike_manuals_make_model_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bike_manuals_make_model_idx ON public.bike_manuals USING btree (lower(make), lower(model));


--
-- Name: custom_models_make_model_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX custom_models_make_model_key ON public.custom_models USING btree (lower(btrim(make)), lower(btrim(model)));


--
-- Name: history_shares_motorcycle_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX history_shares_motorcycle_id_idx ON public.history_shares USING btree (motorcycle_id);


--
-- Name: idx_service_logs_motorcycle_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_logs_motorcycle_id ON public.service_logs USING btree (motorcycle_id, performed_at DESC);


--
-- Name: model_schedule_tasks_schedule_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX model_schedule_tasks_schedule_id_idx ON public.model_schedule_tasks USING btree (schedule_id);


--
-- Name: model_schedules_make_model_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX model_schedules_make_model_idx ON public.model_schedules USING btree (lower(make), lower(model));


--
-- Name: app_admins app_admins_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_admins
    ADD CONSTRAINT app_admins_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: bike_manuals bike_manuals_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bike_manuals
    ADD CONSTRAINT bike_manuals_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: bikes bikes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bikes
    ADD CONSTRAINT bikes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: custom_models custom_models_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_models
    ADD CONSTRAINT custom_models_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: history_shares history_shares_motorcycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.history_shares
    ADD CONSTRAINT history_shares_motorcycle_id_fkey FOREIGN KEY (motorcycle_id) REFERENCES public.motorcycles(id) ON DELETE CASCADE;


--
-- Name: history_shares history_shares_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.history_shares
    ADD CONSTRAINT history_shares_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: maintenance_tasks maintenance_tasks_motorcycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_tasks
    ADD CONSTRAINT maintenance_tasks_motorcycle_id_fkey FOREIGN KEY (motorcycle_id) REFERENCES public.motorcycles(id) ON DELETE CASCADE;


--
-- Name: maintenance_tasks maintenance_tasks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_tasks
    ADD CONSTRAINT maintenance_tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: model_schedule_tasks model_schedule_tasks_schedule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_schedule_tasks
    ADD CONSTRAINT model_schedule_tasks_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES public.model_schedules(id) ON DELETE CASCADE;


--
-- Name: model_schedules model_schedules_manual_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_schedules
    ADD CONSTRAINT model_schedules_manual_id_fkey FOREIGN KEY (manual_id) REFERENCES public.bike_manuals(id) ON DELETE SET NULL;


--
-- Name: model_schedules model_schedules_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_schedules
    ADD CONSTRAINT model_schedules_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: motorcycles motorcycles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.motorcycles
    ADD CONSTRAINT motorcycles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_active_bike_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_active_bike_id_fkey FOREIGN KEY (active_bike_id) REFERENCES public.motorcycles(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: service_logs service_logs_motorcycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_logs
    ADD CONSTRAINT service_logs_motorcycle_id_fkey FOREIGN KEY (motorcycle_id) REFERENCES public.motorcycles(id) ON DELETE CASCADE;


--
-- Name: service_logs service_logs_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_logs
    ADD CONSTRAINT service_logs_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.maintenance_tasks(id) ON DELETE SET NULL;


--
-- Name: service_logs service_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_logs
    ADD CONSTRAINT service_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: custom_models Admins delete custom models; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins delete custom models" ON public.custom_models FOR DELETE TO authenticated USING (( SELECT public.is_app_admin() AS is_app_admin));


--
-- Name: custom_models Admins review custom models; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins review custom models" ON public.custom_models FOR UPDATE TO authenticated USING (( SELECT public.is_app_admin() AS is_app_admin)) WITH CHECK (( SELECT public.is_app_admin() AS is_app_admin));


--
-- Name: bike_manuals Admins review manuals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins review manuals" ON public.bike_manuals FOR UPDATE TO authenticated USING (( SELECT public.is_app_admin() AS is_app_admin)) WITH CHECK (( SELECT public.is_app_admin() AS is_app_admin));


--
-- Name: model_schedules Admins review schedules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins review schedules" ON public.model_schedules FOR UPDATE TO authenticated USING (( SELECT public.is_app_admin() AS is_app_admin)) WITH CHECK (( SELECT public.is_app_admin() AS is_app_admin));


--
-- Name: bike_manuals Delete own pending manuals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Delete own pending manuals" ON public.bike_manuals FOR DELETE TO authenticated USING ((( SELECT public.is_app_admin() AS is_app_admin) OR ((submitted_by = ( SELECT auth.uid() AS uid)) AND (status = 'pending'::text))));


--
-- Name: model_schedules Delete own pending schedules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Delete own pending schedules" ON public.model_schedules FOR DELETE TO authenticated USING ((( SELECT public.is_app_admin() AS is_app_admin) OR ((submitted_by = ( SELECT auth.uid() AS uid)) AND (status = 'pending'::text))));


--
-- Name: model_schedule_tasks Edit tasks of own pending schedules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Edit tasks of own pending schedules" ON public.model_schedule_tasks TO authenticated USING ((( SELECT public.is_app_admin() AS is_app_admin) OR (EXISTS ( SELECT 1
   FROM public.model_schedules s
  WHERE ((s.id = model_schedule_tasks.schedule_id) AND (s.submitted_by = ( SELECT auth.uid() AS uid)) AND (s.status = 'pending'::text)))))) WITH CHECK ((( SELECT public.is_app_admin() AS is_app_admin) OR (EXISTS ( SELECT 1
   FROM public.model_schedules s
  WHERE ((s.id = model_schedule_tasks.schedule_id) AND (s.submitted_by = ( SELECT auth.uid() AS uid)) AND (s.status = 'pending'::text))))));


--
-- Name: maintenance_tasks Owners manage their maintenance tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners manage their maintenance tasks" ON public.maintenance_tasks TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id)) WITH CHECK (((( SELECT auth.uid() AS uid) = user_id) AND (EXISTS ( SELECT 1
   FROM public.motorcycles m
  WHERE ((m.id = maintenance_tasks.motorcycle_id) AND (m.user_id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: motorcycles Owners manage their motorcycles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners manage their motorcycles" ON public.motorcycles TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: profiles Owners manage their profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners manage their profile" ON public.profiles TO authenticated USING ((( SELECT auth.uid() AS uid) = id)) WITH CHECK ((( SELECT auth.uid() AS uid) = id));


--
-- Name: service_logs Owners manage their service logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners manage their service logs" ON public.service_logs TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id)) WITH CHECK (((( SELECT auth.uid() AS uid) = user_id) AND (EXISTS ( SELECT 1
   FROM public.motorcycles m
  WHERE ((m.id = service_logs.motorcycle_id) AND (m.user_id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: history_shares Owners manage their share links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners manage their share links" ON public.history_shares TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id)) WITH CHECK (((( SELECT auth.uid() AS uid) = user_id) AND (EXISTS ( SELECT 1
   FROM public.motorcycles m
  WHERE ((m.id = history_shares.motorcycle_id) AND (m.user_id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: custom_models Read approved or own custom models; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Read approved or own custom models" ON public.custom_models FOR SELECT TO authenticated USING (((status = 'approved'::text) OR (submitted_by = ( SELECT auth.uid() AS uid)) OR ( SELECT public.is_app_admin() AS is_app_admin)));


--
-- Name: bike_manuals Read approved or own manuals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Read approved or own manuals" ON public.bike_manuals FOR SELECT TO authenticated USING (((status = 'approved'::text) OR (submitted_by = ( SELECT auth.uid() AS uid)) OR ( SELECT public.is_app_admin() AS is_app_admin)));


--
-- Name: model_schedules Read approved or own schedules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Read approved or own schedules" ON public.model_schedules FOR SELECT TO authenticated USING (((status = 'approved'::text) OR (submitted_by = ( SELECT auth.uid() AS uid)) OR ( SELECT public.is_app_admin() AS is_app_admin)));


--
-- Name: model_schedule_tasks Read tasks of visible schedules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Read tasks of visible schedules" ON public.model_schedule_tasks FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.model_schedules s
  WHERE (s.id = model_schedule_tasks.schedule_id))));


--
-- Name: custom_models Submit custom models; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Submit custom models" ON public.custom_models FOR INSERT TO authenticated WITH CHECK (((submitted_by = ( SELECT auth.uid() AS uid)) AND ((status = 'pending'::text) OR ( SELECT public.is_app_admin() AS is_app_admin))));


--
-- Name: bike_manuals Submit manuals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Submit manuals" ON public.bike_manuals FOR INSERT TO authenticated WITH CHECK (((submitted_by = ( SELECT auth.uid() AS uid)) AND ((status = 'pending'::text) OR ( SELECT public.is_app_admin() AS is_app_admin))));


--
-- Name: model_schedules Submit schedules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Submit schedules" ON public.model_schedules FOR INSERT TO authenticated WITH CHECK (((submitted_by = ( SELECT auth.uid() AS uid)) AND ((status = 'pending'::text) OR ( SELECT public.is_app_admin() AS is_app_admin))));


--
-- Name: bikes Users can manage own bikes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own bikes" ON public.bikes USING ((auth.uid() = user_id));


--
-- Name: app_admins; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_admins ENABLE ROW LEVEL SECURITY;

--
-- Name: bike_manuals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bike_manuals ENABLE ROW LEVEL SECURITY;

--
-- Name: bikes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bikes ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_models; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.custom_models ENABLE ROW LEVEL SECURITY;

--
-- Name: history_shares; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.history_shares ENABLE ROW LEVEL SECURITY;

--
-- Name: maintenance_tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.maintenance_tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: model_schedule_tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.model_schedule_tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: model_schedules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.model_schedules ENABLE ROW LEVEL SECURITY;

--
-- Name: motorcycles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.motorcycles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: service_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.service_logs ENABLE ROW LEVEL SECURITY;

--


--
-- Name: FUNCTION get_shared_history(share_token text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.get_shared_history(share_token text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_shared_history(share_token text) TO anon;
GRANT ALL ON FUNCTION public.get_shared_history(share_token text) TO authenticated;
GRANT ALL ON FUNCTION public.get_shared_history(share_token text) TO service_role;


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;


--
-- Name: FUNCTION is_app_admin(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.is_app_admin() FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_app_admin() TO anon;
GRANT ALL ON FUNCTION public.is_app_admin() TO authenticated;
GRANT ALL ON FUNCTION public.is_app_admin() TO service_role;


--
-- Name: TABLE app_admins; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.app_admins TO anon;
GRANT ALL ON TABLE public.app_admins TO authenticated;
GRANT ALL ON TABLE public.app_admins TO service_role;


--
-- Name: TABLE bike_manuals; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.bike_manuals TO anon;
GRANT ALL ON TABLE public.bike_manuals TO authenticated;
GRANT ALL ON TABLE public.bike_manuals TO service_role;


--
-- Name: TABLE bikes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.bikes TO anon;
GRANT ALL ON TABLE public.bikes TO authenticated;
GRANT ALL ON TABLE public.bikes TO service_role;


--
-- Name: TABLE custom_models; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.custom_models TO anon;
GRANT ALL ON TABLE public.custom_models TO authenticated;
GRANT ALL ON TABLE public.custom_models TO service_role;


--
-- Name: TABLE history_shares; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.history_shares TO anon;
GRANT ALL ON TABLE public.history_shares TO authenticated;
GRANT ALL ON TABLE public.history_shares TO service_role;


--
-- Name: TABLE maintenance_tasks; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.maintenance_tasks TO anon;
GRANT ALL ON TABLE public.maintenance_tasks TO authenticated;
GRANT ALL ON TABLE public.maintenance_tasks TO service_role;


--
-- Name: TABLE model_schedule_tasks; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.model_schedule_tasks TO anon;
GRANT ALL ON TABLE public.model_schedule_tasks TO authenticated;
GRANT ALL ON TABLE public.model_schedule_tasks TO service_role;


--
-- Name: TABLE model_schedules; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.model_schedules TO anon;
GRANT ALL ON TABLE public.model_schedules TO authenticated;
GRANT ALL ON TABLE public.model_schedules TO service_role;


--
-- Name: TABLE motorcycles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.motorcycles TO anon;
GRANT ALL ON TABLE public.motorcycles TO authenticated;
GRANT ALL ON TABLE public.motorcycles TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;


--
-- Name: TABLE service_logs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.service_logs TO anon;
GRANT ALL ON TABLE public.service_logs TO authenticated;
GRANT ALL ON TABLE public.service_logs TO service_role;


--
-- Name: on_auth_user_created; Type: TRIGGER; Schema: auth
-- Creates each new rider's profile row.
--

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
