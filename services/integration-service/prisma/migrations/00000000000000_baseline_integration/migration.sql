-- Baseline for the "integration" schema.
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
-- Name: integration; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS integration;

--
-- Name: AccountingSyncStatus; Type: TYPE; Schema: integration; Owner: -
--

CREATE TYPE integration."AccountingSyncStatus" AS ENUM (
    'pending',
    'synced',
    'failed',
    'dead'
);

--
-- Name: WebhookDeliveryStatus; Type: TYPE; Schema: integration; Owner: -
--

CREATE TYPE integration."WebhookDeliveryStatus" AS ENUM (
    'pending',
    'delivered',
    'failed',
    'dead'
);

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: integration; Owner: -
--

CREATE FUNCTION integration.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

--
-- Name: accounting_settings; Type: TABLE; Schema: integration; Owner: -
--

CREATE TABLE integration.accounting_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    provider text NOT NULL,
    revenue_account_code text NOT NULL,
    tax_rate_id text,
    invoice_mode text DEFAULT 'AUTHORISED'::text NOT NULL,
    currency_code text DEFAULT 'GBP'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: accounting_sync_log; Type: TABLE; Schema: integration; Owner: -
--

CREATE TABLE integration.accounting_sync_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    connection_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    event_type text NOT NULL,
    source_id text NOT NULL,
    source_type text NOT NULL,
    provider_ref text,
    status integration."AccountingSyncStatus" DEFAULT 'pending'::integration."AccountingSyncStatus" NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    error_message text,
    next_retry_at timestamp with time zone,
    synced_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: api_key_usage; Type: TABLE; Schema: integration; Owner: -
--

CREATE TABLE integration.api_key_usage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    api_key_id uuid NOT NULL,
    endpoint text NOT NULL,
    response_code integer NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: api_keys; Type: TABLE; Schema: integration; Owner: -
--

CREATE TABLE integration.api_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    key_hash text NOT NULL,
    scopes text[] DEFAULT '{}'::text[] NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

--
-- Name: oauth_connections; Type: TABLE; Schema: integration; Owner: -
--

CREATE TABLE integration.oauth_connections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    provider text NOT NULL,
    provider_tenant_id text,
    access_token text NOT NULL,
    refresh_token text NOT NULL,
    token_expiry timestamp with time zone NOT NULL,
    scopes text[] DEFAULT '{}'::text[] NOT NULL,
    connected_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    disconnected_at timestamp with time zone
);

--
-- Name: webhook_deliveries; Type: TABLE; Schema: integration; Owner: -
--

CREATE TABLE integration.webhook_deliveries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subscription_id uuid NOT NULL,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    status integration."WebhookDeliveryStatus" DEFAULT 'pending'::integration."WebhookDeliveryStatus" NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    next_retry_at timestamp with time zone,
    response_code integer,
    response_body text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: webhook_subscriptions; Type: TABLE; Schema: integration; Owner: -
--

CREATE TABLE integration.webhook_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    event_types text[] DEFAULT '{}'::text[] NOT NULL,
    endpoint_url text NOT NULL,
    secret_hash text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: accounting_settings accounting_settings_pkey; Type: CONSTRAINT; Schema: integration; Owner: -
--

ALTER TABLE ONLY integration.accounting_settings
    ADD CONSTRAINT accounting_settings_pkey PRIMARY KEY (id);

--
-- Name: accounting_settings accounting_settings_tenant_id_key; Type: CONSTRAINT; Schema: integration; Owner: -
--

ALTER TABLE ONLY integration.accounting_settings
    ADD CONSTRAINT accounting_settings_tenant_id_key UNIQUE (tenant_id);

--
-- Name: accounting_sync_log accounting_sync_log_connection_source_event_key; Type: CONSTRAINT; Schema: integration; Owner: -
--

ALTER TABLE ONLY integration.accounting_sync_log
    ADD CONSTRAINT accounting_sync_log_connection_source_event_key UNIQUE (connection_id, source_id, event_type);

--
-- Name: accounting_sync_log accounting_sync_log_pkey; Type: CONSTRAINT; Schema: integration; Owner: -
--

ALTER TABLE ONLY integration.accounting_sync_log
    ADD CONSTRAINT accounting_sync_log_pkey PRIMARY KEY (id);

--
-- Name: api_key_usage api_key_usage_pkey; Type: CONSTRAINT; Schema: integration; Owner: -
--

ALTER TABLE ONLY integration.api_key_usage
    ADD CONSTRAINT api_key_usage_pkey PRIMARY KEY (id);

--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: integration; Owner: -
--

ALTER TABLE ONLY integration.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);

--
-- Name: oauth_connections oauth_connections_pkey; Type: CONSTRAINT; Schema: integration; Owner: -
--

ALTER TABLE ONLY integration.oauth_connections
    ADD CONSTRAINT oauth_connections_pkey PRIMARY KEY (id);

--
-- Name: oauth_connections oauth_connections_tenant_provider_key; Type: CONSTRAINT; Schema: integration; Owner: -
--

ALTER TABLE ONLY integration.oauth_connections
    ADD CONSTRAINT oauth_connections_tenant_provider_key UNIQUE (tenant_id, provider);

--
-- Name: webhook_deliveries webhook_deliveries_pkey; Type: CONSTRAINT; Schema: integration; Owner: -
--

ALTER TABLE ONLY integration.webhook_deliveries
    ADD CONSTRAINT webhook_deliveries_pkey PRIMARY KEY (id);

--
-- Name: webhook_subscriptions webhook_subscriptions_pkey; Type: CONSTRAINT; Schema: integration; Owner: -
--

ALTER TABLE ONLY integration.webhook_subscriptions
    ADD CONSTRAINT webhook_subscriptions_pkey PRIMARY KEY (id);

--
-- Name: accounting_sync_log_status_next_retry_at_idx; Type: INDEX; Schema: integration; Owner: -
--

CREATE INDEX accounting_sync_log_status_next_retry_at_idx ON integration.accounting_sync_log USING btree (status, next_retry_at);

--
-- Name: accounting_sync_log_tenant_id_source_id_idx; Type: INDEX; Schema: integration; Owner: -
--

CREATE INDEX accounting_sync_log_tenant_id_source_id_idx ON integration.accounting_sync_log USING btree (tenant_id, source_id);

--
-- Name: api_key_usage_api_key_id_timestamp_idx; Type: INDEX; Schema: integration; Owner: -
--

CREATE INDEX api_key_usage_api_key_id_timestamp_idx ON integration.api_key_usage USING btree (api_key_id, "timestamp");

--
-- Name: api_keys_key_hash_idx; Type: INDEX; Schema: integration; Owner: -
--

CREATE INDEX api_keys_key_hash_idx ON integration.api_keys USING btree (key_hash);

--
-- Name: api_keys_key_hash_key; Type: INDEX; Schema: integration; Owner: -
--

CREATE UNIQUE INDEX api_keys_key_hash_key ON integration.api_keys USING btree (key_hash);

--
-- Name: api_keys_tenant_id_idx; Type: INDEX; Schema: integration; Owner: -
--

CREATE INDEX api_keys_tenant_id_idx ON integration.api_keys USING btree (tenant_id);

--
-- Name: oauth_connections_tenant_id_idx; Type: INDEX; Schema: integration; Owner: -
--

CREATE INDEX oauth_connections_tenant_id_idx ON integration.oauth_connections USING btree (tenant_id);

--
-- Name: webhook_deliveries_status_next_retry_at_idx; Type: INDEX; Schema: integration; Owner: -
--

CREATE INDEX webhook_deliveries_status_next_retry_at_idx ON integration.webhook_deliveries USING btree (status, next_retry_at);

--
-- Name: webhook_subscriptions_tenant_id_is_active_idx; Type: INDEX; Schema: integration; Owner: -
--

CREATE INDEX webhook_subscriptions_tenant_id_is_active_idx ON integration.webhook_subscriptions USING btree (tenant_id, is_active);

--
-- Name: accounting_settings accounting_settings_updated_at; Type: TRIGGER; Schema: integration; Owner: -
--

CREATE TRIGGER accounting_settings_updated_at BEFORE UPDATE ON integration.accounting_settings FOR EACH ROW EXECUTE FUNCTION integration.set_updated_at();

--
-- Name: accounting_sync_log accounting_sync_log_updated_at; Type: TRIGGER; Schema: integration; Owner: -
--

CREATE TRIGGER accounting_sync_log_updated_at BEFORE UPDATE ON integration.accounting_sync_log FOR EACH ROW EXECUTE FUNCTION integration.set_updated_at();

--
-- Name: api_keys api_keys_updated_at; Type: TRIGGER; Schema: integration; Owner: -
--

CREATE TRIGGER api_keys_updated_at BEFORE UPDATE ON integration.api_keys FOR EACH ROW EXECUTE FUNCTION integration.set_updated_at();

--
-- Name: oauth_connections oauth_connections_updated_at; Type: TRIGGER; Schema: integration; Owner: -
--

CREATE TRIGGER oauth_connections_updated_at BEFORE UPDATE ON integration.oauth_connections FOR EACH ROW EXECUTE FUNCTION integration.set_updated_at();

--
-- Name: webhook_deliveries webhook_deliveries_updated_at; Type: TRIGGER; Schema: integration; Owner: -
--

CREATE TRIGGER webhook_deliveries_updated_at BEFORE UPDATE ON integration.webhook_deliveries FOR EACH ROW EXECUTE FUNCTION integration.set_updated_at();

--
-- Name: webhook_subscriptions webhook_subscriptions_updated_at; Type: TRIGGER; Schema: integration; Owner: -
--

CREATE TRIGGER webhook_subscriptions_updated_at BEFORE UPDATE ON integration.webhook_subscriptions FOR EACH ROW EXECUTE FUNCTION integration.set_updated_at();

--
-- Name: accounting_sync_log accounting_sync_log_connection_id_fkey; Type: FK CONSTRAINT; Schema: integration; Owner: -
--

ALTER TABLE ONLY integration.accounting_sync_log
    ADD CONSTRAINT accounting_sync_log_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES integration.oauth_connections(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: api_key_usage api_key_usage_api_key_id_fkey; Type: FK CONSTRAINT; Schema: integration; Owner: -
--

ALTER TABLE ONLY integration.api_key_usage
    ADD CONSTRAINT api_key_usage_api_key_id_fkey FOREIGN KEY (api_key_id) REFERENCES integration.api_keys(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: webhook_deliveries webhook_deliveries_subscription_id_fkey; Type: FK CONSTRAINT; Schema: integration; Owner: -
--

ALTER TABLE ONLY integration.webhook_deliveries
    ADD CONSTRAINT webhook_deliveries_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES integration.webhook_subscriptions(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- PostgreSQL database dump complete
--

