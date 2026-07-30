-- Baseline for the "analytics" schema.
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
-- Name: analytics; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS analytics;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: analytics; Owner: -
--

CREATE FUNCTION analytics.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

--
-- Name: anomaly_flags; Type: TABLE; Schema: analytics; Owner: -
--

CREATE TABLE analytics.anomaly_flags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    person_id uuid,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    rule_id text NOT NULL,
    severity text NOT NULL,
    description text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: forecast_slots; Type: TABLE; Schema: analytics; Owner: -
--

CREATE TABLE analytics.forecast_slots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    unit_id uuid NOT NULL,
    forecast_date date NOT NULL,
    hour_slot integer NOT NULL,
    predicted_occupancy double precision NOT NULL,
    historical_weeks integer DEFAULT 0 NOT NULL,
    is_dead_slot boolean DEFAULT false NOT NULL,
    computed_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: member_scores; Type: TABLE; Schema: analytics; Owner: -
--

CREATE TABLE analytics.member_scores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    person_id uuid NOT NULL,
    churn_risk integer DEFAULT 0 NOT NULL,
    churn_band text DEFAULT 'low'::text NOT NULL,
    churn_factors jsonb DEFAULT '{}'::jsonb NOT NULL,
    ltv_score integer DEFAULT 0 NOT NULL,
    ltv_factors jsonb DEFAULT '{}'::jsonb NOT NULL,
    default_risk integer DEFAULT 0 NOT NULL,
    default_band text DEFAULT 'low'::text NOT NULL,
    default_factors jsonb DEFAULT '{}'::jsonb NOT NULL,
    optimal_send_hour integer,
    send_hour_confidence double precision,
    computed_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: anomaly_flags anomaly_flags_pkey; Type: CONSTRAINT; Schema: analytics; Owner: -
--

ALTER TABLE ONLY analytics.anomaly_flags
    ADD CONSTRAINT anomaly_flags_pkey PRIMARY KEY (id);

--
-- Name: forecast_slots forecast_slots_pkey; Type: CONSTRAINT; Schema: analytics; Owner: -
--

ALTER TABLE ONLY analytics.forecast_slots
    ADD CONSTRAINT forecast_slots_pkey PRIMARY KEY (id);

--
-- Name: forecast_slots forecast_slots_tenant_id_unit_id_forecast_date_hour_slot_key; Type: CONSTRAINT; Schema: analytics; Owner: -
--

ALTER TABLE ONLY analytics.forecast_slots
    ADD CONSTRAINT forecast_slots_tenant_id_unit_id_forecast_date_hour_slot_key UNIQUE (tenant_id, unit_id, forecast_date, hour_slot);

--
-- Name: member_scores member_scores_pkey; Type: CONSTRAINT; Schema: analytics; Owner: -
--

ALTER TABLE ONLY analytics.member_scores
    ADD CONSTRAINT member_scores_pkey PRIMARY KEY (id);

--
-- Name: member_scores member_scores_tenant_person_key; Type: CONSTRAINT; Schema: analytics; Owner: -
--

ALTER TABLE ONLY analytics.member_scores
    ADD CONSTRAINT member_scores_tenant_person_key UNIQUE (tenant_id, person_id);

--
-- Name: anomaly_flags_tenant_person_idx; Type: INDEX; Schema: analytics; Owner: -
--

CREATE INDEX anomaly_flags_tenant_person_idx ON analytics.anomaly_flags USING btree (tenant_id, person_id);

--
-- Name: anomaly_flags_tenant_resolved_idx; Type: INDEX; Schema: analytics; Owner: -
--

CREATE INDEX anomaly_flags_tenant_resolved_idx ON analytics.anomaly_flags USING btree (tenant_id, resolved_at);

--
-- Name: anomaly_flags_tenant_rule_idx; Type: INDEX; Schema: analytics; Owner: -
--

CREATE INDEX anomaly_flags_tenant_rule_idx ON analytics.anomaly_flags USING btree (tenant_id, rule_id);

--
-- Name: forecast_slots_tenant_date_dead_idx; Type: INDEX; Schema: analytics; Owner: -
--

CREATE INDEX forecast_slots_tenant_date_dead_idx ON analytics.forecast_slots USING btree (tenant_id, forecast_date, is_dead_slot);

--
-- Name: member_scores_tenant_churn_idx; Type: INDEX; Schema: analytics; Owner: -
--

CREATE INDEX member_scores_tenant_churn_idx ON analytics.member_scores USING btree (tenant_id, churn_risk);

--
-- Name: member_scores_tenant_default_idx; Type: INDEX; Schema: analytics; Owner: -
--

CREATE INDEX member_scores_tenant_default_idx ON analytics.member_scores USING btree (tenant_id, default_risk);

--
-- Name: member_scores member_scores_updated_at; Type: TRIGGER; Schema: analytics; Owner: -
--

CREATE TRIGGER member_scores_updated_at BEFORE UPDATE ON analytics.member_scores FOR EACH ROW EXECUTE FUNCTION analytics.set_updated_at();

--
-- PostgreSQL database dump complete
--

