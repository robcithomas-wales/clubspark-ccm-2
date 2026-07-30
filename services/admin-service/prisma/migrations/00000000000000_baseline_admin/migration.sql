-- Baseline for the "admin" schema.
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
-- Name: admin; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS admin;

--
-- Name: admin_users; Type: TABLE; Schema: admin; Owner: -
--

CREATE TABLE admin.admin_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    tenant_id uuid NOT NULL,
    role text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT admin_users_role_check CHECK ((role = ANY (ARRAY['super'::text, 'bookings'::text, 'membership'::text, 'website'::text, 'coaching'::text, 'reports'::text])))
);

--
-- Name: audit_logs; Type: TABLE; Schema: admin; Owner: -
--

CREATE TABLE admin.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    staff_id text NOT NULL,
    staff_email text,
    tenant_id uuid,
    action text NOT NULL,
    target_type text,
    target_id text,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: feature_flags; Type: TABLE; Schema: admin; Owner: -
--

CREATE TABLE admin.feature_flags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    flag text NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    override_reason text,
    set_by text,
    set_by_email text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: impersonation_sessions; Type: TABLE; Schema: admin; Owner: -
--

CREATE TABLE admin.impersonation_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    staff_id text NOT NULL,
    staff_email text,
    tenant_id uuid NOT NULL,
    target_user_id text NOT NULL,
    target_email text,
    reason text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    status text DEFAULT 'active'::text NOT NULL
);

--
-- Name: organisations; Type: TABLE; Schema: admin; Owner: -
--

CREATE TABLE admin.organisations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    slug text,
    sport text,
    region text,
    plan text DEFAULT 'trial'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    payment_connected boolean DEFAULT false NOT NULL,
    onboarding_pct integer DEFAULT 0 NOT NULL,
    admin_email text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: admin_users admin_users_pkey; Type: CONSTRAINT; Schema: admin; Owner: -
--

ALTER TABLE ONLY admin.admin_users
    ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);

--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: admin; Owner: -
--

ALTER TABLE ONLY admin.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);

--
-- Name: feature_flags feature_flags_pkey; Type: CONSTRAINT; Schema: admin; Owner: -
--

ALTER TABLE ONLY admin.feature_flags
    ADD CONSTRAINT feature_flags_pkey PRIMARY KEY (id);

--
-- Name: impersonation_sessions impersonation_sessions_pkey; Type: CONSTRAINT; Schema: admin; Owner: -
--

ALTER TABLE ONLY admin.impersonation_sessions
    ADD CONSTRAINT impersonation_sessions_pkey PRIMARY KEY (id);

--
-- Name: organisations organisations_pkey; Type: CONSTRAINT; Schema: admin; Owner: -
--

ALTER TABLE ONLY admin.organisations
    ADD CONSTRAINT organisations_pkey PRIMARY KEY (id);

--
-- Name: organisations organisations_slug_key; Type: CONSTRAINT; Schema: admin; Owner: -
--

ALTER TABLE ONLY admin.organisations
    ADD CONSTRAINT organisations_slug_key UNIQUE (slug);

--
-- Name: organisations organisations_tenant_id_key; Type: CONSTRAINT; Schema: admin; Owner: -
--

ALTER TABLE ONLY admin.organisations
    ADD CONSTRAINT organisations_tenant_id_key UNIQUE (tenant_id);

--
-- Name: admin_users uq_admin_users_user_tenant; Type: CONSTRAINT; Schema: admin; Owner: -
--

ALTER TABLE ONLY admin.admin_users
    ADD CONSTRAINT uq_admin_users_user_tenant UNIQUE (user_id, tenant_id);

--
-- Name: feature_flags uq_feature_flags_tenant_flag; Type: CONSTRAINT; Schema: admin; Owner: -
--

ALTER TABLE ONLY admin.feature_flags
    ADD CONSTRAINT uq_feature_flags_tenant_flag UNIQUE (tenant_id, flag);

--
-- Name: idx_admin_users_tenant; Type: INDEX; Schema: admin; Owner: -
--

CREATE INDEX idx_admin_users_tenant ON admin.admin_users USING btree (tenant_id);

--
-- Name: idx_admin_users_user; Type: INDEX; Schema: admin; Owner: -
--

CREATE INDEX idx_admin_users_user ON admin.admin_users USING btree (user_id);

--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: admin; Owner: -
--

CREATE INDEX idx_audit_logs_action ON admin.audit_logs USING btree (action);

--
-- Name: idx_audit_logs_staff_time; Type: INDEX; Schema: admin; Owner: -
--

CREATE INDEX idx_audit_logs_staff_time ON admin.audit_logs USING btree (staff_id, created_at DESC);

--
-- Name: idx_audit_logs_tenant_time; Type: INDEX; Schema: admin; Owner: -
--

CREATE INDEX idx_audit_logs_tenant_time ON admin.audit_logs USING btree (tenant_id, created_at DESC);

--
-- Name: idx_audit_logs_time; Type: INDEX; Schema: admin; Owner: -
--

CREATE INDEX idx_audit_logs_time ON admin.audit_logs USING btree (created_at DESC);

--
-- Name: idx_feature_flags_flag; Type: INDEX; Schema: admin; Owner: -
--

CREATE INDEX idx_feature_flags_flag ON admin.feature_flags USING btree (flag);

--
-- Name: idx_feature_flags_tenant; Type: INDEX; Schema: admin; Owner: -
--

CREATE INDEX idx_feature_flags_tenant ON admin.feature_flags USING btree (tenant_id);

--
-- Name: idx_impersonation_staff_time; Type: INDEX; Schema: admin; Owner: -
--

CREATE INDEX idx_impersonation_staff_time ON admin.impersonation_sessions USING btree (staff_id, started_at DESC);

--
-- Name: idx_impersonation_status; Type: INDEX; Schema: admin; Owner: -
--

CREATE INDEX idx_impersonation_status ON admin.impersonation_sessions USING btree (status);

--
-- Name: idx_impersonation_tenant; Type: INDEX; Schema: admin; Owner: -
--

CREATE INDEX idx_impersonation_tenant ON admin.impersonation_sessions USING btree (tenant_id);

--
-- Name: idx_organisations_plan; Type: INDEX; Schema: admin; Owner: -
--

CREATE INDEX idx_organisations_plan ON admin.organisations USING btree (plan);

--
-- Name: idx_organisations_region; Type: INDEX; Schema: admin; Owner: -
--

CREATE INDEX idx_organisations_region ON admin.organisations USING btree (region);

--
-- Name: idx_organisations_status; Type: INDEX; Schema: admin; Owner: -
--

CREATE INDEX idx_organisations_status ON admin.organisations USING btree (status);

--
-- Name: feature_flags fk_feature_flags_tenant; Type: FK CONSTRAINT; Schema: admin; Owner: -
--

ALTER TABLE ONLY admin.feature_flags
    ADD CONSTRAINT fk_feature_flags_tenant FOREIGN KEY (tenant_id) REFERENCES admin.organisations(tenant_id);

--
-- Name: impersonation_sessions fk_impersonation_tenant; Type: FK CONSTRAINT; Schema: admin; Owner: -
--

ALTER TABLE ONLY admin.impersonation_sessions
    ADD CONSTRAINT fk_impersonation_tenant FOREIGN KEY (tenant_id) REFERENCES admin.organisations(tenant_id);

--
-- PostgreSQL database dump complete
--

