-- Baseline for the "venue" schema.
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
-- Name: venue; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS venue;

--
-- Name: AffiliationStatus; Type: TYPE; Schema: venue; Owner: -
--

CREATE TYPE venue."AffiliationStatus" AS ENUM (
    'pending',
    'active',
    'suspended',
    'ended'
);

--
-- Name: TenantType; Type: TYPE; Schema: venue; Owner: -
--

CREATE TYPE venue."TenantType" AS ENUM (
    'enterprise',
    'operator',
    'club'
);

--
-- Name: set_seasonal_schedules_updated_at(); Type: FUNCTION; Schema: venue; Owner: -
--

CREATE FUNCTION venue.set_seasonal_schedules_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

--
-- Name: add_ons; Type: TABLE; Schema: venue; Owner: -
--

CREATE TABLE venue.add_ons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    venue_id uuid,
    name text NOT NULL,
    code text NOT NULL,
    description text,
    category text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    pricing_type text DEFAULT 'fixed'::text NOT NULL,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    currency character(3) DEFAULT 'GBP'::bpchar NOT NULL,
    inventory_mode text DEFAULT 'unlimited'::text NOT NULL,
    total_inventory integer,
    allowed_resource_types text[],
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);

--
-- Name: affiliations; Type: TABLE; Schema: venue; Owner: -
--

CREATE TABLE venue.affiliations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    organisation_id uuid NOT NULL,
    governing_tenant_id uuid NOT NULL,
    status venue."AffiliationStatus" DEFAULT 'pending'::venue."AffiliationStatus" NOT NULL,
    policy_pack_id uuid,
    effective_from date,
    effective_to date,
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);

--
-- Name: availability_configs; Type: TABLE; Schema: venue; Owner: -
--

CREATE TABLE venue.availability_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    scope_type text NOT NULL,
    scope_id uuid NOT NULL,
    day_of_week integer,
    opens_at text,
    closes_at text,
    slot_duration_minutes integer,
    booking_interval_minutes integer,
    new_day_release_time text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    seasonal_schedule_id uuid
);

--
-- Name: blackout_dates; Type: TABLE; Schema: venue; Owner: -
--

CREATE TABLE venue.blackout_dates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    venue_id uuid NOT NULL,
    resource_id uuid,
    name text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    recurrence_rule text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);

--
-- Name: bookable_units; Type: TABLE; Schema: venue; Owner: -
--

CREATE TABLE venue.bookable_units (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    venue_id uuid NOT NULL,
    resource_id uuid NOT NULL,
    parent_unit_id uuid,
    name text NOT NULL,
    unit_type text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    capacity integer,
    is_active boolean DEFAULT true NOT NULL,
    is_optional_extra boolean DEFAULT false NOT NULL
);

--
-- Name: news_posts; Type: TABLE; Schema: venue; Owner: -
--

CREATE TABLE venue.news_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    body text,
    cover_image_url text,
    published boolean DEFAULT false NOT NULL,
    published_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);

--
-- Name: organisations; Type: TABLE; Schema: venue; Owner: -
--

CREATE TABLE venue.organisations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    tenant_type venue."TenantType" DEFAULT 'club'::venue."TenantType" NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    custom_domain text,
    primary_colour text DEFAULT '#1857E0'::text NOT NULL,
    logo_url text,
    about text,
    address text,
    phone text,
    email text,
    maps_embed_url text,
    is_published boolean DEFAULT false NOT NULL,
    app_name text,
    club_code text,
    secondary_colour text,
    heading_font text,
    body_font text,
    nav_layout text DEFAULT 'dark-inline'::text NOT NULL,
    favicon_url text,
    portal_template text DEFAULT 'bold'::text NOT NULL,
    home_page_content jsonb,
    has_teams boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);

--
-- Name: resource_groups; Type: TABLE; Schema: venue; Owner: -
--

CREATE TABLE venue.resource_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    venue_id uuid NOT NULL,
    name text NOT NULL,
    sport text,
    description text,
    colour text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);

--
-- Name: resources; Type: TABLE; Schema: venue; Owner: -
--

CREATE TABLE venue.resources (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    venue_id uuid NOT NULL,
    group_id uuid,
    name text NOT NULL,
    resource_type text NOT NULL,
    sport text,
    surface text,
    is_indoor boolean,
    has_lighting boolean,
    booking_purposes text[] DEFAULT ARRAY[]::text[],
    description text,
    colour text,
    public_attributes jsonb DEFAULT '{}'::jsonb NOT NULL,
    visible_attributes text[] DEFAULT ARRAY['surface'::text, 'isIndoor'::text, 'hasLighting'::text, 'description'::text, 'sport'::text],
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);

--
-- Name: seasonal_schedules; Type: TABLE; Schema: venue; Owner: -
--

CREATE TABLE venue.seasonal_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    venue_id uuid NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: sponsors; Type: TABLE; Schema: venue; Owner: -
--

CREATE TABLE venue.sponsors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    organisation_id uuid NOT NULL,
    name text NOT NULL,
    logo_url text NOT NULL,
    website_url text,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);

--
-- Name: unit_conflicts; Type: TABLE; Schema: venue; Owner: -
--

CREATE TABLE venue.unit_conflicts (
    unit_id uuid NOT NULL,
    conflicting_unit_id uuid NOT NULL
);

--
-- Name: venue_settings; Type: TABLE; Schema: venue; Owner: -
--

CREATE TABLE venue.venue_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    venue_id uuid NOT NULL,
    open_bookings boolean DEFAULT false NOT NULL,
    add_ons_enabled boolean DEFAULT true NOT NULL,
    pending_approvals boolean DEFAULT false NOT NULL,
    split_payments boolean DEFAULT false NOT NULL,
    public_booking_view text DEFAULT 'none'::text NOT NULL,
    club_code text,
    primary_colour text DEFAULT '#1857E0'::text NOT NULL,
    logo_url text,
    app_name text,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: venues; Type: TABLE; Schema: venue; Owner: -
--

CREATE TABLE venue.venues (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    organisation_id uuid,
    name text NOT NULL,
    timezone text DEFAULT 'Europe/London'::text NOT NULL,
    city text,
    country text DEFAULT 'GB'::text NOT NULL
);

--
-- Name: add_ons add_ons_pkey; Type: CONSTRAINT; Schema: venue; Owner: -
--

ALTER TABLE ONLY venue.add_ons
    ADD CONSTRAINT add_ons_pkey PRIMARY KEY (id);

--
-- Name: affiliations affiliations_pkey; Type: CONSTRAINT; Schema: venue; Owner: -
--

ALTER TABLE ONLY venue.affiliations
    ADD CONSTRAINT affiliations_pkey PRIMARY KEY (id);

--
-- Name: availability_configs availability_configs_pkey; Type: CONSTRAINT; Schema: venue; Owner: -
--

ALTER TABLE ONLY venue.availability_configs
    ADD CONSTRAINT availability_configs_pkey PRIMARY KEY (id);

--
-- Name: blackout_dates blackout_dates_pkey; Type: CONSTRAINT; Schema: venue; Owner: -
--

ALTER TABLE ONLY venue.blackout_dates
    ADD CONSTRAINT blackout_dates_pkey PRIMARY KEY (id);

--
-- Name: bookable_units bookable_units_pkey; Type: CONSTRAINT; Schema: venue; Owner: -
--

ALTER TABLE ONLY venue.bookable_units
    ADD CONSTRAINT bookable_units_pkey PRIMARY KEY (id);

--
-- Name: news_posts news_posts_pkey; Type: CONSTRAINT; Schema: venue; Owner: -
--

ALTER TABLE ONLY venue.news_posts
    ADD CONSTRAINT news_posts_pkey PRIMARY KEY (id);

--
-- Name: organisations organisations_pkey; Type: CONSTRAINT; Schema: venue; Owner: -
--

ALTER TABLE ONLY venue.organisations
    ADD CONSTRAINT organisations_pkey PRIMARY KEY (id);

--
-- Name: resource_groups resource_groups_pkey; Type: CONSTRAINT; Schema: venue; Owner: -
--

ALTER TABLE ONLY venue.resource_groups
    ADD CONSTRAINT resource_groups_pkey PRIMARY KEY (id);

--
-- Name: resources resources_pkey; Type: CONSTRAINT; Schema: venue; Owner: -
--

ALTER TABLE ONLY venue.resources
    ADD CONSTRAINT resources_pkey PRIMARY KEY (id);

--
-- Name: seasonal_schedules seasonal_schedules_pkey; Type: CONSTRAINT; Schema: venue; Owner: -
--

ALTER TABLE ONLY venue.seasonal_schedules
    ADD CONSTRAINT seasonal_schedules_pkey PRIMARY KEY (id);

--
-- Name: sponsors sponsors_pkey; Type: CONSTRAINT; Schema: venue; Owner: -
--

ALTER TABLE ONLY venue.sponsors
    ADD CONSTRAINT sponsors_pkey PRIMARY KEY (id);

--
-- Name: unit_conflicts unit_conflicts_pkey; Type: CONSTRAINT; Schema: venue; Owner: -
--

ALTER TABLE ONLY venue.unit_conflicts
    ADD CONSTRAINT unit_conflicts_pkey PRIMARY KEY (unit_id, conflicting_unit_id);

--
-- Name: venue_settings venue_settings_pkey; Type: CONSTRAINT; Schema: venue; Owner: -
--

ALTER TABLE ONLY venue.venue_settings
    ADD CONSTRAINT venue_settings_pkey PRIMARY KEY (id);

--
-- Name: venues venues_pkey; Type: CONSTRAINT; Schema: venue; Owner: -
--

ALTER TABLE ONLY venue.venues
    ADD CONSTRAINT venues_pkey PRIMARY KEY (id);

--
-- Name: add_ons_tenant_id_code_key; Type: INDEX; Schema: venue; Owner: -
--

CREATE UNIQUE INDEX add_ons_tenant_id_code_key ON venue.add_ons USING btree (tenant_id, code);

--
-- Name: add_ons_tenant_id_idx; Type: INDEX; Schema: venue; Owner: -
--

CREATE INDEX add_ons_tenant_id_idx ON venue.add_ons USING btree (tenant_id);

--
-- Name: add_ons_tenant_id_status_idx; Type: INDEX; Schema: venue; Owner: -
--

CREATE INDEX add_ons_tenant_id_status_idx ON venue.add_ons USING btree (tenant_id, status);

--
-- Name: add_ons_tenant_id_venue_id_idx; Type: INDEX; Schema: venue; Owner: -
--

CREATE INDEX add_ons_tenant_id_venue_id_idx ON venue.add_ons USING btree (tenant_id, venue_id);

--
-- Name: add_ons_tenant_status_idx; Type: INDEX; Schema: venue; Owner: -
--

CREATE INDEX add_ons_tenant_status_idx ON venue.add_ons USING btree (tenant_id, status);

--
-- Name: add_ons_tenant_venue_idx; Type: INDEX; Schema: venue; Owner: -
--

CREATE INDEX add_ons_tenant_venue_idx ON venue.add_ons USING btree (tenant_id, venue_id);

--
-- Name: affiliations_governing_tenant_id_idx; Type: INDEX; Schema: venue; Owner: -
--

CREATE INDEX affiliations_governing_tenant_id_idx ON venue.affiliations USING btree (governing_tenant_id);

--
-- Name: affiliations_organisation_id_idx; Type: INDEX; Schema: venue; Owner: -
--

CREATE INDEX affiliations_organisation_id_idx ON venue.affiliations USING btree (organisation_id);

--
-- Name: affiliations_tenant_id_idx; Type: INDEX; Schema: venue; Owner: -
--

CREATE INDEX affiliations_tenant_id_idx ON venue.affiliations USING btree (tenant_id);

--
-- Name: availability_configs_tenant_id_idx; Type: INDEX; Schema: venue; Owner: -
--

CREATE INDEX availability_configs_tenant_id_idx ON venue.availability_configs USING btree (tenant_id);

--
-- Name: availability_configs_tenant_id_scope_type_scope_id_idx; Type: INDEX; Schema: venue; Owner: -
--

CREATE INDEX availability_configs_tenant_id_scope_type_scope_id_idx ON venue.availability_configs USING btree (tenant_id, scope_type, scope_id);

--
-- Name: blackout_dates_tenant_id_idx; Type: INDEX; Schema: venue; Owner: -
--

CREATE INDEX blackout_dates_tenant_id_idx ON venue.blackout_dates USING btree (tenant_id);

--
-- Name: blackout_dates_tenant_id_venue_id_idx; Type: INDEX; Schema: venue; Owner: -
--

CREATE INDEX blackout_dates_tenant_id_venue_id_idx ON venue.blackout_dates USING btree (tenant_id, venue_id);

--
-- Name: bookable_units_resource_id_idx; Type: INDEX; Schema: venue; Owner: -
--

CREATE INDEX bookable_units_resource_id_idx ON venue.bookable_units USING btree (resource_id);

--
-- Name: bookable_units_tenant_id_idx; Type: INDEX; Schema: venue; Owner: -
--

CREATE INDEX bookable_units_tenant_id_idx ON venue.bookable_units USING btree (tenant_id);

--
-- Name: bookable_units_venue_id_idx; Type: INDEX; Schema: venue; Owner: -
--

CREATE INDEX bookable_units_venue_id_idx ON venue.bookable_units USING btree (venue_id);

--
-- Name: idx_availability_configs_schedule; Type: INDEX; Schema: venue; Owner: -
--

CREATE INDEX idx_availability_configs_schedule ON venue.availability_configs USING btree (tenant_id, seasonal_schedule_id) WHERE (seasonal_schedule_id IS NOT NULL);

--
-- Name: idx_seasonal_schedules_status; Type: INDEX; Schema: venue; Owner: -
--

CREATE INDEX idx_seasonal_schedules_status ON venue.seasonal_schedules USING btree (tenant_id, status);

--
-- Name: idx_seasonal_schedules_tenant; Type: INDEX; Schema: venue; Owner: -
--

CREATE INDEX idx_seasonal_schedules_tenant ON venue.seasonal_schedules USING btree (tenant_id);

--
-- Name: idx_seasonal_schedules_venue; Type: INDEX; Schema: venue; Owner: -
--

CREATE INDEX idx_seasonal_schedules_venue ON venue.seasonal_schedules USING btree (tenant_id, venue_id);

--
-- Name: news_posts_tenant_id_idx; Type: INDEX; Schema: venue; Owner: -
--

CREATE INDEX news_posts_tenant_id_idx ON venue.news_posts USING btree (tenant_id);

--
-- Name: news_posts_tenant_id_published_idx; Type: INDEX; Schema: venue; Owner: -
--

CREATE INDEX news_posts_tenant_id_published_idx ON venue.news_posts USING btree (tenant_id, published);

--
-- Name: news_posts_tenant_id_slug_key; Type: INDEX; Schema: venue; Owner: -
--

CREATE UNIQUE INDEX news_posts_tenant_id_slug_key ON venue.news_posts USING btree (tenant_id, slug);

--
-- Name: organisations_club_code_key; Type: INDEX; Schema: venue; Owner: -
--

CREATE UNIQUE INDEX organisations_club_code_key ON venue.organisations USING btree (club_code);

--
-- Name: organisations_custom_domain_key; Type: INDEX; Schema: venue; Owner: -
--

CREATE UNIQUE INDEX organisations_custom_domain_key ON venue.organisations USING btree (custom_domain);

--
-- Name: organisations_slug_idx; Type: INDEX; Schema: venue; Owner: -
--

CREATE INDEX organisations_slug_idx ON venue.organisations USING btree (slug);

--
-- Name: organisations_slug_key; Type: INDEX; Schema: venue; Owner: -
--

CREATE UNIQUE INDEX organisations_slug_key ON venue.organisations USING btree (slug);

--
-- Name: organisations_tenant_id_idx; Type: INDEX; Schema: venue; Owner: -
--

CREATE INDEX organisations_tenant_id_idx ON venue.organisations USING btree (tenant_id);

--
-- Name: organisations_tenant_id_key; Type: INDEX; Schema: venue; Owner: -
--

CREATE UNIQUE INDEX organisations_tenant_id_key ON venue.organisations USING btree (tenant_id);

--
-- Name: resource_groups_tenant_id_idx; Type: INDEX; Schema: venue; Owner: -
--

CREATE INDEX resource_groups_tenant_id_idx ON venue.resource_groups USING btree (tenant_id);

--
-- Name: resource_groups_venue_id_idx; Type: INDEX; Schema: venue; Owner: -
--

CREATE INDEX resource_groups_venue_id_idx ON venue.resource_groups USING btree (venue_id);

--
-- Name: resources_group_id_idx; Type: INDEX; Schema: venue; Owner: -
--

CREATE INDEX resources_group_id_idx ON venue.resources USING btree (group_id);

--
-- Name: resources_tenant_id_idx; Type: INDEX; Schema: venue; Owner: -
--

CREATE INDEX resources_tenant_id_idx ON venue.resources USING btree (tenant_id);

--
-- Name: resources_venue_id_idx; Type: INDEX; Schema: venue; Owner: -
--

CREATE INDEX resources_venue_id_idx ON venue.resources USING btree (venue_id);

--
-- Name: sponsors_organisation_id_is_active_display_order_idx; Type: INDEX; Schema: venue; Owner: -
--

CREATE INDEX sponsors_organisation_id_is_active_display_order_idx ON venue.sponsors USING btree (organisation_id, is_active, display_order);

--
-- Name: sponsors_tenant_id_idx; Type: INDEX; Schema: venue; Owner: -
--

CREATE INDEX sponsors_tenant_id_idx ON venue.sponsors USING btree (tenant_id);

--
-- Name: venue_settings_club_code_key; Type: INDEX; Schema: venue; Owner: -
--

CREATE UNIQUE INDEX venue_settings_club_code_key ON venue.venue_settings USING btree (club_code);

--
-- Name: venue_settings_venue_id_key; Type: INDEX; Schema: venue; Owner: -
--

CREATE UNIQUE INDEX venue_settings_venue_id_key ON venue.venue_settings USING btree (venue_id);

--
-- Name: venues_organisation_id_idx; Type: INDEX; Schema: venue; Owner: -
--

CREATE INDEX venues_organisation_id_idx ON venue.venues USING btree (organisation_id);

--
-- Name: venues_tenant_id_idx; Type: INDEX; Schema: venue; Owner: -
--

CREATE INDEX venues_tenant_id_idx ON venue.venues USING btree (tenant_id);

--
-- Name: seasonal_schedules trg_seasonal_schedules_updated_at; Type: TRIGGER; Schema: venue; Owner: -
--

CREATE TRIGGER trg_seasonal_schedules_updated_at BEFORE UPDATE ON venue.seasonal_schedules FOR EACH ROW EXECUTE FUNCTION venue.set_seasonal_schedules_updated_at();

--
-- Name: affiliations affiliations_organisation_id_fkey; Type: FK CONSTRAINT; Schema: venue; Owner: -
--

ALTER TABLE ONLY venue.affiliations
    ADD CONSTRAINT affiliations_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES venue.organisations(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: availability_configs availability_configs_seasonal_schedule_id_fkey; Type: FK CONSTRAINT; Schema: venue; Owner: -
--

ALTER TABLE ONLY venue.availability_configs
    ADD CONSTRAINT availability_configs_seasonal_schedule_id_fkey FOREIGN KEY (seasonal_schedule_id) REFERENCES venue.seasonal_schedules(id) ON DELETE SET NULL;

--
-- Name: blackout_dates blackout_dates_resource_id_fkey; Type: FK CONSTRAINT; Schema: venue; Owner: -
--

ALTER TABLE ONLY venue.blackout_dates
    ADD CONSTRAINT blackout_dates_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES venue.resources(id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: blackout_dates blackout_dates_venue_id_fkey; Type: FK CONSTRAINT; Schema: venue; Owner: -
--

ALTER TABLE ONLY venue.blackout_dates
    ADD CONSTRAINT blackout_dates_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES venue.venues(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: bookable_units bookable_units_resource_id_fkey; Type: FK CONSTRAINT; Schema: venue; Owner: -
--

ALTER TABLE ONLY venue.bookable_units
    ADD CONSTRAINT bookable_units_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES venue.resources(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: bookable_units bookable_units_venue_id_fkey; Type: FK CONSTRAINT; Schema: venue; Owner: -
--

ALTER TABLE ONLY venue.bookable_units
    ADD CONSTRAINT bookable_units_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES venue.venues(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: resource_groups resource_groups_venue_id_fkey; Type: FK CONSTRAINT; Schema: venue; Owner: -
--

ALTER TABLE ONLY venue.resource_groups
    ADD CONSTRAINT resource_groups_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES venue.venues(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: resources resources_group_id_fkey; Type: FK CONSTRAINT; Schema: venue; Owner: -
--

ALTER TABLE ONLY venue.resources
    ADD CONSTRAINT resources_group_id_fkey FOREIGN KEY (group_id) REFERENCES venue.resource_groups(id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: resources resources_venue_id_fkey; Type: FK CONSTRAINT; Schema: venue; Owner: -
--

ALTER TABLE ONLY venue.resources
    ADD CONSTRAINT resources_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES venue.venues(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: sponsors sponsors_organisation_id_fkey; Type: FK CONSTRAINT; Schema: venue; Owner: -
--

ALTER TABLE ONLY venue.sponsors
    ADD CONSTRAINT sponsors_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES venue.organisations(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: unit_conflicts unit_conflicts_conflicting_unit_id_fkey; Type: FK CONSTRAINT; Schema: venue; Owner: -
--

ALTER TABLE ONLY venue.unit_conflicts
    ADD CONSTRAINT unit_conflicts_conflicting_unit_id_fkey FOREIGN KEY (conflicting_unit_id) REFERENCES venue.bookable_units(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: unit_conflicts unit_conflicts_unit_id_fkey; Type: FK CONSTRAINT; Schema: venue; Owner: -
--

ALTER TABLE ONLY venue.unit_conflicts
    ADD CONSTRAINT unit_conflicts_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES venue.bookable_units(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: venue_settings venue_settings_venue_id_fkey; Type: FK CONSTRAINT; Schema: venue; Owner: -
--

ALTER TABLE ONLY venue.venue_settings
    ADD CONSTRAINT venue_settings_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES venue.venues(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: venues venues_organisation_id_fkey; Type: FK CONSTRAINT; Schema: venue; Owner: -
--

ALTER TABLE ONLY venue.venues
    ADD CONSTRAINT venues_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES venue.organisations(id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- PostgreSQL database dump complete
--

