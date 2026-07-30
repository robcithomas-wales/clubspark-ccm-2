-- Baseline for the "membership" schema.
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
-- Name: membership; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS membership;

--
-- Name: entitlement_policies; Type: TABLE; Schema: membership; Owner: -
--

CREATE TABLE membership.entitlement_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    organisation_id uuid NOT NULL,
    name text NOT NULL,
    policy_type text,
    description text,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT entitlement_policies_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'archived'::text])))
);

--
-- Name: membership_audit; Type: TABLE; Schema: membership; Owner: -
--

CREATE TABLE membership.membership_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    membership_id uuid NOT NULL,
    action text NOT NULL,
    performed_by uuid,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: membership_lifecycle_events; Type: TABLE; Schema: membership; Owner: -
--

CREATE TABLE membership.membership_lifecycle_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    membership_id uuid NOT NULL,
    from_status text NOT NULL,
    to_status text NOT NULL,
    reason text,
    created_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: membership_participants; Type: TABLE; Schema: membership; Owner: -
--

CREATE TABLE membership.membership_participants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    membership_id uuid NOT NULL,
    person_id uuid NOT NULL,
    participant_role text DEFAULT 'member'::text NOT NULL,
    is_primary_member boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT membership_participants_role_check CHECK ((participant_role = ANY (ARRAY['member'::text, 'payer'::text, 'guardian'::text, 'dependent'::text, 'other'::text])))
);

--
-- Name: membership_plan_coverage_rules; Type: TABLE; Schema: membership; Owner: -
--

CREATE TABLE membership.membership_plan_coverage_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    min_members integer,
    max_members integer,
    min_adults integer,
    max_adults integer,
    min_children integer,
    max_children integer,
    same_household_required boolean DEFAULT false NOT NULL,
    payer_required boolean DEFAULT false NOT NULL,
    guardian_required_for_minors boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT membership_plan_coverage_rules_adults_range_check CHECK (((min_adults IS NULL) OR (max_adults IS NULL) OR (min_adults <= max_adults))),
    CONSTRAINT membership_plan_coverage_rules_children_range_check CHECK (((min_children IS NULL) OR (max_children IS NULL) OR (min_children <= max_children))),
    CONSTRAINT membership_plan_coverage_rules_max_adults_check CHECK (((max_adults IS NULL) OR (max_adults >= 0))),
    CONSTRAINT membership_plan_coverage_rules_max_children_check CHECK (((max_children IS NULL) OR (max_children >= 0))),
    CONSTRAINT membership_plan_coverage_rules_max_members_check CHECK (((max_members IS NULL) OR (max_members >= 0))),
    CONSTRAINT membership_plan_coverage_rules_members_range_check CHECK (((min_members IS NULL) OR (max_members IS NULL) OR (min_members <= max_members))),
    CONSTRAINT membership_plan_coverage_rules_min_adults_check CHECK (((min_adults IS NULL) OR (min_adults >= 0))),
    CONSTRAINT membership_plan_coverage_rules_min_children_check CHECK (((min_children IS NULL) OR (min_children >= 0))),
    CONSTRAINT membership_plan_coverage_rules_min_members_check CHECK (((min_members IS NULL) OR (min_members >= 0)))
);

--
-- Name: membership_plan_duration; Type: TABLE; Schema: membership; Owner: -
--

CREATE TABLE membership.membership_plan_duration (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    fixed_start_date date,
    fixed_end_date date,
    rolling_length integer,
    rolling_unit text,
    grace_period_days integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT membership_plan_duration_non_negative_grace_check CHECK ((grace_period_days >= 0)),
    CONSTRAINT membership_plan_duration_positive_length_check CHECK (((rolling_length IS NULL) OR (rolling_length > 0))),
    CONSTRAINT membership_plan_duration_rolling_unit_check CHECK (((rolling_unit IS NULL) OR (rolling_unit = ANY (ARRAY['day'::text, 'week'::text, 'month'::text, 'year'::text]))))
);

--
-- Name: membership_plan_eligibility_rules; Type: TABLE; Schema: membership; Owner: -
--

CREATE TABLE membership.membership_plan_eligibility_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    min_age integer,
    max_age integer,
    requires_guardian_under_age integer,
    gender text,
    custom_rules jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT membership_plan_eligibility_rules_age_range_check CHECK (((min_age IS NULL) OR (max_age IS NULL) OR (min_age <= max_age))),
    CONSTRAINT membership_plan_eligibility_rules_gender_check CHECK (((gender IS NULL) OR (gender = ANY (ARRAY['male'::text, 'female'::text, 'mixed'::text, 'open'::text])))),
    CONSTRAINT membership_plan_eligibility_rules_guardian_age_check CHECK (((requires_guardian_under_age IS NULL) OR (requires_guardian_under_age >= 0))),
    CONSTRAINT membership_plan_eligibility_rules_max_age_check CHECK (((max_age IS NULL) OR (max_age >= 0))),
    CONSTRAINT membership_plan_eligibility_rules_min_age_check CHECK (((min_age IS NULL) OR (min_age >= 0)))
);

--
-- Name: membership_plan_entitlements; Type: TABLE; Schema: membership; Owner: -
--

CREATE TABLE membership.membership_plan_entitlements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    entitlement_policy_id uuid NOT NULL,
    scope_type text,
    scope_id uuid,
    configuration jsonb DEFAULT '{}'::jsonb NOT NULL,
    priority integer DEFAULT 100 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT membership_plan_entitlements_scope_type_check CHECK ((scope_type = ANY (ARRAY['organisation'::text, 'venue'::text, 'resource_type'::text, 'resource'::text, 'bookable_unit'::text])))
);

--
-- Name: membership_plan_payment_methods; Type: TABLE; Schema: membership; Owner: -
--

CREATE TABLE membership.membership_plan_payment_methods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    payment_method text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT membership_plan_payment_methods_method_check CHECK ((payment_method = ANY (ARRAY['direct_debit'::text, 'card'::text, 'cash'::text, 'bank_transfer'::text, 'invoice'::text])))
);

--
-- Name: membership_plan_pricing; Type: TABLE; Schema: membership; Owner: -
--

CREATE TABLE membership.membership_plan_pricing (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    currency text NOT NULL,
    join_fee numeric(12,2) DEFAULT 0 NOT NULL,
    price numeric(12,2) NOT NULL,
    renewal_price numeric(12,2),
    billing_frequency text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT membership_plan_pricing_billing_frequency_check CHECK ((billing_frequency = ANY (ARRAY['one_off'::text, 'monthly'::text, 'quarterly'::text, 'annually'::text, 'custom'::text]))),
    CONSTRAINT membership_plan_pricing_join_fee_check CHECK ((join_fee >= (0)::numeric)),
    CONSTRAINT membership_plan_pricing_price_check CHECK ((price >= (0)::numeric)),
    CONSTRAINT membership_plan_pricing_renewal_price_check CHECK (((renewal_price IS NULL) OR (renewal_price >= (0)::numeric)))
);

--
-- Name: membership_plans; Type: TABLE; Schema: membership; Owner: -
--

CREATE TABLE membership.membership_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    organisation_id uuid NOT NULL,
    scheme_id uuid NOT NULL,
    name text NOT NULL,
    code text,
    description text,
    ownership_type text NOT NULL,
    duration_type text NOT NULL,
    visibility text DEFAULT 'public'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    membership_type text,
    sport_category text,
    max_members integer,
    is_public boolean DEFAULT false NOT NULL,
    pricing_model text,
    price numeric(10,2),
    currency text DEFAULT 'GBP'::text NOT NULL,
    billing_interval text,
    instalment_count integer,
    eligibility jsonb,
    grace_period_days integer,
    terms_and_conditions text,
    CONSTRAINT membership_plans_ownership_type_check CHECK ((ownership_type = ANY (ARRAY['person'::text, 'household'::text]))),
    CONSTRAINT membership_plans_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'archived'::text]))),
    CONSTRAINT membership_plans_visibility_check CHECK ((visibility = ANY (ARRAY['public'::text, 'invite_only'::text, 'admin_only'::text])))
);

--
-- Name: membership_schemes; Type: TABLE; Schema: membership; Owner: -
--

CREATE TABLE membership.membership_schemes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    organisation_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT membership_schemes_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'archived'::text])))
);

--
-- Name: memberships; Type: TABLE; Schema: membership; Owner: -
--

CREATE TABLE membership.memberships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    organisation_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    customer_id uuid,
    owner_type text NOT NULL,
    owner_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    start_date date NOT NULL,
    end_date date,
    renewal_date date,
    auto_renew boolean DEFAULT false NOT NULL,
    payment_status text DEFAULT 'unpaid'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    reference text,
    source text,
    notes text,
    activated_at timestamp with time zone,
    suspended_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    lapsed_at timestamp with time zone,
    expired_at timestamp with time zone,
    payment_recorded_at timestamp with time zone,
    payment_reference text,
    payment_method text,
    payment_amount numeric(10,2),
    member_role text,
    renewal_reminder_sent_at timestamp with time zone,
    CONSTRAINT memberships_date_range_check CHECK (((end_date IS NULL) OR (start_date <= end_date))),
    CONSTRAINT memberships_owner_type_check CHECK ((owner_type = ANY (ARRAY['person'::text, 'household'::text]))),
    CONSTRAINT memberships_payment_status_check CHECK ((payment_status = ANY (ARRAY['unpaid'::text, 'paid'::text, 'part_paid'::text, 'failed'::text, 'waived'::text]))),
    CONSTRAINT memberships_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text, 'paused'::text, 'lapsed'::text, 'cancelled'::text, 'expired'::text])))
);

--
-- Name: entitlement_policies entitlement_policies_pkey; Type: CONSTRAINT; Schema: membership; Owner: -
--

ALTER TABLE ONLY membership.entitlement_policies
    ADD CONSTRAINT entitlement_policies_pkey PRIMARY KEY (id);

--
-- Name: membership_audit membership_audit_pkey; Type: CONSTRAINT; Schema: membership; Owner: -
--

ALTER TABLE ONLY membership.membership_audit
    ADD CONSTRAINT membership_audit_pkey PRIMARY KEY (id);

--
-- Name: membership_lifecycle_events membership_lifecycle_events_pkey; Type: CONSTRAINT; Schema: membership; Owner: -
--

ALTER TABLE ONLY membership.membership_lifecycle_events
    ADD CONSTRAINT membership_lifecycle_events_pkey PRIMARY KEY (id);

--
-- Name: membership_participants membership_participants_pkey; Type: CONSTRAINT; Schema: membership; Owner: -
--

ALTER TABLE ONLY membership.membership_participants
    ADD CONSTRAINT membership_participants_pkey PRIMARY KEY (id);

--
-- Name: membership_participants membership_participants_unique; Type: CONSTRAINT; Schema: membership; Owner: -
--

ALTER TABLE ONLY membership.membership_participants
    ADD CONSTRAINT membership_participants_unique UNIQUE (membership_id, person_id);

--
-- Name: membership_plan_coverage_rules membership_plan_coverage_rules_pkey; Type: CONSTRAINT; Schema: membership; Owner: -
--

ALTER TABLE ONLY membership.membership_plan_coverage_rules
    ADD CONSTRAINT membership_plan_coverage_rules_pkey PRIMARY KEY (id);

--
-- Name: membership_plan_duration membership_plan_duration_pkey; Type: CONSTRAINT; Schema: membership; Owner: -
--

ALTER TABLE ONLY membership.membership_plan_duration
    ADD CONSTRAINT membership_plan_duration_pkey PRIMARY KEY (id);

--
-- Name: membership_plan_eligibility_rules membership_plan_eligibility_rules_pkey; Type: CONSTRAINT; Schema: membership; Owner: -
--

ALTER TABLE ONLY membership.membership_plan_eligibility_rules
    ADD CONSTRAINT membership_plan_eligibility_rules_pkey PRIMARY KEY (id);

--
-- Name: membership_plan_entitlements membership_plan_entitlements_pkey; Type: CONSTRAINT; Schema: membership; Owner: -
--

ALTER TABLE ONLY membership.membership_plan_entitlements
    ADD CONSTRAINT membership_plan_entitlements_pkey PRIMARY KEY (id);

--
-- Name: membership_plan_payment_methods membership_plan_payment_methods_pkey; Type: CONSTRAINT; Schema: membership; Owner: -
--

ALTER TABLE ONLY membership.membership_plan_payment_methods
    ADD CONSTRAINT membership_plan_payment_methods_pkey PRIMARY KEY (id);

--
-- Name: membership_plan_payment_methods membership_plan_payment_methods_unique; Type: CONSTRAINT; Schema: membership; Owner: -
--

ALTER TABLE ONLY membership.membership_plan_payment_methods
    ADD CONSTRAINT membership_plan_payment_methods_unique UNIQUE (plan_id, payment_method);

--
-- Name: membership_plan_pricing membership_plan_pricing_pkey; Type: CONSTRAINT; Schema: membership; Owner: -
--

ALTER TABLE ONLY membership.membership_plan_pricing
    ADD CONSTRAINT membership_plan_pricing_pkey PRIMARY KEY (id);

--
-- Name: membership_plans membership_plans_pkey; Type: CONSTRAINT; Schema: membership; Owner: -
--

ALTER TABLE ONLY membership.membership_plans
    ADD CONSTRAINT membership_plans_pkey PRIMARY KEY (id);

--
-- Name: membership_schemes membership_schemes_pkey; Type: CONSTRAINT; Schema: membership; Owner: -
--

ALTER TABLE ONLY membership.membership_schemes
    ADD CONSTRAINT membership_schemes_pkey PRIMARY KEY (id);

--
-- Name: memberships memberships_pkey; Type: CONSTRAINT; Schema: membership; Owner: -
--

ALTER TABLE ONLY membership.memberships
    ADD CONSTRAINT memberships_pkey PRIMARY KEY (id);

--
-- Name: entitlement_policies_tenant_org_idx; Type: INDEX; Schema: membership; Owner: -
--

CREATE INDEX entitlement_policies_tenant_org_idx ON membership.entitlement_policies USING btree (tenant_id, organisation_id);

--
-- Name: entitlement_policies_type_idx; Type: INDEX; Schema: membership; Owner: -
--

CREATE INDEX entitlement_policies_type_idx ON membership.entitlement_policies USING btree (tenant_id, organisation_id, policy_type);

--
-- Name: idx_entitlement_policies_tenant; Type: INDEX; Schema: membership; Owner: -
--

CREATE INDEX idx_entitlement_policies_tenant ON membership.entitlement_policies USING btree (tenant_id, organisation_id);

--
-- Name: idx_memberships_customer_id; Type: INDEX; Schema: membership; Owner: -
--

CREATE INDEX idx_memberships_customer_id ON membership.memberships USING btree (customer_id);

--
-- Name: idx_memberships_renewal_date; Type: INDEX; Schema: membership; Owner: -
--

CREATE INDEX idx_memberships_renewal_date ON membership.memberships USING btree (tenant_id, organisation_id, renewal_date) WHERE (renewal_date IS NOT NULL);

--
-- Name: idx_memberships_renewal_reminder; Type: INDEX; Schema: membership; Owner: -
--

CREATE INDEX idx_memberships_renewal_reminder ON membership.memberships USING btree (end_date, status) WHERE (renewal_reminder_sent_at IS NULL);

--
-- Name: idx_plan_entitlements_plan; Type: INDEX; Schema: membership; Owner: -
--

CREATE INDEX idx_plan_entitlements_plan ON membership.membership_plan_entitlements USING btree (tenant_id, plan_id);

--
-- Name: membership_audit_membership_idx; Type: INDEX; Schema: membership; Owner: -
--

CREATE INDEX membership_audit_membership_idx ON membership.membership_audit USING btree (tenant_id, membership_id);

--
-- Name: membership_participants_membership_idx; Type: INDEX; Schema: membership; Owner: -
--

CREATE INDEX membership_participants_membership_idx ON membership.membership_participants USING btree (tenant_id, membership_id);

--
-- Name: membership_participants_person_idx; Type: INDEX; Schema: membership; Owner: -
--

CREATE INDEX membership_participants_person_idx ON membership.membership_participants USING btree (tenant_id, person_id);

--
-- Name: membership_plan_coverage_rules_plan_unique_idx; Type: INDEX; Schema: membership; Owner: -
--

CREATE UNIQUE INDEX membership_plan_coverage_rules_plan_unique_idx ON membership.membership_plan_coverage_rules USING btree (plan_id);

--
-- Name: membership_plan_duration_plan_unique_idx; Type: INDEX; Schema: membership; Owner: -
--

CREATE UNIQUE INDEX membership_plan_duration_plan_unique_idx ON membership.membership_plan_duration USING btree (plan_id);

--
-- Name: membership_plan_eligibility_rules_plan_unique_idx; Type: INDEX; Schema: membership; Owner: -
--

CREATE UNIQUE INDEX membership_plan_eligibility_rules_plan_unique_idx ON membership.membership_plan_eligibility_rules USING btree (plan_id);

--
-- Name: membership_plan_entitlements_plan_idx; Type: INDEX; Schema: membership; Owner: -
--

CREATE INDEX membership_plan_entitlements_plan_idx ON membership.membership_plan_entitlements USING btree (tenant_id, plan_id);

--
-- Name: membership_plan_entitlements_policy_idx; Type: INDEX; Schema: membership; Owner: -
--

CREATE INDEX membership_plan_entitlements_policy_idx ON membership.membership_plan_entitlements USING btree (tenant_id, entitlement_policy_id);

--
-- Name: membership_plan_entitlements_scope_idx; Type: INDEX; Schema: membership; Owner: -
--

CREATE INDEX membership_plan_entitlements_scope_idx ON membership.membership_plan_entitlements USING btree (tenant_id, scope_type, scope_id);

--
-- Name: membership_plan_payment_methods_plan_idx; Type: INDEX; Schema: membership; Owner: -
--

CREATE INDEX membership_plan_payment_methods_plan_idx ON membership.membership_plan_payment_methods USING btree (tenant_id, plan_id);

--
-- Name: membership_plan_pricing_plan_unique_idx; Type: INDEX; Schema: membership; Owner: -
--

CREATE UNIQUE INDEX membership_plan_pricing_plan_unique_idx ON membership.membership_plan_pricing USING btree (plan_id);

--
-- Name: membership_plans_code_unique_idx; Type: INDEX; Schema: membership; Owner: -
--

CREATE UNIQUE INDEX membership_plans_code_unique_idx ON membership.membership_plans USING btree (tenant_id, organisation_id, code) WHERE (code IS NOT NULL);

--
-- Name: membership_plans_name_idx; Type: INDEX; Schema: membership; Owner: -
--

CREATE INDEX membership_plans_name_idx ON membership.membership_plans USING btree (tenant_id, organisation_id, name);

--
-- Name: membership_plans_scheme_idx; Type: INDEX; Schema: membership; Owner: -
--

CREATE INDEX membership_plans_scheme_idx ON membership.membership_plans USING btree (tenant_id, scheme_id);

--
-- Name: membership_plans_tenant_org_idx; Type: INDEX; Schema: membership; Owner: -
--

CREATE INDEX membership_plans_tenant_org_idx ON membership.membership_plans USING btree (tenant_id, organisation_id);

--
-- Name: membership_schemes_name_idx; Type: INDEX; Schema: membership; Owner: -
--

CREATE INDEX membership_schemes_name_idx ON membership.membership_schemes USING btree (tenant_id, organisation_id, name);

--
-- Name: membership_schemes_tenant_org_idx; Type: INDEX; Schema: membership; Owner: -
--

CREATE INDEX membership_schemes_tenant_org_idx ON membership.membership_schemes USING btree (tenant_id, organisation_id);

--
-- Name: memberships_customer_idx; Type: INDEX; Schema: membership; Owner: -
--

CREATE INDEX memberships_customer_idx ON membership.memberships USING btree (tenant_id, customer_id);

--
-- Name: memberships_owner_idx; Type: INDEX; Schema: membership; Owner: -
--

CREATE INDEX memberships_owner_idx ON membership.memberships USING btree (tenant_id, owner_type, owner_id);

--
-- Name: memberships_plan_idx; Type: INDEX; Schema: membership; Owner: -
--

CREATE INDEX memberships_plan_idx ON membership.memberships USING btree (tenant_id, plan_id);

--
-- Name: memberships_status_idx; Type: INDEX; Schema: membership; Owner: -
--

CREATE INDEX memberships_status_idx ON membership.memberships USING btree (tenant_id, organisation_id, status);

--
-- Name: memberships_tenant_org_idx; Type: INDEX; Schema: membership; Owner: -
--

CREATE INDEX memberships_tenant_org_idx ON membership.memberships USING btree (tenant_id, organisation_id);

--
-- Name: entitlement_policies entitlement_policies_set_updated_at; Type: TRIGGER; Schema: membership; Owner: -
--

CREATE TRIGGER entitlement_policies_set_updated_at BEFORE UPDATE ON membership.entitlement_policies FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();

--
-- Name: membership_participants membership_participants_set_updated_at; Type: TRIGGER; Schema: membership; Owner: -
--

CREATE TRIGGER membership_participants_set_updated_at BEFORE UPDATE ON membership.membership_participants FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();

--
-- Name: membership_plan_coverage_rules membership_plan_coverage_rules_set_updated_at; Type: TRIGGER; Schema: membership; Owner: -
--

CREATE TRIGGER membership_plan_coverage_rules_set_updated_at BEFORE UPDATE ON membership.membership_plan_coverage_rules FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();

--
-- Name: membership_plan_duration membership_plan_duration_set_updated_at; Type: TRIGGER; Schema: membership; Owner: -
--

CREATE TRIGGER membership_plan_duration_set_updated_at BEFORE UPDATE ON membership.membership_plan_duration FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();

--
-- Name: membership_plan_eligibility_rules membership_plan_eligibility_rules_set_updated_at; Type: TRIGGER; Schema: membership; Owner: -
--

CREATE TRIGGER membership_plan_eligibility_rules_set_updated_at BEFORE UPDATE ON membership.membership_plan_eligibility_rules FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();

--
-- Name: membership_plan_entitlements membership_plan_entitlements_set_updated_at; Type: TRIGGER; Schema: membership; Owner: -
--

CREATE TRIGGER membership_plan_entitlements_set_updated_at BEFORE UPDATE ON membership.membership_plan_entitlements FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();

--
-- Name: membership_plan_pricing membership_plan_pricing_set_updated_at; Type: TRIGGER; Schema: membership; Owner: -
--

CREATE TRIGGER membership_plan_pricing_set_updated_at BEFORE UPDATE ON membership.membership_plan_pricing FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();

--
-- Name: membership_plans membership_plans_set_updated_at; Type: TRIGGER; Schema: membership; Owner: -
--

CREATE TRIGGER membership_plans_set_updated_at BEFORE UPDATE ON membership.membership_plans FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();

--
-- Name: membership_schemes membership_schemes_set_updated_at; Type: TRIGGER; Schema: membership; Owner: -
--

CREATE TRIGGER membership_schemes_set_updated_at BEFORE UPDATE ON membership.membership_schemes FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();

--
-- Name: memberships memberships_set_updated_at; Type: TRIGGER; Schema: membership; Owner: -
--

CREATE TRIGGER memberships_set_updated_at BEFORE UPDATE ON membership.memberships FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();

--
-- Name: membership_audit membership_audit_membership_fk; Type: FK CONSTRAINT; Schema: membership; Owner: -
--

ALTER TABLE ONLY membership.membership_audit
    ADD CONSTRAINT membership_audit_membership_fk FOREIGN KEY (membership_id) REFERENCES membership.memberships(id) ON DELETE CASCADE;

--
-- Name: membership_lifecycle_events membership_lifecycle_events_membership_id_fkey; Type: FK CONSTRAINT; Schema: membership; Owner: -
--

ALTER TABLE ONLY membership.membership_lifecycle_events
    ADD CONSTRAINT membership_lifecycle_events_membership_id_fkey FOREIGN KEY (membership_id) REFERENCES membership.memberships(id);

--
-- Name: membership_participants membership_participants_membership_fk; Type: FK CONSTRAINT; Schema: membership; Owner: -
--

ALTER TABLE ONLY membership.membership_participants
    ADD CONSTRAINT membership_participants_membership_fk FOREIGN KEY (membership_id) REFERENCES membership.memberships(id) ON DELETE CASCADE;

--
-- Name: membership_participants membership_participants_person_fk; Type: FK CONSTRAINT; Schema: membership; Owner: -
--

-- REMOVED: membership_participants_person_fk -> identity.people
--
-- A cross-schema foreign key into the orphaned "identity" schema (a leftover from
-- the customer->people rename; its tables are empty and no code references them).
-- Deliberately not recreated: a database-level FK between two services' schemas
-- physically prevents them living in separate regional databases, which is the
-- coupling this platform is removing. See
-- docs/architecture/cross-schema-coupling-inventory.md.
-- Integrity across that boundary is maintained by contract, not by the database.


--
-- Name: membership_plan_coverage_rules membership_plan_coverage_rules_plan_fk; Type: FK CONSTRAINT; Schema: membership; Owner: -
--

ALTER TABLE ONLY membership.membership_plan_coverage_rules
    ADD CONSTRAINT membership_plan_coverage_rules_plan_fk FOREIGN KEY (plan_id) REFERENCES membership.membership_plans(id) ON DELETE CASCADE;

--
-- Name: membership_plan_duration membership_plan_duration_plan_fk; Type: FK CONSTRAINT; Schema: membership; Owner: -
--

ALTER TABLE ONLY membership.membership_plan_duration
    ADD CONSTRAINT membership_plan_duration_plan_fk FOREIGN KEY (plan_id) REFERENCES membership.membership_plans(id) ON DELETE CASCADE;

--
-- Name: membership_plan_eligibility_rules membership_plan_eligibility_rules_plan_fk; Type: FK CONSTRAINT; Schema: membership; Owner: -
--

ALTER TABLE ONLY membership.membership_plan_eligibility_rules
    ADD CONSTRAINT membership_plan_eligibility_rules_plan_fk FOREIGN KEY (plan_id) REFERENCES membership.membership_plans(id) ON DELETE CASCADE;

--
-- Name: membership_plan_entitlements membership_plan_entitlements_plan_fk; Type: FK CONSTRAINT; Schema: membership; Owner: -
--

ALTER TABLE ONLY membership.membership_plan_entitlements
    ADD CONSTRAINT membership_plan_entitlements_plan_fk FOREIGN KEY (plan_id) REFERENCES membership.membership_plans(id) ON DELETE CASCADE;

--
-- Name: membership_plan_entitlements membership_plan_entitlements_policy_fk; Type: FK CONSTRAINT; Schema: membership; Owner: -
--

ALTER TABLE ONLY membership.membership_plan_entitlements
    ADD CONSTRAINT membership_plan_entitlements_policy_fk FOREIGN KEY (entitlement_policy_id) REFERENCES membership.entitlement_policies(id) ON DELETE CASCADE;

--
-- Name: membership_plan_payment_methods membership_plan_payment_methods_plan_fk; Type: FK CONSTRAINT; Schema: membership; Owner: -
--

ALTER TABLE ONLY membership.membership_plan_payment_methods
    ADD CONSTRAINT membership_plan_payment_methods_plan_fk FOREIGN KEY (plan_id) REFERENCES membership.membership_plans(id) ON DELETE CASCADE;

--
-- Name: membership_plan_pricing membership_plan_pricing_plan_fk; Type: FK CONSTRAINT; Schema: membership; Owner: -
--

ALTER TABLE ONLY membership.membership_plan_pricing
    ADD CONSTRAINT membership_plan_pricing_plan_fk FOREIGN KEY (plan_id) REFERENCES membership.membership_plans(id) ON DELETE CASCADE;

--
-- Name: membership_plans membership_plans_scheme_fk; Type: FK CONSTRAINT; Schema: membership; Owner: -
--

ALTER TABLE ONLY membership.membership_plans
    ADD CONSTRAINT membership_plans_scheme_fk FOREIGN KEY (scheme_id) REFERENCES membership.membership_schemes(id) ON DELETE CASCADE;

--
-- Name: memberships memberships_plan_fk; Type: FK CONSTRAINT; Schema: membership; Owner: -
--

ALTER TABLE ONLY membership.memberships
    ADD CONSTRAINT memberships_plan_fk FOREIGN KEY (plan_id) REFERENCES membership.membership_plans(id);

--
-- PostgreSQL database dump complete
--

