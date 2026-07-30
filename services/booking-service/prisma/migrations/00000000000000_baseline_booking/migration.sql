-- Baseline for the "booking" schema.
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


CREATE EXTENSION IF NOT EXISTS btree_gist;

--
-- PostgreSQL database dump
--

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.3 (Homebrew)

--
-- Name: booking; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS booking;

--
-- Name: check_unit_availability(uuid, uuid, timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: booking; Owner: -
--

-- REMOVED: booking.check_unit_availability()
--
-- Dropped from the baseline deliberately. It referenced venue.bookable_unit_conflicts,
-- a table that does not exist (the real table is venue.unit_conflicts) — a leftover from
-- an earlier rename. It is called from no application code and would error if invoked,
-- and Postgres validates function bodies at creation, so keeping it made the schema
-- unbuildable from empty. Availability conflicts are computed in
-- availability.repository.ts, not in the database.


--
-- Name: set_booking_participants_updated_at(); Type: FUNCTION; Schema: booking; Owner: -
--

CREATE FUNCTION booking.set_booking_participants_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

--
-- Name: set_payment_splits_updated_at(); Type: FUNCTION; Schema: booking; Owner: -
--

CREATE FUNCTION booking.set_payment_splits_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

--
-- Name: set_pricing_rules_updated_at(); Type: FUNCTION; Schema: booking; Owner: -
--

CREATE FUNCTION booking.set_pricing_rules_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

--
-- Name: set_session_participants_updated_at(); Type: FUNCTION; Schema: booking; Owner: -
--

CREATE FUNCTION booking.set_session_participants_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

--
-- Name: set_sessions_updated_at(); Type: FUNCTION; Schema: booking; Owner: -
--

CREATE FUNCTION booking.set_sessions_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

--
-- Name: booking_add_ons; Type: TABLE; Schema: booking; Owner: -
--

CREATE TABLE booking.booking_add_ons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    add_on_id uuid NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    currency character(3) DEFAULT 'GBP'::text NOT NULL,
    starts_at timestamp(3) without time zone NOT NULL,
    ends_at timestamp(3) without time zone NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL
);

--
-- Name: booking_participants; Type: TABLE; Schema: booking; Owner: -
--

CREATE TABLE booking.booking_participants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    person_id uuid,
    name text NOT NULL,
    email text,
    phone text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: booking_payment_splits; Type: TABLE; Schema: booking; Owner: -
--

CREATE TABLE booking.booking_payment_splits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    payer_person_id uuid,
    payer_name text NOT NULL,
    payer_email text,
    amount_due numeric(10,2) NOT NULL,
    amount_paid numeric(10,2) DEFAULT 0 NOT NULL,
    currency character(3) DEFAULT 'GBP'::bpchar NOT NULL,
    payment_status text DEFAULT 'unpaid'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: booking_rule_purpose_prices; Type: TABLE; Schema: booking; Owner: -
--

CREATE TABLE booking.booking_rule_purpose_prices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rule_id uuid NOT NULL,
    purpose text NOT NULL,
    price numeric(10,2) NOT NULL,
    currency character varying(3) DEFAULT 'GBP'::character varying NOT NULL
);

--
-- Name: booking_rules; Type: TABLE; Schema: booking; Owner: -
--

CREATE TABLE booking.booking_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    subject_type text DEFAULT 'everyone'::character varying NOT NULL,
    subject_ref text,
    scope_type text DEFAULT 'organisation'::character varying NOT NULL,
    scope_id uuid,
    days_of_week integer[],
    time_from text,
    time_to text,
    can_book boolean DEFAULT true NOT NULL,
    requires_approval boolean DEFAULT false NOT NULL,
    advance_days integer,
    min_slot_minutes integer,
    max_slot_minutes integer,
    booking_period_days integer,
    max_bookings_per_period integer,
    allow_series boolean DEFAULT true NOT NULL,
    price_per_slot numeric(10,2),
    price_currency character varying(3) DEFAULT 'GBP'::character varying NOT NULL,
    min_participants integer,
    max_participants integer,
    priority integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL
);

--
-- Name: booking_series; Type: TABLE; Schema: booking; Owner: -
--

CREATE TABLE booking.booking_series (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    organisation_id uuid,
    venue_id uuid NOT NULL,
    resource_id uuid NOT NULL,
    bookable_unit_id uuid NOT NULL,
    customer_id uuid,
    booking_source text,
    rrule text NOT NULL,
    slot_starts_at text NOT NULL,
    slot_ends_at text NOT NULL,
    payment_status text DEFAULT 'unpaid'::character varying NOT NULL,
    notes text,
    status text DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    min_sessions integer,
    max_sessions integer,
    price_per_session numeric(10,2),
    discount_pct numeric(5,2),
    currency character(3) DEFAULT 'GBP'::bpchar NOT NULL
);

--
-- Name: bookings; Type: TABLE; Schema: booking; Owner: -
--

CREATE TABLE booking.bookings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    venue_id uuid NOT NULL,
    resource_id uuid NOT NULL,
    bookable_unit_id uuid NOT NULL,
    customer_id uuid,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    booking_reference text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    cancelled_at timestamp with time zone,
    booking_source text,
    organisation_id uuid,
    payment_status character varying(20) DEFAULT 'unpaid'::character varying NOT NULL,
    series_id uuid,
    optional_unit_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    approved_by text,
    approved_at timestamp with time zone,
    admin_override boolean DEFAULT false NOT NULL,
    price numeric(10,2),
    currency character(3) DEFAULT 'GBP'::bpchar NOT NULL,
    lesson_type_id uuid,
    coach_id uuid,
    reminder_sent_at timestamp with time zone,
    booked_for_person_id uuid,
    refund_pct numeric(5,2),
    refund_amount numeric(10,2),
    refund_status text,
    CONSTRAINT chk_booking_status CHECK ((status = ANY (ARRAY['active'::text, 'cancelled'::text, 'pending'::text]))),
    CONSTRAINT chk_booking_time_range CHECK ((ends_at > starts_at))
);

--
-- Name: pricing_rules; Type: TABLE; Schema: booking; Owner: -
--

CREATE TABLE booking.pricing_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    label text,
    description text,
    scope_type text DEFAULT 'organisation'::text NOT NULL,
    scope_id uuid,
    days_of_week integer[] DEFAULT '{}'::integer[] NOT NULL,
    time_from text,
    time_to text,
    rate_per_hour numeric(10,2) NOT NULL,
    currency character varying(3) DEFAULT 'GBP'::character varying NOT NULL,
    lighting_surcharge_per_hour numeric(10,2),
    member_discount_pct numeric(5,2),
    priority integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: refund_policies; Type: TABLE; Schema: booking; Owner: -
--

CREATE TABLE booking.refund_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    venue_id uuid,
    hours_before_start integer NOT NULL,
    refund_pct numeric(5,2) NOT NULL,
    priority integer DEFAULT 100 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: session_participants; Type: TABLE; Schema: booking; Owner: -
--

CREATE TABLE booking.session_participants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    customer_id uuid,
    participant_name text NOT NULL,
    participant_email text,
    status text DEFAULT 'registered'::text NOT NULL,
    payment_status text DEFAULT 'unpaid'::text NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: sessions; Type: TABLE; Schema: booking; Owner: -
--

CREATE TABLE booking.sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    organisation_id uuid,
    venue_id uuid NOT NULL,
    resource_id uuid NOT NULL,
    bookable_unit_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    price_per_participant numeric(10,2),
    currency character(3) DEFAULT 'GBP'::bpchar NOT NULL,
    min_participants integer,
    max_participants integer,
    status text DEFAULT 'open'::text NOT NULL,
    coach_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: booking_add_ons booking_add_ons_pkey; Type: CONSTRAINT; Schema: booking; Owner: -
--

ALTER TABLE ONLY booking.booking_add_ons
    ADD CONSTRAINT booking_add_ons_pkey PRIMARY KEY (id);

--
-- Name: booking_participants booking_participants_pkey; Type: CONSTRAINT; Schema: booking; Owner: -
--

ALTER TABLE ONLY booking.booking_participants
    ADD CONSTRAINT booking_participants_pkey PRIMARY KEY (id);

--
-- Name: booking_payment_splits booking_payment_splits_pkey; Type: CONSTRAINT; Schema: booking; Owner: -
--

ALTER TABLE ONLY booking.booking_payment_splits
    ADD CONSTRAINT booking_payment_splits_pkey PRIMARY KEY (id);

--
-- Name: booking_rule_purpose_prices booking_rule_purpose_prices_pkey; Type: CONSTRAINT; Schema: booking; Owner: -
--

ALTER TABLE ONLY booking.booking_rule_purpose_prices
    ADD CONSTRAINT booking_rule_purpose_prices_pkey PRIMARY KEY (id);

--
-- Name: booking_rule_purpose_prices booking_rule_purpose_prices_rule_id_purpose_key; Type: CONSTRAINT; Schema: booking; Owner: -
--

ALTER TABLE ONLY booking.booking_rule_purpose_prices
    ADD CONSTRAINT booking_rule_purpose_prices_rule_id_purpose_key UNIQUE (rule_id, purpose);

--
-- Name: booking_rules booking_rules_pkey; Type: CONSTRAINT; Schema: booking; Owner: -
--

ALTER TABLE ONLY booking.booking_rules
    ADD CONSTRAINT booking_rules_pkey PRIMARY KEY (id);

--
-- Name: booking_series booking_series_pkey; Type: CONSTRAINT; Schema: booking; Owner: -
--

ALTER TABLE ONLY booking.booking_series
    ADD CONSTRAINT booking_series_pkey PRIMARY KEY (id);

--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: booking; Owner: -
--

ALTER TABLE ONLY booking.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);

--
-- Name: bookings no_overlapping_active_bookings; Type: CONSTRAINT; Schema: booking; Owner: -
--

ALTER TABLE ONLY booking.bookings
    ADD CONSTRAINT no_overlapping_active_bookings EXCLUDE USING gist (tenant_id WITH =, bookable_unit_id WITH =, tstzrange(starts_at, ends_at, '[)'::text) WITH &&) WHERE ((status <> 'cancelled'::text));

--
-- Name: pricing_rules pricing_rules_pkey; Type: CONSTRAINT; Schema: booking; Owner: -
--

ALTER TABLE ONLY booking.pricing_rules
    ADD CONSTRAINT pricing_rules_pkey PRIMARY KEY (id);

--
-- Name: refund_policies refund_policies_pkey; Type: CONSTRAINT; Schema: booking; Owner: -
--

ALTER TABLE ONLY booking.refund_policies
    ADD CONSTRAINT refund_policies_pkey PRIMARY KEY (id);

--
-- Name: session_participants session_participants_pkey; Type: CONSTRAINT; Schema: booking; Owner: -
--

ALTER TABLE ONLY booking.session_participants
    ADD CONSTRAINT session_participants_pkey PRIMARY KEY (id);

--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: booking; Owner: -
--

ALTER TABLE ONLY booking.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);

--
-- Name: booking_rule_purpose_prices_rule_idx; Type: INDEX; Schema: booking; Owner: -
--

CREATE INDEX booking_rule_purpose_prices_rule_idx ON booking.booking_rule_purpose_prices USING btree (rule_id);

--
-- Name: booking_rules_scope_idx; Type: INDEX; Schema: booking; Owner: -
--

CREATE INDEX booking_rules_scope_idx ON booking.booking_rules USING btree (tenant_id, scope_type, scope_id);

--
-- Name: booking_rules_tenant_active_idx; Type: INDEX; Schema: booking; Owner: -
--

CREATE INDEX booking_rules_tenant_active_idx ON booking.booking_rules USING btree (tenant_id, is_active);

--
-- Name: booking_rules_tenant_idx; Type: INDEX; Schema: booking; Owner: -
--

CREATE INDEX booking_rules_tenant_idx ON booking.booking_rules USING btree (tenant_id);

--
-- Name: booking_series_tenant_idx; Type: INDEX; Schema: booking; Owner: -
--

CREATE INDEX booking_series_tenant_idx ON booking.booking_series USING btree (tenant_id);

--
-- Name: booking_series_tenant_status_idx; Type: INDEX; Schema: booking; Owner: -
--

CREATE INDEX booking_series_tenant_status_idx ON booking.booking_series USING btree (tenant_id, status);

--
-- Name: bookings_series_id_idx; Type: INDEX; Schema: booking; Owner: -
--

CREATE INDEX bookings_series_id_idx ON booking.bookings USING btree (series_id) WHERE (series_id IS NOT NULL);

--
-- Name: bookings_tenant_customer_idx; Type: INDEX; Schema: booking; Owner: -
--

CREATE INDEX bookings_tenant_customer_idx ON booking.bookings USING btree (tenant_id, customer_id);

--
-- Name: bookings_tenant_id_idx; Type: INDEX; Schema: booking; Owner: -
--

CREATE INDEX bookings_tenant_id_idx ON booking.bookings USING btree (tenant_id);

--
-- Name: bookings_tenant_payment_status_idx; Type: INDEX; Schema: booking; Owner: -
--

CREATE INDEX bookings_tenant_payment_status_idx ON booking.bookings USING btree (tenant_id, payment_status);

--
-- Name: bookings_tenant_starts_ends_idx; Type: INDEX; Schema: booking; Owner: -
--

CREATE INDEX bookings_tenant_starts_ends_idx ON booking.bookings USING btree (tenant_id, starts_at, ends_at);

--
-- Name: bookings_tenant_status_idx; Type: INDEX; Schema: booking; Owner: -
--

CREATE INDEX bookings_tenant_status_idx ON booking.bookings USING btree (tenant_id, status);

--
-- Name: bookings_tenant_unit_idx; Type: INDEX; Schema: booking; Owner: -
--

CREATE INDEX bookings_tenant_unit_idx ON booking.bookings USING btree (tenant_id, bookable_unit_id);

--
-- Name: idx_booking_participants_booking_id; Type: INDEX; Schema: booking; Owner: -
--

CREATE INDEX idx_booking_participants_booking_id ON booking.booking_participants USING btree (booking_id);

--
-- Name: idx_booking_participants_tenant_booking; Type: INDEX; Schema: booking; Owner: -
--

CREATE INDEX idx_booking_participants_tenant_booking ON booking.booking_participants USING btree (tenant_id, booking_id);

--
-- Name: idx_booking_participants_tenant_person; Type: INDEX; Schema: booking; Owner: -
--

CREATE INDEX idx_booking_participants_tenant_person ON booking.booking_participants USING btree (tenant_id, person_id) WHERE (person_id IS NOT NULL);

--
-- Name: idx_booking_payment_splits_booking; Type: INDEX; Schema: booking; Owner: -
--

CREATE INDEX idx_booking_payment_splits_booking ON booking.booking_payment_splits USING btree (booking_id);

--
-- Name: idx_booking_payment_splits_tenant; Type: INDEX; Schema: booking; Owner: -
--

CREATE INDEX idx_booking_payment_splits_tenant ON booking.booking_payment_splits USING btree (tenant_id, booking_id);

--
-- Name: idx_bookings_booked_for; Type: INDEX; Schema: booking; Owner: -
--

CREATE INDEX idx_bookings_booked_for ON booking.bookings USING btree (tenant_id, booked_for_person_id) WHERE (booked_for_person_id IS NOT NULL);

--
-- Name: idx_bookings_reminder; Type: INDEX; Schema: booking; Owner: -
--

CREATE INDEX idx_bookings_reminder ON booking.bookings USING btree (starts_at, status) WHERE (reminder_sent_at IS NULL);

--
-- Name: idx_bookings_tenant_id; Type: INDEX; Schema: booking; Owner: -
--

CREATE INDEX idx_bookings_tenant_id ON booking.bookings USING btree (tenant_id);

--
-- Name: idx_refund_policies_tenant; Type: INDEX; Schema: booking; Owner: -
--

CREATE INDEX idx_refund_policies_tenant ON booking.refund_policies USING btree (tenant_id);

--
-- Name: idx_refund_policies_tenant_active; Type: INDEX; Schema: booking; Owner: -
--

CREATE INDEX idx_refund_policies_tenant_active ON booking.refund_policies USING btree (tenant_id, is_active);

--
-- Name: idx_refund_policies_venue; Type: INDEX; Schema: booking; Owner: -
--

CREATE INDEX idx_refund_policies_venue ON booking.refund_policies USING btree (tenant_id, venue_id);

--
-- Name: pricing_rules_scope_idx; Type: INDEX; Schema: booking; Owner: -
--

CREATE INDEX pricing_rules_scope_idx ON booking.pricing_rules USING btree (tenant_id, scope_type, scope_id);

--
-- Name: pricing_rules_tenant_active_idx; Type: INDEX; Schema: booking; Owner: -
--

CREATE INDEX pricing_rules_tenant_active_idx ON booking.pricing_rules USING btree (tenant_id, is_active);

--
-- Name: pricing_rules_tenant_idx; Type: INDEX; Schema: booking; Owner: -
--

CREATE INDEX pricing_rules_tenant_idx ON booking.pricing_rules USING btree (tenant_id);

--
-- Name: session_participants_customer_idx; Type: INDEX; Schema: booking; Owner: -
--

CREATE INDEX session_participants_customer_idx ON booking.session_participants USING btree (tenant_id, customer_id);

--
-- Name: session_participants_session_idx; Type: INDEX; Schema: booking; Owner: -
--

CREATE INDEX session_participants_session_idx ON booking.session_participants USING btree (session_id);

--
-- Name: session_participants_tenant_idx; Type: INDEX; Schema: booking; Owner: -
--

CREATE INDEX session_participants_tenant_idx ON booking.session_participants USING btree (tenant_id, session_id);

--
-- Name: sessions_tenant_idx; Type: INDEX; Schema: booking; Owner: -
--

CREATE INDEX sessions_tenant_idx ON booking.sessions USING btree (tenant_id);

--
-- Name: sessions_tenant_starts_idx; Type: INDEX; Schema: booking; Owner: -
--

CREATE INDEX sessions_tenant_starts_idx ON booking.sessions USING btree (tenant_id, starts_at);

--
-- Name: sessions_tenant_status_idx; Type: INDEX; Schema: booking; Owner: -
--

CREATE INDEX sessions_tenant_status_idx ON booking.sessions USING btree (tenant_id, status);

--
-- Name: sessions_unit_idx; Type: INDEX; Schema: booking; Owner: -
--

CREATE INDEX sessions_unit_idx ON booking.sessions USING btree (tenant_id, bookable_unit_id);

--
-- Name: pricing_rules set_pricing_rules_updated_at; Type: TRIGGER; Schema: booking; Owner: -
--

CREATE TRIGGER set_pricing_rules_updated_at BEFORE UPDATE ON booking.pricing_rules FOR EACH ROW EXECUTE FUNCTION booking.set_pricing_rules_updated_at();

--
-- Name: session_participants set_session_participants_updated_at; Type: TRIGGER; Schema: booking; Owner: -
--

CREATE TRIGGER set_session_participants_updated_at BEFORE UPDATE ON booking.session_participants FOR EACH ROW EXECUTE FUNCTION booking.set_session_participants_updated_at();

--
-- Name: sessions set_sessions_updated_at; Type: TRIGGER; Schema: booking; Owner: -
--

CREATE TRIGGER set_sessions_updated_at BEFORE UPDATE ON booking.sessions FOR EACH ROW EXECUTE FUNCTION booking.set_sessions_updated_at();

--
-- Name: booking_participants trg_booking_participants_updated_at; Type: TRIGGER; Schema: booking; Owner: -
--

CREATE TRIGGER trg_booking_participants_updated_at BEFORE UPDATE ON booking.booking_participants FOR EACH ROW EXECUTE FUNCTION booking.set_booking_participants_updated_at();

--
-- Name: booking_payment_splits trg_payment_splits_updated_at; Type: TRIGGER; Schema: booking; Owner: -
--

CREATE TRIGGER trg_payment_splits_updated_at BEFORE UPDATE ON booking.booking_payment_splits FOR EACH ROW EXECUTE FUNCTION booking.set_payment_splits_updated_at();

--
-- Name: booking_participants booking_participants_booking_id_fkey; Type: FK CONSTRAINT; Schema: booking; Owner: -
--

ALTER TABLE ONLY booking.booking_participants
    ADD CONSTRAINT booking_participants_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES booking.bookings(id) ON DELETE CASCADE;

--
-- Name: booking_payment_splits booking_payment_splits_booking_id_fkey; Type: FK CONSTRAINT; Schema: booking; Owner: -
--

ALTER TABLE ONLY booking.booking_payment_splits
    ADD CONSTRAINT booking_payment_splits_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES booking.bookings(id) ON DELETE CASCADE;

--
-- Name: session_participants session_participants_session_id_fkey; Type: FK CONSTRAINT; Schema: booking; Owner: -
--

ALTER TABLE ONLY booking.session_participants
    ADD CONSTRAINT session_participants_session_id_fkey FOREIGN KEY (session_id) REFERENCES booking.sessions(id) ON DELETE CASCADE;

--
-- PostgreSQL database dump complete
--

