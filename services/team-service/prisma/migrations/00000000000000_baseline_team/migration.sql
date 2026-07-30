-- Baseline for the "team" schema.
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
-- Name: team; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS team;

--
-- Name: ChargeRunStatus; Type: TYPE; Schema: team; Owner: -
--

CREATE TYPE team."ChargeRunStatus" AS ENUM (
    'draft',
    'sent',
    'completed',
    'cancelled'
);

--
-- Name: ChargeStatus; Type: TYPE; Schema: team; Owner: -
--

CREATE TYPE team."ChargeStatus" AS ENUM (
    'pending',
    'paid',
    'waived'
);

--
-- Name: FixtureStatus; Type: TYPE; Schema: team; Owner: -
--

CREATE TYPE team."FixtureStatus" AS ENUM (
    'draft',
    'scheduled',
    'squad_selected',
    'fees_requested',
    'completed',
    'cancelled'
);

--
-- Name: HomeAway; Type: TYPE; Schema: team; Owner: -
--

CREATE TYPE team."HomeAway" AS ENUM (
    'home',
    'away',
    'neutral'
);

--
-- Name: MemberRole; Type: TYPE; Schema: team; Owner: -
--

CREATE TYPE team."MemberRole" AS ENUM (
    'player',
    'coach',
    'manager'
);

--
-- Name: PlayerAvailability; Type: TYPE; Schema: team; Owner: -
--

CREATE TYPE team."PlayerAvailability" AS ENUM (
    'available',
    'maybe',
    'unavailable',
    'no_response'
);

--
-- Name: SelectionRole; Type: TYPE; Schema: team; Owner: -
--

CREATE TYPE team."SelectionRole" AS ENUM (
    'starter',
    'substitute',
    'reserve'
);

--
-- Name: Sport; Type: TYPE; Schema: team; Owner: -
--

CREATE TYPE team."Sport" AS ENUM (
    'football',
    'cricket',
    'other'
);

--
-- Name: availability_responses; Type: TABLE; Schema: team; Owner: -
--

CREATE TABLE team.availability_responses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    fixture_id uuid NOT NULL,
    team_member_id uuid NOT NULL,
    response team."PlayerAvailability" DEFAULT 'no_response'::team."PlayerAvailability" NOT NULL,
    responded_at timestamp(6) with time zone,
    notes text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: charge_runs; Type: TABLE; Schema: team; Owner: -
--

CREATE TABLE team.charge_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    fixture_id uuid NOT NULL,
    initiated_by uuid,
    status team."ChargeRunStatus" DEFAULT 'draft'::team."ChargeRunStatus" NOT NULL,
    notes text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    order_id uuid
);

--
-- Name: charges; Type: TABLE; Schema: team; Owner: -
--

CREATE TABLE team.charges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    charge_run_id uuid NOT NULL,
    team_member_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    status team."ChargeStatus" DEFAULT 'pending'::team."ChargeStatus" NOT NULL,
    paid_at timestamp(6) with time zone,
    notes text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    payment_id text
);

--
-- Name: fixtures; Type: TABLE; Schema: team; Owner: -
--

CREATE TABLE team.fixtures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    team_id uuid NOT NULL,
    opponent text NOT NULL,
    home_away team."HomeAway" DEFAULT 'home'::team."HomeAway" NOT NULL,
    venue text,
    kickoff_at timestamp(6) with time zone NOT NULL,
    meet_time timestamp(6) with time zone,
    duration_minutes integer,
    match_type text,
    status team."FixtureStatus" DEFAULT 'draft'::team."FixtureStatus" NOT NULL,
    notes text,
    external_ref text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    away_score integer,
    home_score integer
);

--
-- Name: selections; Type: TABLE; Schema: team; Owner: -
--

CREATE TABLE team.selections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    fixture_id uuid NOT NULL,
    team_member_id uuid NOT NULL,
    role team."SelectionRole" DEFAULT 'starter'::team."SelectionRole" NOT NULL,
    "position" text,
    shirt_number integer,
    published_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: team_members; Type: TABLE; Schema: team; Owner: -
--

CREATE TABLE team.team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    team_id uuid NOT NULL,
    person_id uuid,
    display_name text NOT NULL,
    email text,
    phone text,
    "position" text,
    shirt_number integer,
    is_guest boolean DEFAULT false NOT NULL,
    is_junior boolean DEFAULT false NOT NULL,
    date_of_birth date,
    guardian_name text,
    guardian_email text,
    guardian_phone text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    photo_url text,
    role team."MemberRole" DEFAULT 'player'::team."MemberRole" NOT NULL
);

--
-- Name: teams; Type: TABLE; Schema: team; Owner: -
--

CREATE TABLE team.teams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    sport team."Sport" DEFAULT 'football'::team."Sport" NOT NULL,
    season text,
    age_group text,
    gender text,
    default_match_fee numeric(10,2),
    junior_match_fee numeric(10,2),
    substitute_match_fee numeric(10,2),
    charge_rule text DEFAULT 'selected'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fixtures_url text,
    is_public boolean DEFAULT true NOT NULL
);

--
-- Name: availability_responses availability_responses_pkey; Type: CONSTRAINT; Schema: team; Owner: -
--

ALTER TABLE ONLY team.availability_responses
    ADD CONSTRAINT availability_responses_pkey PRIMARY KEY (id);

--
-- Name: charge_runs charge_runs_pkey; Type: CONSTRAINT; Schema: team; Owner: -
--

ALTER TABLE ONLY team.charge_runs
    ADD CONSTRAINT charge_runs_pkey PRIMARY KEY (id);

--
-- Name: charges charges_pkey; Type: CONSTRAINT; Schema: team; Owner: -
--

ALTER TABLE ONLY team.charges
    ADD CONSTRAINT charges_pkey PRIMARY KEY (id);

--
-- Name: fixtures fixtures_pkey; Type: CONSTRAINT; Schema: team; Owner: -
--

ALTER TABLE ONLY team.fixtures
    ADD CONSTRAINT fixtures_pkey PRIMARY KEY (id);

--
-- Name: selections selections_pkey; Type: CONSTRAINT; Schema: team; Owner: -
--

ALTER TABLE ONLY team.selections
    ADD CONSTRAINT selections_pkey PRIMARY KEY (id);

--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: team; Owner: -
--

ALTER TABLE ONLY team.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);

--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: team; Owner: -
--

ALTER TABLE ONLY team.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);

--
-- Name: availability_responses_fixture_id_idx; Type: INDEX; Schema: team; Owner: -
--

CREATE INDEX availability_responses_fixture_id_idx ON team.availability_responses USING btree (fixture_id);

--
-- Name: availability_responses_fixture_id_team_member_id_key; Type: INDEX; Schema: team; Owner: -
--

CREATE UNIQUE INDEX availability_responses_fixture_id_team_member_id_key ON team.availability_responses USING btree (fixture_id, team_member_id);

--
-- Name: availability_responses_team_member_id_idx; Type: INDEX; Schema: team; Owner: -
--

CREATE INDEX availability_responses_team_member_id_idx ON team.availability_responses USING btree (team_member_id);

--
-- Name: charge_runs_fixture_id_idx; Type: INDEX; Schema: team; Owner: -
--

CREATE INDEX charge_runs_fixture_id_idx ON team.charge_runs USING btree (fixture_id);

--
-- Name: charge_runs_tenant_id_idx; Type: INDEX; Schema: team; Owner: -
--

CREATE INDEX charge_runs_tenant_id_idx ON team.charge_runs USING btree (tenant_id);

--
-- Name: charges_charge_run_id_idx; Type: INDEX; Schema: team; Owner: -
--

CREATE INDEX charges_charge_run_id_idx ON team.charges USING btree (charge_run_id);

--
-- Name: charges_status_idx; Type: INDEX; Schema: team; Owner: -
--

CREATE INDEX charges_status_idx ON team.charges USING btree (status);

--
-- Name: charges_team_member_id_idx; Type: INDEX; Schema: team; Owner: -
--

CREATE INDEX charges_team_member_id_idx ON team.charges USING btree (team_member_id);

--
-- Name: fixtures_team_id_idx; Type: INDEX; Schema: team; Owner: -
--

CREATE INDEX fixtures_team_id_idx ON team.fixtures USING btree (team_id);

--
-- Name: fixtures_team_id_kickoff_at_idx; Type: INDEX; Schema: team; Owner: -
--

CREATE INDEX fixtures_team_id_kickoff_at_idx ON team.fixtures USING btree (team_id, kickoff_at);

--
-- Name: fixtures_team_id_status_idx; Type: INDEX; Schema: team; Owner: -
--

CREATE INDEX fixtures_team_id_status_idx ON team.fixtures USING btree (team_id, status);

--
-- Name: fixtures_tenant_id_idx; Type: INDEX; Schema: team; Owner: -
--

CREATE INDEX fixtures_tenant_id_idx ON team.fixtures USING btree (tenant_id);

--
-- Name: selections_fixture_id_idx; Type: INDEX; Schema: team; Owner: -
--

CREATE INDEX selections_fixture_id_idx ON team.selections USING btree (fixture_id);

--
-- Name: selections_fixture_id_team_member_id_key; Type: INDEX; Schema: team; Owner: -
--

CREATE UNIQUE INDEX selections_fixture_id_team_member_id_key ON team.selections USING btree (fixture_id, team_member_id);

--
-- Name: selections_team_member_id_idx; Type: INDEX; Schema: team; Owner: -
--

CREATE INDEX selections_team_member_id_idx ON team.selections USING btree (team_member_id);

--
-- Name: team_members_person_id_idx; Type: INDEX; Schema: team; Owner: -
--

CREATE INDEX team_members_person_id_idx ON team.team_members USING btree (person_id);

--
-- Name: team_members_team_id_idx; Type: INDEX; Schema: team; Owner: -
--

CREATE INDEX team_members_team_id_idx ON team.team_members USING btree (team_id);

--
-- Name: team_members_team_id_is_active_idx; Type: INDEX; Schema: team; Owner: -
--

CREATE INDEX team_members_team_id_is_active_idx ON team.team_members USING btree (team_id, is_active);

--
-- Name: team_members_tenant_id_idx; Type: INDEX; Schema: team; Owner: -
--

CREATE INDEX team_members_tenant_id_idx ON team.team_members USING btree (tenant_id);

--
-- Name: teams_tenant_id_idx; Type: INDEX; Schema: team; Owner: -
--

CREATE INDEX teams_tenant_id_idx ON team.teams USING btree (tenant_id);

--
-- Name: teams_tenant_id_is_active_idx; Type: INDEX; Schema: team; Owner: -
--

CREATE INDEX teams_tenant_id_is_active_idx ON team.teams USING btree (tenant_id, is_active);

--
-- Name: teams_tenant_id_sport_idx; Type: INDEX; Schema: team; Owner: -
--

CREATE INDEX teams_tenant_id_sport_idx ON team.teams USING btree (tenant_id, sport);

--
-- Name: availability_responses availability_responses_fixture_id_fkey; Type: FK CONSTRAINT; Schema: team; Owner: -
--

ALTER TABLE ONLY team.availability_responses
    ADD CONSTRAINT availability_responses_fixture_id_fkey FOREIGN KEY (fixture_id) REFERENCES team.fixtures(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: availability_responses availability_responses_team_member_id_fkey; Type: FK CONSTRAINT; Schema: team; Owner: -
--

ALTER TABLE ONLY team.availability_responses
    ADD CONSTRAINT availability_responses_team_member_id_fkey FOREIGN KEY (team_member_id) REFERENCES team.team_members(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: charge_runs charge_runs_fixture_id_fkey; Type: FK CONSTRAINT; Schema: team; Owner: -
--

ALTER TABLE ONLY team.charge_runs
    ADD CONSTRAINT charge_runs_fixture_id_fkey FOREIGN KEY (fixture_id) REFERENCES team.fixtures(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: charges charges_charge_run_id_fkey; Type: FK CONSTRAINT; Schema: team; Owner: -
--

ALTER TABLE ONLY team.charges
    ADD CONSTRAINT charges_charge_run_id_fkey FOREIGN KEY (charge_run_id) REFERENCES team.charge_runs(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: charges charges_team_member_id_fkey; Type: FK CONSTRAINT; Schema: team; Owner: -
--

ALTER TABLE ONLY team.charges
    ADD CONSTRAINT charges_team_member_id_fkey FOREIGN KEY (team_member_id) REFERENCES team.team_members(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: fixtures fixtures_team_id_fkey; Type: FK CONSTRAINT; Schema: team; Owner: -
--

ALTER TABLE ONLY team.fixtures
    ADD CONSTRAINT fixtures_team_id_fkey FOREIGN KEY (team_id) REFERENCES team.teams(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: selections selections_fixture_id_fkey; Type: FK CONSTRAINT; Schema: team; Owner: -
--

ALTER TABLE ONLY team.selections
    ADD CONSTRAINT selections_fixture_id_fkey FOREIGN KEY (fixture_id) REFERENCES team.fixtures(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: selections selections_team_member_id_fkey; Type: FK CONSTRAINT; Schema: team; Owner: -
--

ALTER TABLE ONLY team.selections
    ADD CONSTRAINT selections_team_member_id_fkey FOREIGN KEY (team_member_id) REFERENCES team.team_members(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: team_members team_members_team_id_fkey; Type: FK CONSTRAINT; Schema: team; Owner: -
--

ALTER TABLE ONLY team.team_members
    ADD CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES team.teams(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- PostgreSQL database dump complete
--

