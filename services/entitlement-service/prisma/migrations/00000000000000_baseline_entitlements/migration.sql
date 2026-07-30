-- Baseline for the "entitlements" schema.
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
-- Name: entitlements; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS entitlements;

--
-- Name: add_ons; Type: TABLE; Schema: entitlements; Owner: -
--

CREATE TABLE entitlements.add_ons (
    id text NOT NULL,
    name text NOT NULL,
    price numeric(10,2) NOT NULL,
    "interval" text NOT NULL,
    feature_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT add_ons_interval_check CHECK (("interval" = ANY (ARRAY['monthly'::text, 'yearly'::text])))
);

--
-- Name: features; Type: TABLE; Schema: entitlements; Owner: -
--

CREATE TABLE entitlements.features (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: org_add_ons; Type: TABLE; Schema: entitlements; Owner: -
--

CREATE TABLE entitlements.org_add_ons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organisation_id text NOT NULL,
    tenant_id uuid NOT NULL,
    add_on_id text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    maxio_component_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT org_add_ons_status_check CHECK ((status = ANY (ARRAY['active'::text, 'cancelled'::text])))
);

--
-- Name: org_plan_overrides; Type: TABLE; Schema: entitlements; Owner: -
--

CREATE TABLE entitlements.org_plan_overrides (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organisation_id text NOT NULL,
    tenant_id uuid NOT NULL,
    price_override numeric(10,2),
    transaction_fee_override numeric(5,2),
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: org_subscriptions; Type: TABLE; Schema: entitlements; Owner: -
--

CREATE TABLE entitlements.org_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organisation_id text NOT NULL,
    tenant_id uuid NOT NULL,
    plan_id text NOT NULL,
    billing_cycle text DEFAULT 'monthly'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    trial_ends_at timestamp with time zone,
    current_period_end timestamp with time zone,
    maxio_subscription_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT org_subscriptions_billing_cycle_check CHECK ((billing_cycle = ANY (ARRAY['monthly'::text, 'annual'::text]))),
    CONSTRAINT org_subscriptions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'trial'::text, 'past_due'::text, 'cancelled'::text])))
);

--
-- Name: plan_features; Type: TABLE; Schema: entitlements; Owner: -
--

CREATE TABLE entitlements.plan_features (
    plan_id text NOT NULL,
    feature_id text NOT NULL
);

--
-- Name: plans; Type: TABLE; Schema: entitlements; Owner: -
--

CREATE TABLE entitlements.plans (
    id text NOT NULL,
    name text NOT NULL,
    price_monthly numeric(10,2),
    price_annually numeric(10,2),
    transaction_fee_percent numeric(5,2),
    included_sites integer DEFAULT 0 NOT NULL,
    is_custom boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: add_ons add_ons_pkey; Type: CONSTRAINT; Schema: entitlements; Owner: -
--

ALTER TABLE ONLY entitlements.add_ons
    ADD CONSTRAINT add_ons_pkey PRIMARY KEY (id);

--
-- Name: features features_pkey; Type: CONSTRAINT; Schema: entitlements; Owner: -
--

ALTER TABLE ONLY entitlements.features
    ADD CONSTRAINT features_pkey PRIMARY KEY (id);

--
-- Name: org_add_ons org_add_ons_pkey; Type: CONSTRAINT; Schema: entitlements; Owner: -
--

ALTER TABLE ONLY entitlements.org_add_ons
    ADD CONSTRAINT org_add_ons_pkey PRIMARY KEY (id);

--
-- Name: org_plan_overrides org_plan_overrides_organisation_id_key; Type: CONSTRAINT; Schema: entitlements; Owner: -
--

ALTER TABLE ONLY entitlements.org_plan_overrides
    ADD CONSTRAINT org_plan_overrides_organisation_id_key UNIQUE (organisation_id);

--
-- Name: org_plan_overrides org_plan_overrides_pkey; Type: CONSTRAINT; Schema: entitlements; Owner: -
--

ALTER TABLE ONLY entitlements.org_plan_overrides
    ADD CONSTRAINT org_plan_overrides_pkey PRIMARY KEY (id);

--
-- Name: org_subscriptions org_subscriptions_organisation_id_key; Type: CONSTRAINT; Schema: entitlements; Owner: -
--

ALTER TABLE ONLY entitlements.org_subscriptions
    ADD CONSTRAINT org_subscriptions_organisation_id_key UNIQUE (organisation_id);

--
-- Name: org_subscriptions org_subscriptions_pkey; Type: CONSTRAINT; Schema: entitlements; Owner: -
--

ALTER TABLE ONLY entitlements.org_subscriptions
    ADD CONSTRAINT org_subscriptions_pkey PRIMARY KEY (id);

--
-- Name: plan_features plan_features_pkey; Type: CONSTRAINT; Schema: entitlements; Owner: -
--

ALTER TABLE ONLY entitlements.plan_features
    ADD CONSTRAINT plan_features_pkey PRIMARY KEY (plan_id, feature_id);

--
-- Name: plans plans_pkey; Type: CONSTRAINT; Schema: entitlements; Owner: -
--

ALTER TABLE ONLY entitlements.plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (id);

--
-- Name: org_add_ons uq_org_add_ons; Type: CONSTRAINT; Schema: entitlements; Owner: -
--

ALTER TABLE ONLY entitlements.org_add_ons
    ADD CONSTRAINT uq_org_add_ons UNIQUE (organisation_id, add_on_id);

--
-- Name: idx_org_add_ons_tenant; Type: INDEX; Schema: entitlements; Owner: -
--

CREATE INDEX idx_org_add_ons_tenant ON entitlements.org_add_ons USING btree (tenant_id);

--
-- Name: idx_org_plan_overrides_tenant; Type: INDEX; Schema: entitlements; Owner: -
--

CREATE INDEX idx_org_plan_overrides_tenant ON entitlements.org_plan_overrides USING btree (tenant_id);

--
-- Name: idx_org_subscriptions_tenant; Type: INDEX; Schema: entitlements; Owner: -
--

CREATE INDEX idx_org_subscriptions_tenant ON entitlements.org_subscriptions USING btree (tenant_id);

--
-- Name: add_ons add_ons_feature_id_fkey; Type: FK CONSTRAINT; Schema: entitlements; Owner: -
--

ALTER TABLE ONLY entitlements.add_ons
    ADD CONSTRAINT add_ons_feature_id_fkey FOREIGN KEY (feature_id) REFERENCES entitlements.features(id);

--
-- Name: org_add_ons org_add_ons_add_on_id_fkey; Type: FK CONSTRAINT; Schema: entitlements; Owner: -
--

ALTER TABLE ONLY entitlements.org_add_ons
    ADD CONSTRAINT org_add_ons_add_on_id_fkey FOREIGN KEY (add_on_id) REFERENCES entitlements.add_ons(id);

--
-- Name: org_subscriptions org_subscriptions_plan_id_fkey; Type: FK CONSTRAINT; Schema: entitlements; Owner: -
--

ALTER TABLE ONLY entitlements.org_subscriptions
    ADD CONSTRAINT org_subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES entitlements.plans(id);

--
-- Name: plan_features plan_features_feature_id_fkey; Type: FK CONSTRAINT; Schema: entitlements; Owner: -
--

ALTER TABLE ONLY entitlements.plan_features
    ADD CONSTRAINT plan_features_feature_id_fkey FOREIGN KEY (feature_id) REFERENCES entitlements.features(id) ON DELETE CASCADE;

--
-- Name: plan_features plan_features_plan_id_fkey; Type: FK CONSTRAINT; Schema: entitlements; Owner: -
--

ALTER TABLE ONLY entitlements.plan_features
    ADD CONSTRAINT plan_features_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES entitlements.plans(id) ON DELETE CASCADE;

--
-- PostgreSQL database dump complete
--

