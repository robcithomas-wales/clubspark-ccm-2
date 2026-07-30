-- Baseline for the "comms" schema.
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
-- Name: comms; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS comms;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: comms; Owner: -
--

CREATE FUNCTION comms.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

--
-- Name: campaigns; Type: TABLE; Schema: comms; Owner: -
--

CREATE TABLE comms.campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text,
    channel text NOT NULL,
    audience_definition text,
    subject text,
    body text,
    template_id uuid,
    reply_to text,
    status text DEFAULT 'draft'::text NOT NULL,
    recipient_count integer,
    sent_count integer,
    suppressed_count integer,
    scheduled_at timestamp with time zone,
    sent_at timestamp with time zone,
    created_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: message_log; Type: TABLE; Schema: comms; Owner: -
--

CREATE TABLE comms.message_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    recipient_email text,
    recipient_name text,
    recipient_phone text,
    recipient_person_id uuid,
    channel text NOT NULL,
    template_key text,
    subject text,
    body_preview text,
    status text DEFAULT 'queued'::text NOT NULL,
    error_detail text,
    source_event_type text,
    source_entity_id text,
    source_module text,
    campaign_id uuid,
    provider_message_id text,
    sent_at timestamp with time zone,
    delivered_at timestamp with time zone,
    opened_at timestamp with time zone,
    clicked_at timestamp with time zone,
    bounced_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: saved_audiences; Type: TABLE; Schema: comms; Owner: -
--

CREATE TABLE comms.saved_audiences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    rules_json text NOT NULL,
    estimated_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: suppression; Type: TABLE; Schema: comms; Owner: -
--

CREATE TABLE comms.suppression (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    email text,
    phone text,
    channel text NOT NULL,
    reason text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: templates; Type: TABLE; Schema: comms; Owner: -
--

CREATE TABLE comms.templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    key text NOT NULL,
    name text NOT NULL,
    channel text NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    subject_template text,
    body_template text,
    custom_footer text,
    sms_template text,
    reply_to text,
    from_name text,
    variables text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: campaigns campaigns_pkey; Type: CONSTRAINT; Schema: comms; Owner: -
--

ALTER TABLE ONLY comms.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);

--
-- Name: message_log message_log_pkey; Type: CONSTRAINT; Schema: comms; Owner: -
--

ALTER TABLE ONLY comms.message_log
    ADD CONSTRAINT message_log_pkey PRIMARY KEY (id);

--
-- Name: saved_audiences saved_audiences_pkey; Type: CONSTRAINT; Schema: comms; Owner: -
--

ALTER TABLE ONLY comms.saved_audiences
    ADD CONSTRAINT saved_audiences_pkey PRIMARY KEY (id);

--
-- Name: suppression suppression_pkey; Type: CONSTRAINT; Schema: comms; Owner: -
--

ALTER TABLE ONLY comms.suppression
    ADD CONSTRAINT suppression_pkey PRIMARY KEY (id);

--
-- Name: suppression suppression_tenant_id_email_channel_key; Type: CONSTRAINT; Schema: comms; Owner: -
--

ALTER TABLE ONLY comms.suppression
    ADD CONSTRAINT suppression_tenant_id_email_channel_key UNIQUE (tenant_id, email, channel);

--
-- Name: suppression suppression_tenant_id_phone_channel_key; Type: CONSTRAINT; Schema: comms; Owner: -
--

ALTER TABLE ONLY comms.suppression
    ADD CONSTRAINT suppression_tenant_id_phone_channel_key UNIQUE (tenant_id, phone, channel);

--
-- Name: templates templates_pkey; Type: CONSTRAINT; Schema: comms; Owner: -
--

ALTER TABLE ONLY comms.templates
    ADD CONSTRAINT templates_pkey PRIMARY KEY (id);

--
-- Name: templates templates_tenant_id_key_key; Type: CONSTRAINT; Schema: comms; Owner: -
--

ALTER TABLE ONLY comms.templates
    ADD CONSTRAINT templates_tenant_id_key_key UNIQUE (tenant_id, key);

--
-- Name: idx_campaigns_status; Type: INDEX; Schema: comms; Owner: -
--

CREATE INDEX idx_campaigns_status ON comms.campaigns USING btree (tenant_id, status);

--
-- Name: idx_campaigns_tenant; Type: INDEX; Schema: comms; Owner: -
--

CREATE INDEX idx_campaigns_tenant ON comms.campaigns USING btree (tenant_id);

--
-- Name: idx_message_log_campaign; Type: INDEX; Schema: comms; Owner: -
--

CREATE INDEX idx_message_log_campaign ON comms.message_log USING btree (campaign_id);

--
-- Name: idx_message_log_channel; Type: INDEX; Schema: comms; Owner: -
--

CREATE INDEX idx_message_log_channel ON comms.message_log USING btree (tenant_id, channel);

--
-- Name: idx_message_log_created_at; Type: INDEX; Schema: comms; Owner: -
--

CREATE INDEX idx_message_log_created_at ON comms.message_log USING btree (created_at DESC);

--
-- Name: idx_message_log_event_type; Type: INDEX; Schema: comms; Owner: -
--

CREATE INDEX idx_message_log_event_type ON comms.message_log USING btree (tenant_id, source_event_type);

--
-- Name: idx_message_log_status; Type: INDEX; Schema: comms; Owner: -
--

CREATE INDEX idx_message_log_status ON comms.message_log USING btree (tenant_id, status);

--
-- Name: idx_message_log_tenant; Type: INDEX; Schema: comms; Owner: -
--

CREATE INDEX idx_message_log_tenant ON comms.message_log USING btree (tenant_id);

--
-- Name: idx_saved_audiences_tenant; Type: INDEX; Schema: comms; Owner: -
--

CREATE INDEX idx_saved_audiences_tenant ON comms.saved_audiences USING btree (tenant_id);

--
-- Name: idx_suppression_email; Type: INDEX; Schema: comms; Owner: -
--

CREATE INDEX idx_suppression_email ON comms.suppression USING btree (tenant_id, email);

--
-- Name: idx_suppression_phone; Type: INDEX; Schema: comms; Owner: -
--

CREATE INDEX idx_suppression_phone ON comms.suppression USING btree (tenant_id, phone);

--
-- Name: idx_templates_key; Type: INDEX; Schema: comms; Owner: -
--

CREATE INDEX idx_templates_key ON comms.templates USING btree (key);

--
-- Name: idx_templates_tenant; Type: INDEX; Schema: comms; Owner: -
--

CREATE INDEX idx_templates_tenant ON comms.templates USING btree (tenant_id);

--
-- Name: templates_system_key_unique; Type: INDEX; Schema: comms; Owner: -
--

CREATE UNIQUE INDEX templates_system_key_unique ON comms.templates USING btree (key) WHERE (tenant_id IS NULL);

--
-- Name: campaigns trg_campaigns_updated_at; Type: TRIGGER; Schema: comms; Owner: -
--

CREATE TRIGGER trg_campaigns_updated_at BEFORE UPDATE ON comms.campaigns FOR EACH ROW EXECUTE FUNCTION comms.set_updated_at();

--
-- Name: templates trg_templates_updated_at; Type: TRIGGER; Schema: comms; Owner: -
--

CREATE TRIGGER trg_templates_updated_at BEFORE UPDATE ON comms.templates FOR EACH ROW EXECUTE FUNCTION comms.set_updated_at();

--
-- Name: message_log fk_message_log_campaign; Type: FK CONSTRAINT; Schema: comms; Owner: -
--

ALTER TABLE ONLY comms.message_log
    ADD CONSTRAINT fk_message_log_campaign FOREIGN KEY (campaign_id) REFERENCES comms.campaigns(id) ON DELETE SET NULL;

--
-- PostgreSQL database dump complete
--

