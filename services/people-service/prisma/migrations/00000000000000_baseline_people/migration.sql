-- Baseline for the "people" schema.
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
-- Name: people; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS people;

--
-- Name: set_segments_updated_at(); Type: FUNCTION; Schema: people; Owner: -
--

CREATE FUNCTION people.set_segments_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

--
-- Name: household_members; Type: TABLE; Schema: people; Owner: -
--

CREATE TABLE people.household_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    household_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    role text DEFAULT 'member'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL
);

--
-- Name: households; Type: TABLE; Schema: people; Owner: -
--

CREATE TABLE people.households (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL
);

--
-- Name: lifecycle_history; Type: TABLE; Schema: people; Owner: -
--

CREATE TABLE people.lifecycle_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    from_state text,
    to_state text NOT NULL,
    reason text,
    changed_by text,
    changed_at timestamp(3) without time zone DEFAULT now() NOT NULL
);

--
-- Name: person_activities; Type: TABLE; Schema: people; Owner: -
--

CREATE TABLE people.person_activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    person_id uuid NOT NULL,
    event_type text NOT NULL,
    title text NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    source_id text,
    occurred_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: person_relationships; Type: TABLE; Schema: people; Owner: -
--

CREATE TABLE people.person_relationships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    from_customer_id uuid NOT NULL,
    to_customer_id uuid NOT NULL,
    relationship text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL
);

--
-- Name: person_roles; Type: TABLE; Schema: people; Owner: -
--

CREATE TABLE people.person_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    role text NOT NULL,
    context_type text,
    context_id uuid,
    context_label text,
    status text DEFAULT 'active'::text NOT NULL,
    starts_at date,
    ends_at date,
    notes text,
    assigned_by text,
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL
);

--
-- Name: person_tags; Type: TABLE; Schema: people; Owner: -
--

CREATE TABLE people.person_tags (
    customer_id uuid NOT NULL,
    tag_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    applied_by text,
    applied_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    expires_at timestamp(3) without time zone
);

--
-- Name: persons; Type: TABLE; Schema: people; Owner: -
--

CREATE TABLE people.persons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    first_name text,
    last_name text,
    email text,
    phone text,
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    marketing_consent boolean DEFAULT false NOT NULL,
    consent_recorded_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    lifecycle_state text DEFAULT 'active'::text NOT NULL,
    lifecycle_changed_at timestamp with time zone,
    source text DEFAULT 'admin'::text,
    date_of_birth date,
    avatar_url text,
    comms_preferences jsonb DEFAULT '{}'::jsonb NOT NULL,
    engagement_score smallint,
    engagement_band text,
    last_activity_at timestamp with time zone,
    merged_into_id uuid,
    is_primary boolean DEFAULT true NOT NULL,
    address_line1 text,
    address_line2 text,
    city text,
    county text,
    postcode text,
    country text DEFAULT 'GB'::text
);

--
-- Name: segment_memberships; Type: TABLE; Schema: people; Owner: -
--

CREATE TABLE people.segment_memberships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    segment_id uuid NOT NULL,
    person_id uuid NOT NULL,
    added_at timestamp with time zone DEFAULT now() NOT NULL,
    added_by text
);

--
-- Name: segments; Type: TABLE; Schema: people; Owner: -
--

CREATE TABLE people.segments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    type text DEFAULT 'static'::text NOT NULL,
    conditions jsonb DEFAULT '[]'::jsonb NOT NULL,
    member_count integer DEFAULT 0 NOT NULL,
    last_built_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: tags; Type: TABLE; Schema: people; Owner: -
--

CREATE TABLE people.tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    colour text,
    source text DEFAULT 'manual'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: persons customers_pkey; Type: CONSTRAINT; Schema: people; Owner: -
--

ALTER TABLE ONLY people.persons
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);

--
-- Name: household_members household_members_household_id_customer_id_key; Type: CONSTRAINT; Schema: people; Owner: -
--

ALTER TABLE ONLY people.household_members
    ADD CONSTRAINT household_members_household_id_customer_id_key UNIQUE (household_id, customer_id);

--
-- Name: household_members household_members_pkey; Type: CONSTRAINT; Schema: people; Owner: -
--

ALTER TABLE ONLY people.household_members
    ADD CONSTRAINT household_members_pkey PRIMARY KEY (id);

--
-- Name: households households_pkey; Type: CONSTRAINT; Schema: people; Owner: -
--

ALTER TABLE ONLY people.households
    ADD CONSTRAINT households_pkey PRIMARY KEY (id);

--
-- Name: lifecycle_history lifecycle_history_pkey; Type: CONSTRAINT; Schema: people; Owner: -
--

ALTER TABLE ONLY people.lifecycle_history
    ADD CONSTRAINT lifecycle_history_pkey PRIMARY KEY (id);

--
-- Name: person_activities person_activities_pkey; Type: CONSTRAINT; Schema: people; Owner: -
--

ALTER TABLE ONLY people.person_activities
    ADD CONSTRAINT person_activities_pkey PRIMARY KEY (id);

--
-- Name: person_relationships person_relationships_from_customer_id_to_customer_id_relati_key; Type: CONSTRAINT; Schema: people; Owner: -
--

ALTER TABLE ONLY people.person_relationships
    ADD CONSTRAINT person_relationships_from_customer_id_to_customer_id_relati_key UNIQUE (from_customer_id, to_customer_id, relationship);

--
-- Name: person_relationships person_relationships_pkey; Type: CONSTRAINT; Schema: people; Owner: -
--

ALTER TABLE ONLY people.person_relationships
    ADD CONSTRAINT person_relationships_pkey PRIMARY KEY (id);

--
-- Name: person_roles person_roles_pkey; Type: CONSTRAINT; Schema: people; Owner: -
--

ALTER TABLE ONLY people.person_roles
    ADD CONSTRAINT person_roles_pkey PRIMARY KEY (id);

--
-- Name: person_tags person_tags_pkey; Type: CONSTRAINT; Schema: people; Owner: -
--

ALTER TABLE ONLY people.person_tags
    ADD CONSTRAINT person_tags_pkey PRIMARY KEY (customer_id, tag_id);

--
-- Name: segment_memberships segment_memberships_pkey; Type: CONSTRAINT; Schema: people; Owner: -
--

ALTER TABLE ONLY people.segment_memberships
    ADD CONSTRAINT segment_memberships_pkey PRIMARY KEY (id);

--
-- Name: segment_memberships segment_memberships_segment_id_person_id_key; Type: CONSTRAINT; Schema: people; Owner: -
--

ALTER TABLE ONLY people.segment_memberships
    ADD CONSTRAINT segment_memberships_segment_id_person_id_key UNIQUE (segment_id, person_id);

--
-- Name: segments segments_pkey; Type: CONSTRAINT; Schema: people; Owner: -
--

ALTER TABLE ONLY people.segments
    ADD CONSTRAINT segments_pkey PRIMARY KEY (id);

--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: people; Owner: -
--

ALTER TABLE ONLY people.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);

--
-- Name: tags tags_tenant_id_name_key; Type: CONSTRAINT; Schema: people; Owner: -
--

ALTER TABLE ONLY people.tags
    ADD CONSTRAINT tags_tenant_id_name_key UNIQUE (tenant_id, name);

--
-- Name: customers_tenant_email_idx; Type: INDEX; Schema: people; Owner: -
--

CREATE INDEX customers_tenant_email_idx ON people.persons USING btree (tenant_id, email);

--
-- Name: customers_tenant_id_email_idx; Type: INDEX; Schema: people; Owner: -
--

CREATE INDEX customers_tenant_id_email_idx ON people.persons USING btree (tenant_id, email);

--
-- Name: customers_tenant_id_idx; Type: INDEX; Schema: people; Owner: -
--

CREATE INDEX customers_tenant_id_idx ON people.persons USING btree (tenant_id);

--
-- Name: idx_customers_tenant_engagement; Type: INDEX; Schema: people; Owner: -
--

CREATE INDEX idx_customers_tenant_engagement ON people.persons USING btree (tenant_id, engagement_band);

--
-- Name: idx_customers_tenant_lifecycle; Type: INDEX; Schema: people; Owner: -
--

CREATE INDEX idx_customers_tenant_lifecycle ON people.persons USING btree (tenant_id, lifecycle_state);

--
-- Name: idx_household_members_customer; Type: INDEX; Schema: people; Owner: -
--

CREATE INDEX idx_household_members_customer ON people.household_members USING btree (customer_id);

--
-- Name: idx_household_members_household; Type: INDEX; Schema: people; Owner: -
--

CREATE INDEX idx_household_members_household ON people.household_members USING btree (household_id);

--
-- Name: idx_household_members_tenant; Type: INDEX; Schema: people; Owner: -
--

CREATE INDEX idx_household_members_tenant ON people.household_members USING btree (tenant_id);

--
-- Name: idx_households_tenant; Type: INDEX; Schema: people; Owner: -
--

CREATE INDEX idx_households_tenant ON people.households USING btree (tenant_id);

--
-- Name: idx_lifecycle_history_tenant; Type: INDEX; Schema: people; Owner: -
--

CREATE INDEX idx_lifecycle_history_tenant ON people.lifecycle_history USING btree (tenant_id);

--
-- Name: idx_person_activities_event_type; Type: INDEX; Schema: people; Owner: -
--

CREATE INDEX idx_person_activities_event_type ON people.person_activities USING btree (tenant_id, event_type);

--
-- Name: idx_person_activities_person; Type: INDEX; Schema: people; Owner: -
--

CREATE INDEX idx_person_activities_person ON people.person_activities USING btree (tenant_id, person_id, occurred_at DESC);

--
-- Name: idx_person_relationships_from; Type: INDEX; Schema: people; Owner: -
--

CREATE INDEX idx_person_relationships_from ON people.person_relationships USING btree (from_customer_id);

--
-- Name: idx_person_relationships_tenant; Type: INDEX; Schema: people; Owner: -
--

CREATE INDEX idx_person_relationships_tenant ON people.person_relationships USING btree (tenant_id);

--
-- Name: idx_person_relationships_to; Type: INDEX; Schema: people; Owner: -
--

CREATE INDEX idx_person_relationships_to ON people.person_relationships USING btree (to_customer_id);

--
-- Name: idx_person_roles_customer; Type: INDEX; Schema: people; Owner: -
--

CREATE INDEX idx_person_roles_customer ON people.person_roles USING btree (customer_id);

--
-- Name: idx_person_roles_tenant; Type: INDEX; Schema: people; Owner: -
--

CREATE INDEX idx_person_roles_tenant ON people.person_roles USING btree (tenant_id);

--
-- Name: idx_person_roles_tenant_role; Type: INDEX; Schema: people; Owner: -
--

CREATE INDEX idx_person_roles_tenant_role ON people.person_roles USING btree (tenant_id, role);

--
-- Name: idx_person_tags_customer; Type: INDEX; Schema: people; Owner: -
--

CREATE INDEX idx_person_tags_customer ON people.person_tags USING btree (customer_id);

--
-- Name: idx_person_tags_tag; Type: INDEX; Schema: people; Owner: -
--

CREATE INDEX idx_person_tags_tag ON people.person_tags USING btree (tag_id);

--
-- Name: idx_person_tags_tenant; Type: INDEX; Schema: people; Owner: -
--

CREATE INDEX idx_person_tags_tenant ON people.person_tags USING btree (tenant_id);

--
-- Name: idx_segment_memberships_person; Type: INDEX; Schema: people; Owner: -
--

CREATE INDEX idx_segment_memberships_person ON people.segment_memberships USING btree (tenant_id, person_id);

--
-- Name: idx_segment_memberships_segment; Type: INDEX; Schema: people; Owner: -
--

CREATE INDEX idx_segment_memberships_segment ON people.segment_memberships USING btree (segment_id);

--
-- Name: idx_segments_tenant; Type: INDEX; Schema: people; Owner: -
--

CREATE INDEX idx_segments_tenant ON people.segments USING btree (tenant_id);

--
-- Name: idx_segments_tenant_type; Type: INDEX; Schema: people; Owner: -
--

CREATE INDEX idx_segments_tenant_type ON people.segments USING btree (tenant_id, type);

--
-- Name: idx_tags_tenant; Type: INDEX; Schema: people; Owner: -
--

CREATE INDEX idx_tags_tenant ON people.tags USING btree (tenant_id);

--
-- Name: segments trg_segments_updated_at; Type: TRIGGER; Schema: people; Owner: -
--

CREATE TRIGGER trg_segments_updated_at BEFORE UPDATE ON people.segments FOR EACH ROW EXECUTE FUNCTION people.set_segments_updated_at();

--
-- Name: person_activities person_activities_person_id_fkey; Type: FK CONSTRAINT; Schema: people; Owner: -
--

ALTER TABLE ONLY people.person_activities
    ADD CONSTRAINT person_activities_person_id_fkey FOREIGN KEY (person_id) REFERENCES people.persons(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: segment_memberships segment_memberships_person_id_fkey; Type: FK CONSTRAINT; Schema: people; Owner: -
--

ALTER TABLE ONLY people.segment_memberships
    ADD CONSTRAINT segment_memberships_person_id_fkey FOREIGN KEY (person_id) REFERENCES people.persons(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: segment_memberships segment_memberships_segment_id_fkey; Type: FK CONSTRAINT; Schema: people; Owner: -
--

ALTER TABLE ONLY people.segment_memberships
    ADD CONSTRAINT segment_memberships_segment_id_fkey FOREIGN KEY (segment_id) REFERENCES people.segments(id) ON DELETE CASCADE;

--
-- PostgreSQL database dump complete
--

