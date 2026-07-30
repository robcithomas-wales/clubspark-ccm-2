-- Baseline for the "coaching" schema.
--
-- Generated with pg_dump from the pilot database on 2026-07-30 and squashed to a
-- single migration. The previous history could not build a database from empty:
-- six services had no migrations at all (their tables were created by
-- `prisma db push`, which records nothing), and booking/venue's "init" migrations
-- ALTERed tables that nothing ever created.
--
-- pg_dump rather than `prisma migrate diff` because Prisma cannot represent
-- exclusion constraints, CHECK constraints, triggers or functions. This database
-- has 1, 40, 26 and 11 of those respectively — including the EXCLUDE constraint
-- that is the atomic guard against double-booking. A Prisma-generated baseline
-- silently dropped it.
--
-- Replaying this into an empty database is verified by CI on every PR.



--
-- PostgreSQL database dump
--

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.3 (Homebrew)

--
-- Name: coaching; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS coaching;

--
-- Name: attendances; Type: TABLE; Schema: coaching; Owner: -
--

CREATE TABLE coaching.attendances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    programme_session_id uuid NOT NULL,
    enrolment_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    attended boolean,
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);

--
-- Name: coach_availability; Type: TABLE; Schema: coaching; Owner: -
--

CREATE TABLE coaching.coach_availability (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    coach_id uuid NOT NULL,
    day_of_week integer NOT NULL,
    start_time text NOT NULL,
    end_time text NOT NULL,
    lesson_type_id uuid
);

--
-- Name: coach_blocks; Type: TABLE; Schema: coaching; Owner: -
--

CREATE TABLE coaching.coach_blocks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    coach_id uuid NOT NULL,
    starts_at timestamp(3) without time zone NOT NULL,
    ends_at timestamp(3) without time zone NOT NULL,
    reason text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: coach_lesson_types; Type: TABLE; Schema: coaching; Owner: -
--

CREATE TABLE coaching.coach_lesson_types (
    coach_id uuid NOT NULL,
    lesson_type_id uuid NOT NULL
);

--
-- Name: coaches; Type: TABLE; Schema: coaching; Owner: -
--

CREATE TABLE coaching.coaches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    customer_id uuid,
    display_name text NOT NULL,
    bio text,
    avatar_url text,
    specialties text[],
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: enrolments; Type: TABLE; Schema: coaching; Owner: -
--

CREATE TABLE coaching.enrolments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    programme_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    status text DEFAULT 'confirmed'::text NOT NULL,
    order_id uuid,
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);

--
-- Name: lesson_sessions; Type: TABLE; Schema: coaching; Owner: -
--

CREATE TABLE coaching.lesson_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    coach_id uuid NOT NULL,
    lesson_type_id uuid NOT NULL,
    customer_id uuid,
    starts_at timestamp(3) without time zone NOT NULL,
    ends_at timestamp(3) without time zone NOT NULL,
    status text DEFAULT 'scheduled'::text NOT NULL,
    notes text,
    payment_status text DEFAULT 'unpaid'::text NOT NULL,
    price_charged numeric(10,2),
    cancellation_reason text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    bookable_unit_id uuid
);

--
-- Name: lesson_types; Type: TABLE; Schema: coaching; Owner: -
--

CREATE TABLE coaching.lesson_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    sport text,
    duration_minutes integer NOT NULL,
    max_participants integer DEFAULT 1 NOT NULL,
    price_per_session numeric(10,2) DEFAULT 0 NOT NULL,
    currency text DEFAULT 'GBP'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: programme_sessions; Type: TABLE; Schema: coaching; Owner: -
--

CREATE TABLE coaching.programme_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    programme_id uuid NOT NULL,
    coach_id uuid,
    bookable_unit_id uuid,
    starts_at timestamp(3) without time zone NOT NULL,
    ends_at timestamp(3) without time zone NOT NULL,
    status text DEFAULT 'scheduled'::text NOT NULL,
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);

--
-- Name: programmes; Type: TABLE; Schema: coaching; Owner: -
--

CREATE TABLE coaching.programmes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    sport text,
    coach_id uuid,
    venue_id uuid,
    max_participants integer DEFAULT 10 NOT NULL,
    min_participants integer DEFAULT 1 NOT NULL,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    currency text DEFAULT 'GBP'::text NOT NULL,
    enrolls_from timestamp(3) without time zone,
    enrolls_until timestamp(3) without time zone,
    status text DEFAULT 'draft'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);

--
-- Name: attendances attendances_pkey; Type: CONSTRAINT; Schema: coaching; Owner: -
--

ALTER TABLE ONLY coaching.attendances
    ADD CONSTRAINT attendances_pkey PRIMARY KEY (id);

--
-- Name: coach_availability coach_availability_pkey; Type: CONSTRAINT; Schema: coaching; Owner: -
--

ALTER TABLE ONLY coaching.coach_availability
    ADD CONSTRAINT coach_availability_pkey PRIMARY KEY (id);

--
-- Name: coach_blocks coach_blocks_pkey; Type: CONSTRAINT; Schema: coaching; Owner: -
--

ALTER TABLE ONLY coaching.coach_blocks
    ADD CONSTRAINT coach_blocks_pkey PRIMARY KEY (id);

--
-- Name: coach_lesson_types coach_lesson_types_pkey; Type: CONSTRAINT; Schema: coaching; Owner: -
--

ALTER TABLE ONLY coaching.coach_lesson_types
    ADD CONSTRAINT coach_lesson_types_pkey PRIMARY KEY (coach_id, lesson_type_id);

--
-- Name: coaches coaches_pkey; Type: CONSTRAINT; Schema: coaching; Owner: -
--

ALTER TABLE ONLY coaching.coaches
    ADD CONSTRAINT coaches_pkey PRIMARY KEY (id);

--
-- Name: enrolments enrolments_pkey; Type: CONSTRAINT; Schema: coaching; Owner: -
--

ALTER TABLE ONLY coaching.enrolments
    ADD CONSTRAINT enrolments_pkey PRIMARY KEY (id);

--
-- Name: lesson_sessions lesson_sessions_pkey; Type: CONSTRAINT; Schema: coaching; Owner: -
--

ALTER TABLE ONLY coaching.lesson_sessions
    ADD CONSTRAINT lesson_sessions_pkey PRIMARY KEY (id);

--
-- Name: lesson_types lesson_types_pkey; Type: CONSTRAINT; Schema: coaching; Owner: -
--

ALTER TABLE ONLY coaching.lesson_types
    ADD CONSTRAINT lesson_types_pkey PRIMARY KEY (id);

--
-- Name: programme_sessions programme_sessions_pkey; Type: CONSTRAINT; Schema: coaching; Owner: -
--

ALTER TABLE ONLY coaching.programme_sessions
    ADD CONSTRAINT programme_sessions_pkey PRIMARY KEY (id);

--
-- Name: programmes programmes_pkey; Type: CONSTRAINT; Schema: coaching; Owner: -
--

ALTER TABLE ONLY coaching.programmes
    ADD CONSTRAINT programmes_pkey PRIMARY KEY (id);

--
-- Name: attendances_customer_id_idx; Type: INDEX; Schema: coaching; Owner: -
--

CREATE INDEX attendances_customer_id_idx ON coaching.attendances USING btree (customer_id);

--
-- Name: attendances_enrolment_id_idx; Type: INDEX; Schema: coaching; Owner: -
--

CREATE INDEX attendances_enrolment_id_idx ON coaching.attendances USING btree (enrolment_id);

--
-- Name: attendances_programme_session_id_enrolment_id_key; Type: INDEX; Schema: coaching; Owner: -
--

CREATE UNIQUE INDEX attendances_programme_session_id_enrolment_id_key ON coaching.attendances USING btree (programme_session_id, enrolment_id);

--
-- Name: attendances_programme_session_id_idx; Type: INDEX; Schema: coaching; Owner: -
--

CREATE INDEX attendances_programme_session_id_idx ON coaching.attendances USING btree (programme_session_id);

--
-- Name: attendances_tenant_id_idx; Type: INDEX; Schema: coaching; Owner: -
--

CREATE INDEX attendances_tenant_id_idx ON coaching.attendances USING btree (tenant_id);

--
-- Name: coach_availability_coach_id_day_of_week_idx; Type: INDEX; Schema: coaching; Owner: -
--

CREATE INDEX coach_availability_coach_id_day_of_week_idx ON coaching.coach_availability USING btree (coach_id, day_of_week);

--
-- Name: coach_availability_coach_id_idx; Type: INDEX; Schema: coaching; Owner: -
--

CREATE INDEX coach_availability_coach_id_idx ON coaching.coach_availability USING btree (coach_id);

--
-- Name: coach_availability_tenant_id_idx; Type: INDEX; Schema: coaching; Owner: -
--

CREATE INDEX coach_availability_tenant_id_idx ON coaching.coach_availability USING btree (tenant_id);

--
-- Name: coach_blocks_coach_id_idx; Type: INDEX; Schema: coaching; Owner: -
--

CREATE INDEX coach_blocks_coach_id_idx ON coaching.coach_blocks USING btree (coach_id);

--
-- Name: coach_blocks_coach_id_starts_at_ends_at_idx; Type: INDEX; Schema: coaching; Owner: -
--

CREATE INDEX coach_blocks_coach_id_starts_at_ends_at_idx ON coaching.coach_blocks USING btree (coach_id, starts_at, ends_at);

--
-- Name: coach_blocks_tenant_id_idx; Type: INDEX; Schema: coaching; Owner: -
--

CREATE INDEX coach_blocks_tenant_id_idx ON coaching.coach_blocks USING btree (tenant_id);

--
-- Name: coach_lesson_types_coach_id_idx; Type: INDEX; Schema: coaching; Owner: -
--

CREATE INDEX coach_lesson_types_coach_id_idx ON coaching.coach_lesson_types USING btree (coach_id);

--
-- Name: coach_lesson_types_lesson_type_id_idx; Type: INDEX; Schema: coaching; Owner: -
--

CREATE INDEX coach_lesson_types_lesson_type_id_idx ON coaching.coach_lesson_types USING btree (lesson_type_id);

--
-- Name: coaches_customer_id_idx; Type: INDEX; Schema: coaching; Owner: -
--

CREATE INDEX coaches_customer_id_idx ON coaching.coaches USING btree (customer_id);

--
-- Name: coaches_tenant_id_idx; Type: INDEX; Schema: coaching; Owner: -
--

CREATE INDEX coaches_tenant_id_idx ON coaching.coaches USING btree (tenant_id);

--
-- Name: coaches_tenant_id_is_active_idx; Type: INDEX; Schema: coaching; Owner: -
--

CREATE INDEX coaches_tenant_id_is_active_idx ON coaching.coaches USING btree (tenant_id, is_active);

--
-- Name: enrolments_customer_id_idx; Type: INDEX; Schema: coaching; Owner: -
--

CREATE INDEX enrolments_customer_id_idx ON coaching.enrolments USING btree (customer_id);

--
-- Name: enrolments_programme_id_customer_id_key; Type: INDEX; Schema: coaching; Owner: -
--

CREATE UNIQUE INDEX enrolments_programme_id_customer_id_key ON coaching.enrolments USING btree (programme_id, customer_id);

--
-- Name: enrolments_programme_id_idx; Type: INDEX; Schema: coaching; Owner: -
--

CREATE INDEX enrolments_programme_id_idx ON coaching.enrolments USING btree (programme_id);

--
-- Name: enrolments_tenant_id_idx; Type: INDEX; Schema: coaching; Owner: -
--

CREATE INDEX enrolments_tenant_id_idx ON coaching.enrolments USING btree (tenant_id);

--
-- Name: lesson_sessions_bookable_unit_idx; Type: INDEX; Schema: coaching; Owner: -
--

CREATE INDEX lesson_sessions_bookable_unit_idx ON coaching.lesson_sessions USING btree (bookable_unit_id) WHERE (bookable_unit_id IS NOT NULL);

--
-- Name: lesson_sessions_coach_id_idx; Type: INDEX; Schema: coaching; Owner: -
--

CREATE INDEX lesson_sessions_coach_id_idx ON coaching.lesson_sessions USING btree (coach_id);

--
-- Name: lesson_sessions_customer_id_idx; Type: INDEX; Schema: coaching; Owner: -
--

CREATE INDEX lesson_sessions_customer_id_idx ON coaching.lesson_sessions USING btree (customer_id);

--
-- Name: lesson_sessions_lesson_type_id_idx; Type: INDEX; Schema: coaching; Owner: -
--

CREATE INDEX lesson_sessions_lesson_type_id_idx ON coaching.lesson_sessions USING btree (lesson_type_id);

--
-- Name: lesson_sessions_tenant_id_idx; Type: INDEX; Schema: coaching; Owner: -
--

CREATE INDEX lesson_sessions_tenant_id_idx ON coaching.lesson_sessions USING btree (tenant_id);

--
-- Name: lesson_sessions_tenant_id_starts_at_idx; Type: INDEX; Schema: coaching; Owner: -
--

CREATE INDEX lesson_sessions_tenant_id_starts_at_idx ON coaching.lesson_sessions USING btree (tenant_id, starts_at);

--
-- Name: lesson_sessions_tenant_id_status_idx; Type: INDEX; Schema: coaching; Owner: -
--

CREATE INDEX lesson_sessions_tenant_id_status_idx ON coaching.lesson_sessions USING btree (tenant_id, status);

--
-- Name: lesson_types_tenant_id_idx; Type: INDEX; Schema: coaching; Owner: -
--

CREATE INDEX lesson_types_tenant_id_idx ON coaching.lesson_types USING btree (tenant_id);

--
-- Name: lesson_types_tenant_id_is_active_idx; Type: INDEX; Schema: coaching; Owner: -
--

CREATE INDEX lesson_types_tenant_id_is_active_idx ON coaching.lesson_types USING btree (tenant_id, is_active);

--
-- Name: lesson_types_tenant_id_sport_idx; Type: INDEX; Schema: coaching; Owner: -
--

CREATE INDEX lesson_types_tenant_id_sport_idx ON coaching.lesson_types USING btree (tenant_id, sport);

--
-- Name: programme_sessions_coach_id_idx; Type: INDEX; Schema: coaching; Owner: -
--

CREATE INDEX programme_sessions_coach_id_idx ON coaching.programme_sessions USING btree (coach_id);

--
-- Name: programme_sessions_programme_id_idx; Type: INDEX; Schema: coaching; Owner: -
--

CREATE INDEX programme_sessions_programme_id_idx ON coaching.programme_sessions USING btree (programme_id);

--
-- Name: programme_sessions_tenant_id_idx; Type: INDEX; Schema: coaching; Owner: -
--

CREATE INDEX programme_sessions_tenant_id_idx ON coaching.programme_sessions USING btree (tenant_id);

--
-- Name: programme_sessions_tenant_id_starts_at_idx; Type: INDEX; Schema: coaching; Owner: -
--

CREATE INDEX programme_sessions_tenant_id_starts_at_idx ON coaching.programme_sessions USING btree (tenant_id, starts_at);

--
-- Name: programmes_coach_id_idx; Type: INDEX; Schema: coaching; Owner: -
--

CREATE INDEX programmes_coach_id_idx ON coaching.programmes USING btree (coach_id);

--
-- Name: programmes_tenant_id_idx; Type: INDEX; Schema: coaching; Owner: -
--

CREATE INDEX programmes_tenant_id_idx ON coaching.programmes USING btree (tenant_id);

--
-- Name: programmes_tenant_id_sport_idx; Type: INDEX; Schema: coaching; Owner: -
--

CREATE INDEX programmes_tenant_id_sport_idx ON coaching.programmes USING btree (tenant_id, sport);

--
-- Name: programmes_tenant_id_status_idx; Type: INDEX; Schema: coaching; Owner: -
--

CREATE INDEX programmes_tenant_id_status_idx ON coaching.programmes USING btree (tenant_id, status);

--
-- Name: attendances attendances_enrolment_id_fkey; Type: FK CONSTRAINT; Schema: coaching; Owner: -
--

ALTER TABLE ONLY coaching.attendances
    ADD CONSTRAINT attendances_enrolment_id_fkey FOREIGN KEY (enrolment_id) REFERENCES coaching.enrolments(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: attendances attendances_programme_session_id_fkey; Type: FK CONSTRAINT; Schema: coaching; Owner: -
--

ALTER TABLE ONLY coaching.attendances
    ADD CONSTRAINT attendances_programme_session_id_fkey FOREIGN KEY (programme_session_id) REFERENCES coaching.programme_sessions(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: coach_availability coach_availability_coach_id_fkey; Type: FK CONSTRAINT; Schema: coaching; Owner: -
--

ALTER TABLE ONLY coaching.coach_availability
    ADD CONSTRAINT coach_availability_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES coaching.coaches(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: coach_blocks coach_blocks_coach_id_fkey; Type: FK CONSTRAINT; Schema: coaching; Owner: -
--

ALTER TABLE ONLY coaching.coach_blocks
    ADD CONSTRAINT coach_blocks_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES coaching.coaches(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: coach_lesson_types coach_lesson_types_coach_id_fkey; Type: FK CONSTRAINT; Schema: coaching; Owner: -
--

ALTER TABLE ONLY coaching.coach_lesson_types
    ADD CONSTRAINT coach_lesson_types_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES coaching.coaches(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: coach_lesson_types coach_lesson_types_lesson_type_id_fkey; Type: FK CONSTRAINT; Schema: coaching; Owner: -
--

ALTER TABLE ONLY coaching.coach_lesson_types
    ADD CONSTRAINT coach_lesson_types_lesson_type_id_fkey FOREIGN KEY (lesson_type_id) REFERENCES coaching.lesson_types(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: enrolments enrolments_programme_id_fkey; Type: FK CONSTRAINT; Schema: coaching; Owner: -
--

ALTER TABLE ONLY coaching.enrolments
    ADD CONSTRAINT enrolments_programme_id_fkey FOREIGN KEY (programme_id) REFERENCES coaching.programmes(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: lesson_sessions lesson_sessions_coach_id_fkey; Type: FK CONSTRAINT; Schema: coaching; Owner: -
--

ALTER TABLE ONLY coaching.lesson_sessions
    ADD CONSTRAINT lesson_sessions_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES coaching.coaches(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: lesson_sessions lesson_sessions_lesson_type_id_fkey; Type: FK CONSTRAINT; Schema: coaching; Owner: -
--

ALTER TABLE ONLY coaching.lesson_sessions
    ADD CONSTRAINT lesson_sessions_lesson_type_id_fkey FOREIGN KEY (lesson_type_id) REFERENCES coaching.lesson_types(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: programme_sessions programme_sessions_coach_id_fkey; Type: FK CONSTRAINT; Schema: coaching; Owner: -
--

ALTER TABLE ONLY coaching.programme_sessions
    ADD CONSTRAINT programme_sessions_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES coaching.coaches(id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: programme_sessions programme_sessions_programme_id_fkey; Type: FK CONSTRAINT; Schema: coaching; Owner: -
--

ALTER TABLE ONLY coaching.programme_sessions
    ADD CONSTRAINT programme_sessions_programme_id_fkey FOREIGN KEY (programme_id) REFERENCES coaching.programmes(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: programmes programmes_coach_id_fkey; Type: FK CONSTRAINT; Schema: coaching; Owner: -
--

ALTER TABLE ONLY coaching.programmes
    ADD CONSTRAINT programmes_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES coaching.coaches(id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- PostgreSQL database dump complete
--

