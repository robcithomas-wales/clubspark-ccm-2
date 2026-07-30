-- Baseline for the "competitions" schema.
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
-- Name: competitions; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS competitions;

--
-- Name: CompetitionFormat; Type: TYPE; Schema: competitions; Owner: -
--

CREATE TYPE competitions."CompetitionFormat" AS ENUM (
    'LEAGUE',
    'KNOCKOUT',
    'ROUND_ROBIN',
    'GROUP_KNOCKOUT',
    'SWISS',
    'LADDER'
);

--
-- Name: CompetitionStatus; Type: TYPE; Schema: competitions; Owner: -
--

CREATE TYPE competitions."CompetitionStatus" AS ENUM (
    'DRAFT',
    'REGISTRATION_OPEN',
    'IN_PROGRESS',
    'COMPLETED',
    'ARCHIVED',
    'AWAITING_APPROVAL'
);

--
-- Name: DisciplineCaseStatus; Type: TYPE; Schema: competitions; Owner: -
--

CREATE TYPE competitions."DisciplineCaseStatus" AS ENUM (
    'OPEN',
    'UNDER_REVIEW',
    'RESOLVED',
    'APPEALED',
    'CLOSED'
);

--
-- Name: DisciplineOutcome; Type: TYPE; Schema: competitions; Owner: -
--

CREATE TYPE competitions."DisciplineOutcome" AS ENUM (
    'WARNING',
    'FINE',
    'MATCH_BAN',
    'COMPETITION_BAN',
    'SUSPENSION',
    'DISQUALIFICATION',
    'NO_ACTION'
);

--
-- Name: EntryStatus; Type: TYPE; Schema: competitions; Owner: -
--

CREATE TYPE competitions."EntryStatus" AS ENUM (
    'PENDING',
    'CONFIRMED',
    'WITHDRAWN',
    'DISQUALIFIED'
);

--
-- Name: EntryType; Type: TYPE; Schema: competitions; Owner: -
--

CREATE TYPE competitions."EntryType" AS ENUM (
    'INDIVIDUAL',
    'TEAM',
    'DOUBLES',
    'MIXED_DOUBLES'
);

--
-- Name: MatchStatus; Type: TYPE; Schema: competitions; Owner: -
--

CREATE TYPE competitions."MatchStatus" AS ENUM (
    'SCHEDULED',
    'IN_PROGRESS',
    'COMPLETED',
    'WALKOVER',
    'BYE',
    'POSTPONED',
    'CANCELLED'
);

--
-- Name: MessageAudience; Type: TYPE; Schema: competitions; Owner: -
--

CREATE TYPE competitions."MessageAudience" AS ENUM (
    'ALL_ENTRANTS',
    'CONFIRMED_ENTRANTS',
    'PENDING_ENTRANTS',
    'DIVISION',
    'SPECIFIC'
);

--
-- Name: RankingAlgorithm; Type: TYPE; Schema: competitions; Owner: -
--

CREATE TYPE competitions."RankingAlgorithm" AS ENUM (
    'POINTS_TABLE',
    'ELO'
);

--
-- Name: RankingScope; Type: TYPE; Schema: competitions; Owner: -
--

CREATE TYPE competitions."RankingScope" AS ENUM (
    'COMPETITION',
    'SEASON',
    'ALL_TIME'
);

--
-- Name: ResultStatus; Type: TYPE; Schema: competitions; Owner: -
--

CREATE TYPE competitions."ResultStatus" AS ENUM (
    'SUBMITTED',
    'VERIFIED',
    'DISPUTED'
);

--
-- Name: SubmissionStatus; Type: TYPE; Schema: competitions; Owner: -
--

CREATE TYPE competitions."SubmissionStatus" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'ACKNOWLEDGED',
    'REJECTED'
);

--
-- Name: audit_logs; Type: TABLE; Schema: competitions; Owner: -
--

CREATE TABLE competitions.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    action text NOT NULL,
    actor_id uuid,
    actor_type text DEFAULT 'admin'::text NOT NULL,
    before jsonb,
    after jsonb,
    metadata jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: competition_messages; Type: TABLE; Schema: competitions; Owner: -
--

CREATE TABLE competitions.competition_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    competition_id uuid NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    audience competitions."MessageAudience" DEFAULT 'ALL_ENTRANTS'::competitions."MessageAudience" NOT NULL,
    division_id uuid,
    sent_by uuid,
    sent_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    recipient_count integer DEFAULT 0 NOT NULL
);

--
-- Name: competitions; Type: TABLE; Schema: competitions; Owner: -
--

CREATE TABLE competitions.competitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    organisation_id uuid,
    name text NOT NULL,
    description text,
    sport text NOT NULL,
    season text,
    format competitions."CompetitionFormat" NOT NULL,
    entry_type competitions."EntryType" DEFAULT 'INDIVIDUAL'::competitions."EntryType" NOT NULL,
    status competitions."CompetitionStatus" DEFAULT 'DRAFT'::competitions."CompetitionStatus" NOT NULL,
    registration_opens_at timestamp(3) without time zone,
    registration_closes_at timestamp(3) without time zone,
    start_date timestamp(3) without time zone,
    end_date timestamp(3) without time zone,
    max_entries integer,
    entry_fee numeric(10,2),
    currency text DEFAULT 'GBP'::text NOT NULL,
    eligibility_rules jsonb,
    tiebreak_rules jsonb,
    is_public boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    approved_at timestamp(3) without time zone,
    approved_by uuid,
    late_entry_closes_at timestamp(3) without time zone,
    rejected_at timestamp(3) without time zone,
    rejected_by uuid,
    rejection_reason text
);

--
-- Name: discipline_actions; Type: TABLE; Schema: competitions; Owner: -
--

CREATE TABLE competitions.discipline_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_id uuid NOT NULL,
    outcome competitions."DisciplineOutcome" NOT NULL,
    ban_matches integer,
    suspended_until timestamp(3) without time zone,
    fine_amount numeric(10,2),
    notes text,
    issued_by uuid,
    issued_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: discipline_cases; Type: TABLE; Schema: competitions; Owner: -
--

CREATE TABLE competitions.discipline_cases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    competition_id uuid,
    match_id uuid,
    person_id uuid,
    team_id uuid,
    display_name text NOT NULL,
    description text NOT NULL,
    status competitions."DisciplineCaseStatus" DEFAULT 'OPEN'::competitions."DisciplineCaseStatus" NOT NULL,
    created_by uuid,
    resolved_at timestamp(3) without time zone,
    resolved_by uuid,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: divisions; Type: TABLE; Schema: competitions; Owner: -
--

CREATE TABLE competitions.divisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    competition_id uuid NOT NULL,
    name text NOT NULL,
    format competitions."CompetitionFormat",
    max_entries integer,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: entries; Type: TABLE; Schema: competitions; Owner: -
--

CREATE TABLE competitions.entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    competition_id uuid NOT NULL,
    division_id uuid,
    person_id uuid,
    team_id uuid,
    display_name text NOT NULL,
    seed integer,
    status competitions."EntryStatus" DEFAULT 'PENDING'::competitions."EntryStatus" NOT NULL,
    payment_status text DEFAULT 'unpaid'::text NOT NULL,
    notes text,
    withdrawn_at timestamp(3) without time zone,
    withdrawn_reason text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_late_entry boolean DEFAULT false NOT NULL
);

--
-- Name: matches; Type: TABLE; Schema: competitions; Owner: -
--

CREATE TABLE competitions.matches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    competition_id uuid NOT NULL,
    division_id uuid,
    round integer DEFAULT 1 NOT NULL,
    match_number integer DEFAULT 1 NOT NULL,
    home_entry_id uuid,
    away_entry_id uuid,
    scheduled_at timestamp(3) without time zone,
    venue_id uuid,
    resource_id uuid,
    bookable_unit_id uuid,
    booking_id uuid,
    status competitions."MatchStatus" DEFAULT 'SCHEDULED'::competitions."MatchStatus" NOT NULL,
    winner_id uuid,
    score jsonb,
    home_points numeric(6,2),
    away_points numeric(6,2),
    submitted_by uuid,
    submitted_at timestamp(3) without time zone,
    verified_by uuid,
    verified_at timestamp(3) without time zone,
    result_status competitions."ResultStatus",
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: ranking_configs; Type: TABLE; Schema: competitions; Owner: -
--

CREATE TABLE competitions.ranking_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    sport text NOT NULL,
    scope competitions."RankingScope" NOT NULL,
    algorithm competitions."RankingAlgorithm" NOT NULL,
    season text,
    points_per_win integer DEFAULT 3 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: ranking_entries; Type: TABLE; Schema: competitions; Owner: -
--

CREATE TABLE competitions.ranking_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    config_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    person_id uuid,
    team_id uuid,
    display_name text NOT NULL,
    sport text NOT NULL,
    elo_rating integer DEFAULT 1000 NOT NULL,
    elo_provisional boolean DEFAULT true NOT NULL,
    matches_played integer DEFAULT 0 NOT NULL,
    wins integer DEFAULT 0 NOT NULL,
    draws integer DEFAULT 0 NOT NULL,
    losses integer DEFAULT 0 NOT NULL,
    points integer DEFAULT 0 NOT NULL,
    goals_for integer DEFAULT 0 NOT NULL,
    goals_against integer DEFAULT 0 NOT NULL,
    goal_difference integer DEFAULT 0 NOT NULL,
    rank integer,
    previous_rank integer,
    rank_change integer,
    last_match_at timestamp(3) without time zone,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: ranking_match_events; Type: TABLE; Schema: competitions; Owner: -
--

CREATE TABLE competitions.ranking_match_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    config_id uuid NOT NULL,
    match_id uuid NOT NULL,
    entry_id uuid NOT NULL,
    opponent_entry_id uuid,
    rating_before integer,
    rating_after integer,
    rating_change integer,
    points_awarded integer,
    outcome text NOT NULL,
    processed_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: standings; Type: TABLE; Schema: competitions; Owner: -
--

CREATE TABLE competitions.standings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    competition_id uuid NOT NULL,
    division_id uuid NOT NULL,
    entry_id uuid NOT NULL,
    played integer DEFAULT 0 NOT NULL,
    won integer DEFAULT 0 NOT NULL,
    drawn integer DEFAULT 0 NOT NULL,
    lost integer DEFAULT 0 NOT NULL,
    points_for numeric(10,2) DEFAULT 0 NOT NULL,
    points_against numeric(10,2) DEFAULT 0 NOT NULL,
    points_difference numeric(10,2) DEFAULT 0 NOT NULL,
    points numeric(10,2) DEFAULT 0 NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    previous_position integer,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: tournament_submissions; Type: TABLE; Schema: competitions; Owner: -
--

CREATE TABLE competitions.tournament_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    competition_id uuid NOT NULL,
    submitted_by uuid,
    submitted_at timestamp(3) without time zone,
    status competitions."SubmissionStatus" DEFAULT 'DRAFT'::competitions."SubmissionStatus" NOT NULL,
    governing_body text,
    external_ref text,
    submission_data jsonb,
    response_data jsonb,
    acknowledged_at timestamp(3) without time zone,
    rejected_at timestamp(3) without time zone,
    rejection_reason text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: work_cards; Type: TABLE; Schema: competitions; Owner: -
--

CREATE TABLE competitions.work_cards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    person_id uuid NOT NULL,
    sport text DEFAULT 'tennis'::text NOT NULL,
    grade text,
    category text,
    playing_level text,
    ntrp numeric(3,1),
    utr numeric(5,2),
    lta_rating numeric(5,2),
    eligible_from timestamp(3) without time zone,
    eligible_to timestamp(3) without time zone,
    external_ref text,
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: competitions; Owner: -
--

ALTER TABLE ONLY competitions.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);

--
-- Name: competition_messages competition_messages_pkey; Type: CONSTRAINT; Schema: competitions; Owner: -
--

ALTER TABLE ONLY competitions.competition_messages
    ADD CONSTRAINT competition_messages_pkey PRIMARY KEY (id);

--
-- Name: competitions competitions_pkey; Type: CONSTRAINT; Schema: competitions; Owner: -
--

ALTER TABLE ONLY competitions.competitions
    ADD CONSTRAINT competitions_pkey PRIMARY KEY (id);

--
-- Name: discipline_actions discipline_actions_pkey; Type: CONSTRAINT; Schema: competitions; Owner: -
--

ALTER TABLE ONLY competitions.discipline_actions
    ADD CONSTRAINT discipline_actions_pkey PRIMARY KEY (id);

--
-- Name: discipline_cases discipline_cases_pkey; Type: CONSTRAINT; Schema: competitions; Owner: -
--

ALTER TABLE ONLY competitions.discipline_cases
    ADD CONSTRAINT discipline_cases_pkey PRIMARY KEY (id);

--
-- Name: divisions divisions_pkey; Type: CONSTRAINT; Schema: competitions; Owner: -
--

ALTER TABLE ONLY competitions.divisions
    ADD CONSTRAINT divisions_pkey PRIMARY KEY (id);

--
-- Name: entries entries_pkey; Type: CONSTRAINT; Schema: competitions; Owner: -
--

ALTER TABLE ONLY competitions.entries
    ADD CONSTRAINT entries_pkey PRIMARY KEY (id);

--
-- Name: matches matches_pkey; Type: CONSTRAINT; Schema: competitions; Owner: -
--

ALTER TABLE ONLY competitions.matches
    ADD CONSTRAINT matches_pkey PRIMARY KEY (id);

--
-- Name: ranking_configs ranking_configs_pkey; Type: CONSTRAINT; Schema: competitions; Owner: -
--

ALTER TABLE ONLY competitions.ranking_configs
    ADD CONSTRAINT ranking_configs_pkey PRIMARY KEY (id);

--
-- Name: ranking_entries ranking_entries_pkey; Type: CONSTRAINT; Schema: competitions; Owner: -
--

ALTER TABLE ONLY competitions.ranking_entries
    ADD CONSTRAINT ranking_entries_pkey PRIMARY KEY (id);

--
-- Name: ranking_match_events ranking_match_events_pkey; Type: CONSTRAINT; Schema: competitions; Owner: -
--

ALTER TABLE ONLY competitions.ranking_match_events
    ADD CONSTRAINT ranking_match_events_pkey PRIMARY KEY (id);

--
-- Name: standings standings_pkey; Type: CONSTRAINT; Schema: competitions; Owner: -
--

ALTER TABLE ONLY competitions.standings
    ADD CONSTRAINT standings_pkey PRIMARY KEY (id);

--
-- Name: tournament_submissions tournament_submissions_pkey; Type: CONSTRAINT; Schema: competitions; Owner: -
--

ALTER TABLE ONLY competitions.tournament_submissions
    ADD CONSTRAINT tournament_submissions_pkey PRIMARY KEY (id);

--
-- Name: work_cards work_cards_pkey; Type: CONSTRAINT; Schema: competitions; Owner: -
--

ALTER TABLE ONLY competitions.work_cards
    ADD CONSTRAINT work_cards_pkey PRIMARY KEY (id);

--
-- Name: audit_logs_tenant_id_created_at_idx; Type: INDEX; Schema: competitions; Owner: -
--

CREATE INDEX audit_logs_tenant_id_created_at_idx ON competitions.audit_logs USING btree (tenant_id, created_at DESC);

--
-- Name: audit_logs_tenant_id_entity_type_entity_id_idx; Type: INDEX; Schema: competitions; Owner: -
--

CREATE INDEX audit_logs_tenant_id_entity_type_entity_id_idx ON competitions.audit_logs USING btree (tenant_id, entity_type, entity_id);

--
-- Name: competition_messages_competition_id_idx; Type: INDEX; Schema: competitions; Owner: -
--

CREATE INDEX competition_messages_competition_id_idx ON competitions.competition_messages USING btree (competition_id);

--
-- Name: competition_messages_tenant_id_idx; Type: INDEX; Schema: competitions; Owner: -
--

CREATE INDEX competition_messages_tenant_id_idx ON competitions.competition_messages USING btree (tenant_id);

--
-- Name: competitions_tenant_id_idx; Type: INDEX; Schema: competitions; Owner: -
--

CREATE INDEX competitions_tenant_id_idx ON competitions.competitions USING btree (tenant_id);

--
-- Name: competitions_tenant_id_sport_idx; Type: INDEX; Schema: competitions; Owner: -
--

CREATE INDEX competitions_tenant_id_sport_idx ON competitions.competitions USING btree (tenant_id, sport);

--
-- Name: competitions_tenant_id_status_idx; Type: INDEX; Schema: competitions; Owner: -
--

CREATE INDEX competitions_tenant_id_status_idx ON competitions.competitions USING btree (tenant_id, status);

--
-- Name: discipline_actions_case_id_idx; Type: INDEX; Schema: competitions; Owner: -
--

CREATE INDEX discipline_actions_case_id_idx ON competitions.discipline_actions USING btree (case_id);

--
-- Name: discipline_cases_competition_id_idx; Type: INDEX; Schema: competitions; Owner: -
--

CREATE INDEX discipline_cases_competition_id_idx ON competitions.discipline_cases USING btree (competition_id);

--
-- Name: discipline_cases_tenant_id_idx; Type: INDEX; Schema: competitions; Owner: -
--

CREATE INDEX discipline_cases_tenant_id_idx ON competitions.discipline_cases USING btree (tenant_id);

--
-- Name: discipline_cases_tenant_id_person_id_idx; Type: INDEX; Schema: competitions; Owner: -
--

CREATE INDEX discipline_cases_tenant_id_person_id_idx ON competitions.discipline_cases USING btree (tenant_id, person_id);

--
-- Name: divisions_competition_id_idx; Type: INDEX; Schema: competitions; Owner: -
--

CREATE INDEX divisions_competition_id_idx ON competitions.divisions USING btree (competition_id);

--
-- Name: entries_competition_id_idx; Type: INDEX; Schema: competitions; Owner: -
--

CREATE INDEX entries_competition_id_idx ON competitions.entries USING btree (competition_id);

--
-- Name: entries_division_id_idx; Type: INDEX; Schema: competitions; Owner: -
--

CREATE INDEX entries_division_id_idx ON competitions.entries USING btree (division_id);

--
-- Name: entries_person_id_idx; Type: INDEX; Schema: competitions; Owner: -
--

CREATE INDEX entries_person_id_idx ON competitions.entries USING btree (person_id);

--
-- Name: entries_team_id_idx; Type: INDEX; Schema: competitions; Owner: -
--

CREATE INDEX entries_team_id_idx ON competitions.entries USING btree (team_id);

--
-- Name: matches_away_entry_id_idx; Type: INDEX; Schema: competitions; Owner: -
--

CREATE INDEX matches_away_entry_id_idx ON competitions.matches USING btree (away_entry_id);

--
-- Name: matches_competition_id_idx; Type: INDEX; Schema: competitions; Owner: -
--

CREATE INDEX matches_competition_id_idx ON competitions.matches USING btree (competition_id);

--
-- Name: matches_division_id_idx; Type: INDEX; Schema: competitions; Owner: -
--

CREATE INDEX matches_division_id_idx ON competitions.matches USING btree (division_id);

--
-- Name: matches_home_entry_id_idx; Type: INDEX; Schema: competitions; Owner: -
--

CREATE INDEX matches_home_entry_id_idx ON competitions.matches USING btree (home_entry_id);

--
-- Name: matches_status_idx; Type: INDEX; Schema: competitions; Owner: -
--

CREATE INDEX matches_status_idx ON competitions.matches USING btree (status);

--
-- Name: ranking_configs_tenant_id_sport_scope_idx; Type: INDEX; Schema: competitions; Owner: -
--

CREATE INDEX ranking_configs_tenant_id_sport_scope_idx ON competitions.ranking_configs USING btree (tenant_id, sport, scope);

--
-- Name: ranking_entries_config_id_person_id_key; Type: INDEX; Schema: competitions; Owner: -
--

CREATE UNIQUE INDEX ranking_entries_config_id_person_id_key ON competitions.ranking_entries USING btree (config_id, person_id);

--
-- Name: ranking_entries_config_id_rank_idx; Type: INDEX; Schema: competitions; Owner: -
--

CREATE INDEX ranking_entries_config_id_rank_idx ON competitions.ranking_entries USING btree (config_id, rank);

--
-- Name: ranking_entries_config_id_team_id_key; Type: INDEX; Schema: competitions; Owner: -
--

CREATE UNIQUE INDEX ranking_entries_config_id_team_id_key ON competitions.ranking_entries USING btree (config_id, team_id);

--
-- Name: ranking_entries_tenant_id_sport_idx; Type: INDEX; Schema: competitions; Owner: -
--

CREATE INDEX ranking_entries_tenant_id_sport_idx ON competitions.ranking_entries USING btree (tenant_id, sport);

--
-- Name: ranking_match_events_config_id_idx; Type: INDEX; Schema: competitions; Owner: -
--

CREATE INDEX ranking_match_events_config_id_idx ON competitions.ranking_match_events USING btree (config_id);

--
-- Name: ranking_match_events_entry_id_idx; Type: INDEX; Schema: competitions; Owner: -
--

CREATE INDEX ranking_match_events_entry_id_idx ON competitions.ranking_match_events USING btree (entry_id);

--
-- Name: ranking_match_events_match_id_idx; Type: INDEX; Schema: competitions; Owner: -
--

CREATE INDEX ranking_match_events_match_id_idx ON competitions.ranking_match_events USING btree (match_id);

--
-- Name: standings_competition_id_idx; Type: INDEX; Schema: competitions; Owner: -
--

CREATE INDEX standings_competition_id_idx ON competitions.standings USING btree (competition_id);

--
-- Name: standings_division_id_entry_id_key; Type: INDEX; Schema: competitions; Owner: -
--

CREATE UNIQUE INDEX standings_division_id_entry_id_key ON competitions.standings USING btree (division_id, entry_id);

--
-- Name: standings_division_id_idx; Type: INDEX; Schema: competitions; Owner: -
--

CREATE INDEX standings_division_id_idx ON competitions.standings USING btree (division_id);

--
-- Name: tournament_submissions_competition_id_idx; Type: INDEX; Schema: competitions; Owner: -
--

CREATE INDEX tournament_submissions_competition_id_idx ON competitions.tournament_submissions USING btree (competition_id);

--
-- Name: tournament_submissions_tenant_id_idx; Type: INDEX; Schema: competitions; Owner: -
--

CREATE INDEX tournament_submissions_tenant_id_idx ON competitions.tournament_submissions USING btree (tenant_id);

--
-- Name: work_cards_person_id_idx; Type: INDEX; Schema: competitions; Owner: -
--

CREATE INDEX work_cards_person_id_idx ON competitions.work_cards USING btree (person_id);

--
-- Name: work_cards_tenant_id_person_id_sport_key; Type: INDEX; Schema: competitions; Owner: -
--

CREATE UNIQUE INDEX work_cards_tenant_id_person_id_sport_key ON competitions.work_cards USING btree (tenant_id, person_id, sport);

--
-- Name: work_cards_tenant_id_sport_idx; Type: INDEX; Schema: competitions; Owner: -
--

CREATE INDEX work_cards_tenant_id_sport_idx ON competitions.work_cards USING btree (tenant_id, sport);

--
-- Name: competition_messages competition_messages_competition_id_fkey; Type: FK CONSTRAINT; Schema: competitions; Owner: -
--

ALTER TABLE ONLY competitions.competition_messages
    ADD CONSTRAINT competition_messages_competition_id_fkey FOREIGN KEY (competition_id) REFERENCES competitions.competitions(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: discipline_actions discipline_actions_case_id_fkey; Type: FK CONSTRAINT; Schema: competitions; Owner: -
--

ALTER TABLE ONLY competitions.discipline_actions
    ADD CONSTRAINT discipline_actions_case_id_fkey FOREIGN KEY (case_id) REFERENCES competitions.discipline_cases(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: discipline_cases discipline_cases_competition_id_fkey; Type: FK CONSTRAINT; Schema: competitions; Owner: -
--

ALTER TABLE ONLY competitions.discipline_cases
    ADD CONSTRAINT discipline_cases_competition_id_fkey FOREIGN KEY (competition_id) REFERENCES competitions.competitions(id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: divisions divisions_competition_id_fkey; Type: FK CONSTRAINT; Schema: competitions; Owner: -
--

ALTER TABLE ONLY competitions.divisions
    ADD CONSTRAINT divisions_competition_id_fkey FOREIGN KEY (competition_id) REFERENCES competitions.competitions(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: entries entries_competition_id_fkey; Type: FK CONSTRAINT; Schema: competitions; Owner: -
--

ALTER TABLE ONLY competitions.entries
    ADD CONSTRAINT entries_competition_id_fkey FOREIGN KEY (competition_id) REFERENCES competitions.competitions(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: entries entries_division_id_fkey; Type: FK CONSTRAINT; Schema: competitions; Owner: -
--

ALTER TABLE ONLY competitions.entries
    ADD CONSTRAINT entries_division_id_fkey FOREIGN KEY (division_id) REFERENCES competitions.divisions(id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: matches matches_away_entry_id_fkey; Type: FK CONSTRAINT; Schema: competitions; Owner: -
--

ALTER TABLE ONLY competitions.matches
    ADD CONSTRAINT matches_away_entry_id_fkey FOREIGN KEY (away_entry_id) REFERENCES competitions.entries(id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: matches matches_competition_id_fkey; Type: FK CONSTRAINT; Schema: competitions; Owner: -
--

ALTER TABLE ONLY competitions.matches
    ADD CONSTRAINT matches_competition_id_fkey FOREIGN KEY (competition_id) REFERENCES competitions.competitions(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: matches matches_division_id_fkey; Type: FK CONSTRAINT; Schema: competitions; Owner: -
--

ALTER TABLE ONLY competitions.matches
    ADD CONSTRAINT matches_division_id_fkey FOREIGN KEY (division_id) REFERENCES competitions.divisions(id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: matches matches_home_entry_id_fkey; Type: FK CONSTRAINT; Schema: competitions; Owner: -
--

ALTER TABLE ONLY competitions.matches
    ADD CONSTRAINT matches_home_entry_id_fkey FOREIGN KEY (home_entry_id) REFERENCES competitions.entries(id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: ranking_entries ranking_entries_config_id_fkey; Type: FK CONSTRAINT; Schema: competitions; Owner: -
--

ALTER TABLE ONLY competitions.ranking_entries
    ADD CONSTRAINT ranking_entries_config_id_fkey FOREIGN KEY (config_id) REFERENCES competitions.ranking_configs(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: ranking_match_events ranking_match_events_config_id_fkey; Type: FK CONSTRAINT; Schema: competitions; Owner: -
--

ALTER TABLE ONLY competitions.ranking_match_events
    ADD CONSTRAINT ranking_match_events_config_id_fkey FOREIGN KEY (config_id) REFERENCES competitions.ranking_configs(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: ranking_match_events ranking_match_events_entry_id_fkey; Type: FK CONSTRAINT; Schema: competitions; Owner: -
--

ALTER TABLE ONLY competitions.ranking_match_events
    ADD CONSTRAINT ranking_match_events_entry_id_fkey FOREIGN KEY (entry_id) REFERENCES competitions.ranking_entries(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: standings standings_division_id_fkey; Type: FK CONSTRAINT; Schema: competitions; Owner: -
--

ALTER TABLE ONLY competitions.standings
    ADD CONSTRAINT standings_division_id_fkey FOREIGN KEY (division_id) REFERENCES competitions.divisions(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: standings standings_entry_id_fkey; Type: FK CONSTRAINT; Schema: competitions; Owner: -
--

ALTER TABLE ONLY competitions.standings
    ADD CONSTRAINT standings_entry_id_fkey FOREIGN KEY (entry_id) REFERENCES competitions.entries(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: tournament_submissions tournament_submissions_competition_id_fkey; Type: FK CONSTRAINT; Schema: competitions; Owner: -
--

ALTER TABLE ONLY competitions.tournament_submissions
    ADD CONSTRAINT tournament_submissions_competition_id_fkey FOREIGN KEY (competition_id) REFERENCES competitions.competitions(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- PostgreSQL database dump complete
--

