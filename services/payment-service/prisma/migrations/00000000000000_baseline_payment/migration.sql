-- Baseline for the "payment" schema.
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
-- Name: payment; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS payment;

--
-- Name: ChargeRunStatus; Type: TYPE; Schema: payment; Owner: -
--

CREATE TYPE payment."ChargeRunStatus" AS ENUM (
    'draft',
    'sent',
    'completed',
    'cancelled'
);

--
-- Name: PaymentStatus; Type: TYPE; Schema: payment; Owner: -
--

CREATE TYPE payment."PaymentStatus" AS ENUM (
    'pending',
    'requires_action',
    'processing',
    'succeeded',
    'failed',
    'cancelled'
);

--
-- Name: RefundStatus; Type: TYPE; Schema: payment; Owner: -
--

CREATE TYPE payment."RefundStatus" AS ENUM (
    'pending',
    'succeeded',
    'failed'
);

--
-- Name: payment_attempts; Type: TABLE; Schema: payment; Owner: -
--

CREATE TABLE payment.payment_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payment_id uuid NOT NULL,
    gateway_ref text,
    status text NOT NULL,
    error_code text,
    error_message text,
    attempted_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: payments; Type: TABLE; Schema: payment; Owner: -
--

CREATE TABLE payment.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    idempotency_key text NOT NULL,
    subject_type text NOT NULL,
    subject_id uuid NOT NULL,
    customer_id uuid,
    provider_config_id uuid NOT NULL,
    amount integer NOT NULL,
    currency character(3) DEFAULT 'GBP'::bpchar NOT NULL,
    gateway_ref text,
    status payment."PaymentStatus" DEFAULT 'pending'::payment."PaymentStatus" NOT NULL,
    failure_reason text,
    metadata jsonb,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: provider_configs; Type: TABLE; Schema: payment; Owner: -
--

CREATE TABLE payment.provider_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    provider text NOT NULL,
    currency character(3) DEFAULT 'GBP'::bpchar NOT NULL,
    is_default boolean DEFAULT true NOT NULL,
    credentials jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: refunds; Type: TABLE; Schema: payment; Owner: -
--

CREATE TABLE payment.refunds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payment_id uuid NOT NULL,
    amount integer,
    currency character(3) DEFAULT 'GBP'::bpchar NOT NULL,
    gateway_ref text,
    reason text,
    status payment."RefundStatus" DEFAULT 'pending'::payment."RefundStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: webhook_events; Type: TABLE; Schema: payment; Owner: -
--

CREATE TABLE payment.webhook_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_config_id uuid,
    provider text NOT NULL,
    gateway_event_id text,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    processed_at timestamp(6) with time zone,
    error text,
    received_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: payment_attempts payment_attempts_pkey; Type: CONSTRAINT; Schema: payment; Owner: -
--

ALTER TABLE ONLY payment.payment_attempts
    ADD CONSTRAINT payment_attempts_pkey PRIMARY KEY (id);

--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: payment; Owner: -
--

ALTER TABLE ONLY payment.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);

--
-- Name: provider_configs provider_configs_pkey; Type: CONSTRAINT; Schema: payment; Owner: -
--

ALTER TABLE ONLY payment.provider_configs
    ADD CONSTRAINT provider_configs_pkey PRIMARY KEY (id);

--
-- Name: refunds refunds_pkey; Type: CONSTRAINT; Schema: payment; Owner: -
--

ALTER TABLE ONLY payment.refunds
    ADD CONSTRAINT refunds_pkey PRIMARY KEY (id);

--
-- Name: webhook_events webhook_events_pkey; Type: CONSTRAINT; Schema: payment; Owner: -
--

ALTER TABLE ONLY payment.webhook_events
    ADD CONSTRAINT webhook_events_pkey PRIMARY KEY (id);

--
-- Name: payment_attempts_payment_id_idx; Type: INDEX; Schema: payment; Owner: -
--

CREATE INDEX payment_attempts_payment_id_idx ON payment.payment_attempts USING btree (payment_id);

--
-- Name: payments_gateway_ref_idx; Type: INDEX; Schema: payment; Owner: -
--

CREATE INDEX payments_gateway_ref_idx ON payment.payments USING btree (gateway_ref);

--
-- Name: payments_idempotency_key_key; Type: INDEX; Schema: payment; Owner: -
--

CREATE UNIQUE INDEX payments_idempotency_key_key ON payment.payments USING btree (idempotency_key);

--
-- Name: payments_tenant_id_customer_id_idx; Type: INDEX; Schema: payment; Owner: -
--

CREATE INDEX payments_tenant_id_customer_id_idx ON payment.payments USING btree (tenant_id, customer_id);

--
-- Name: payments_tenant_id_idx; Type: INDEX; Schema: payment; Owner: -
--

CREATE INDEX payments_tenant_id_idx ON payment.payments USING btree (tenant_id);

--
-- Name: payments_tenant_id_status_idx; Type: INDEX; Schema: payment; Owner: -
--

CREATE INDEX payments_tenant_id_status_idx ON payment.payments USING btree (tenant_id, status);

--
-- Name: payments_tenant_id_subject_type_subject_id_idx; Type: INDEX; Schema: payment; Owner: -
--

CREATE INDEX payments_tenant_id_subject_type_subject_id_idx ON payment.payments USING btree (tenant_id, subject_type, subject_id);

--
-- Name: provider_configs_tenant_id_is_active_idx; Type: INDEX; Schema: payment; Owner: -
--

CREATE INDEX provider_configs_tenant_id_is_active_idx ON payment.provider_configs USING btree (tenant_id, is_active);

--
-- Name: provider_configs_tenant_id_is_default_idx; Type: INDEX; Schema: payment; Owner: -
--

CREATE INDEX provider_configs_tenant_id_is_default_idx ON payment.provider_configs USING btree (tenant_id, is_default);

--
-- Name: provider_configs_tenant_id_provider_currency_key; Type: INDEX; Schema: payment; Owner: -
--

CREATE UNIQUE INDEX provider_configs_tenant_id_provider_currency_key ON payment.provider_configs USING btree (tenant_id, provider, currency);

--
-- Name: refunds_payment_id_idx; Type: INDEX; Schema: payment; Owner: -
--

CREATE INDEX refunds_payment_id_idx ON payment.refunds USING btree (payment_id);

--
-- Name: refunds_status_idx; Type: INDEX; Schema: payment; Owner: -
--

CREATE INDEX refunds_status_idx ON payment.refunds USING btree (status);

--
-- Name: webhook_events_gateway_event_id_key; Type: INDEX; Schema: payment; Owner: -
--

CREATE UNIQUE INDEX webhook_events_gateway_event_id_key ON payment.webhook_events USING btree (gateway_event_id);

--
-- Name: webhook_events_provider_config_id_idx; Type: INDEX; Schema: payment; Owner: -
--

CREATE INDEX webhook_events_provider_config_id_idx ON payment.webhook_events USING btree (provider_config_id);

--
-- Name: webhook_events_provider_event_type_idx; Type: INDEX; Schema: payment; Owner: -
--

CREATE INDEX webhook_events_provider_event_type_idx ON payment.webhook_events USING btree (provider, event_type);

--
-- Name: payment_attempts payment_attempts_payment_id_fkey; Type: FK CONSTRAINT; Schema: payment; Owner: -
--

ALTER TABLE ONLY payment.payment_attempts
    ADD CONSTRAINT payment_attempts_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES payment.payments(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: payments payments_provider_config_id_fkey; Type: FK CONSTRAINT; Schema: payment; Owner: -
--

ALTER TABLE ONLY payment.payments
    ADD CONSTRAINT payments_provider_config_id_fkey FOREIGN KEY (provider_config_id) REFERENCES payment.provider_configs(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: refunds refunds_payment_id_fkey; Type: FK CONSTRAINT; Schema: payment; Owner: -
--

ALTER TABLE ONLY payment.refunds
    ADD CONSTRAINT refunds_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES payment.payments(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: webhook_events webhook_events_provider_config_id_fkey; Type: FK CONSTRAINT; Schema: payment; Owner: -
--

ALTER TABLE ONLY payment.webhook_events
    ADD CONSTRAINT webhook_events_provider_config_id_fkey FOREIGN KEY (provider_config_id) REFERENCES payment.provider_configs(id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- PostgreSQL database dump complete
--

