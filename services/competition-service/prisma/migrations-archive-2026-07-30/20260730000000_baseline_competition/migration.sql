-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "competitions";

-- CreateEnum
CREATE TYPE "competitions"."CompetitionFormat" AS ENUM ('LEAGUE', 'KNOCKOUT', 'ROUND_ROBIN', 'GROUP_KNOCKOUT', 'SWISS', 'LADDER');

-- CreateEnum
CREATE TYPE "competitions"."CompetitionStatus" AS ENUM ('DRAFT', 'REGISTRATION_OPEN', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED', 'AWAITING_APPROVAL');

-- CreateEnum
CREATE TYPE "competitions"."DisciplineCaseStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'APPEALED', 'CLOSED');

-- CreateEnum
CREATE TYPE "competitions"."DisciplineOutcome" AS ENUM ('WARNING', 'FINE', 'MATCH_BAN', 'COMPETITION_BAN', 'SUSPENSION', 'DISQUALIFICATION', 'NO_ACTION');

-- CreateEnum
CREATE TYPE "competitions"."EntryStatus" AS ENUM ('PENDING', 'CONFIRMED', 'WITHDRAWN', 'DISQUALIFIED');

-- CreateEnum
CREATE TYPE "competitions"."EntryType" AS ENUM ('INDIVIDUAL', 'TEAM', 'DOUBLES', 'MIXED_DOUBLES');

-- CreateEnum
CREATE TYPE "competitions"."MatchStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'WALKOVER', 'BYE', 'POSTPONED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "competitions"."MessageAudience" AS ENUM ('ALL_ENTRANTS', 'CONFIRMED_ENTRANTS', 'PENDING_ENTRANTS', 'DIVISION', 'SPECIFIC');

-- CreateEnum
CREATE TYPE "competitions"."RankingAlgorithm" AS ENUM ('POINTS_TABLE', 'ELO');

-- CreateEnum
CREATE TYPE "competitions"."RankingScope" AS ENUM ('COMPETITION', 'SEASON', 'ALL_TIME');

-- CreateEnum
CREATE TYPE "competitions"."ResultStatus" AS ENUM ('SUBMITTED', 'VERIFIED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "competitions"."SubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ACKNOWLEDGED', 'REJECTED');

-- CreateTable
CREATE TABLE "competitions"."audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor_id" UUID,
    "actor_type" TEXT NOT NULL DEFAULT 'admin',
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitions"."competition_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "competition_id" UUID NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audience" "competitions"."MessageAudience" NOT NULL DEFAULT 'ALL_ENTRANTS',
    "division_id" UUID,
    "sent_by" UUID,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recipient_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "competition_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitions"."competitions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "organisation_id" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sport" TEXT NOT NULL,
    "season" TEXT,
    "format" "competitions"."CompetitionFormat" NOT NULL,
    "entry_type" "competitions"."EntryType" NOT NULL DEFAULT 'INDIVIDUAL',
    "status" "competitions"."CompetitionStatus" NOT NULL DEFAULT 'DRAFT',
    "registration_opens_at" TIMESTAMP(3),
    "registration_closes_at" TIMESTAMP(3),
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "max_entries" INTEGER,
    "entry_fee" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "eligibility_rules" JSONB,
    "tiebreak_rules" JSONB,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),
    "approved_by" UUID,
    "late_entry_closes_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "rejected_by" UUID,
    "rejection_reason" TEXT,

    CONSTRAINT "competitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitions"."discipline_actions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "case_id" UUID NOT NULL,
    "outcome" "competitions"."DisciplineOutcome" NOT NULL,
    "ban_matches" INTEGER,
    "suspended_until" TIMESTAMP(3),
    "fine_amount" DECIMAL(10,2),
    "notes" TEXT,
    "issued_by" UUID,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discipline_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitions"."discipline_cases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "competition_id" UUID,
    "match_id" UUID,
    "person_id" UUID,
    "team_id" UUID,
    "display_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "competitions"."DisciplineCaseStatus" NOT NULL DEFAULT 'OPEN',
    "created_by" UUID,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discipline_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitions"."divisions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "competition_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "format" "competitions"."CompetitionFormat",
    "max_entries" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "divisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitions"."entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "competition_id" UUID NOT NULL,
    "division_id" UUID,
    "person_id" UUID,
    "team_id" UUID,
    "display_name" TEXT NOT NULL,
    "seed" INTEGER,
    "status" "competitions"."EntryStatus" NOT NULL DEFAULT 'PENDING',
    "payment_status" TEXT NOT NULL DEFAULT 'unpaid',
    "notes" TEXT,
    "withdrawn_at" TIMESTAMP(3),
    "withdrawn_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_late_entry" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitions"."matches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "competition_id" UUID NOT NULL,
    "division_id" UUID,
    "round" INTEGER NOT NULL DEFAULT 1,
    "match_number" INTEGER NOT NULL DEFAULT 1,
    "home_entry_id" UUID,
    "away_entry_id" UUID,
    "scheduled_at" TIMESTAMP(3),
    "venue_id" UUID,
    "resource_id" UUID,
    "bookable_unit_id" UUID,
    "booking_id" UUID,
    "status" "competitions"."MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "winner_id" UUID,
    "score" JSONB,
    "home_points" DECIMAL(6,2),
    "away_points" DECIMAL(6,2),
    "submitted_by" UUID,
    "submitted_at" TIMESTAMP(3),
    "verified_by" UUID,
    "verified_at" TIMESTAMP(3),
    "result_status" "competitions"."ResultStatus",
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitions"."ranking_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "sport" TEXT NOT NULL,
    "scope" "competitions"."RankingScope" NOT NULL,
    "algorithm" "competitions"."RankingAlgorithm" NOT NULL,
    "season" TEXT,
    "points_per_win" INTEGER NOT NULL DEFAULT 3,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ranking_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitions"."ranking_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "config_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "person_id" UUID,
    "team_id" UUID,
    "display_name" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "elo_rating" INTEGER NOT NULL DEFAULT 1000,
    "elo_provisional" BOOLEAN NOT NULL DEFAULT true,
    "matches_played" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "goals_for" INTEGER NOT NULL DEFAULT 0,
    "goals_against" INTEGER NOT NULL DEFAULT 0,
    "goal_difference" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "previous_rank" INTEGER,
    "rank_change" INTEGER,
    "last_match_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ranking_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitions"."ranking_match_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "config_id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "entry_id" UUID NOT NULL,
    "opponent_entry_id" UUID,
    "rating_before" INTEGER,
    "rating_after" INTEGER,
    "rating_change" INTEGER,
    "points_awarded" INTEGER,
    "outcome" TEXT NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ranking_match_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitions"."standings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "competition_id" UUID NOT NULL,
    "division_id" UUID NOT NULL,
    "entry_id" UUID NOT NULL,
    "played" INTEGER NOT NULL DEFAULT 0,
    "won" INTEGER NOT NULL DEFAULT 0,
    "drawn" INTEGER NOT NULL DEFAULT 0,
    "lost" INTEGER NOT NULL DEFAULT 0,
    "points_for" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "points_against" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "points_difference" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "points" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL DEFAULT 0,
    "previous_position" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "standings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitions"."tournament_submissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "competition_id" UUID NOT NULL,
    "submitted_by" UUID,
    "submitted_at" TIMESTAMP(3),
    "status" "competitions"."SubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "governing_body" TEXT,
    "external_ref" TEXT,
    "submission_data" JSONB,
    "response_data" JSONB,
    "acknowledged_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitions"."work_cards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "sport" TEXT NOT NULL DEFAULT 'tennis',
    "grade" TEXT,
    "category" TEXT,
    "playing_level" TEXT,
    "ntrp" DECIMAL(3,1),
    "utr" DECIMAL(5,2),
    "lta_rating" DECIMAL(5,2),
    "eligible_from" TIMESTAMP(3),
    "eligible_to" TIMESTAMP(3),
    "external_ref" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_cards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_created_at_idx" ON "competitions"."audit_logs"("tenant_id" ASC, "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_entity_type_entity_id_idx" ON "competitions"."audit_logs"("tenant_id" ASC, "entity_type" ASC, "entity_id" ASC);

-- CreateIndex
CREATE INDEX "competition_messages_competition_id_idx" ON "competitions"."competition_messages"("competition_id" ASC);

-- CreateIndex
CREATE INDEX "competition_messages_tenant_id_idx" ON "competitions"."competition_messages"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "competitions_tenant_id_idx" ON "competitions"."competitions"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "competitions_tenant_id_sport_idx" ON "competitions"."competitions"("tenant_id" ASC, "sport" ASC);

-- CreateIndex
CREATE INDEX "competitions_tenant_id_status_idx" ON "competitions"."competitions"("tenant_id" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "discipline_actions_case_id_idx" ON "competitions"."discipline_actions"("case_id" ASC);

-- CreateIndex
CREATE INDEX "discipline_cases_competition_id_idx" ON "competitions"."discipline_cases"("competition_id" ASC);

-- CreateIndex
CREATE INDEX "discipline_cases_tenant_id_idx" ON "competitions"."discipline_cases"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "discipline_cases_tenant_id_person_id_idx" ON "competitions"."discipline_cases"("tenant_id" ASC, "person_id" ASC);

-- CreateIndex
CREATE INDEX "divisions_competition_id_idx" ON "competitions"."divisions"("competition_id" ASC);

-- CreateIndex
CREATE INDEX "entries_competition_id_idx" ON "competitions"."entries"("competition_id" ASC);

-- CreateIndex
CREATE INDEX "entries_division_id_idx" ON "competitions"."entries"("division_id" ASC);

-- CreateIndex
CREATE INDEX "entries_person_id_idx" ON "competitions"."entries"("person_id" ASC);

-- CreateIndex
CREATE INDEX "entries_team_id_idx" ON "competitions"."entries"("team_id" ASC);

-- CreateIndex
CREATE INDEX "matches_away_entry_id_idx" ON "competitions"."matches"("away_entry_id" ASC);

-- CreateIndex
CREATE INDEX "matches_competition_id_idx" ON "competitions"."matches"("competition_id" ASC);

-- CreateIndex
CREATE INDEX "matches_division_id_idx" ON "competitions"."matches"("division_id" ASC);

-- CreateIndex
CREATE INDEX "matches_home_entry_id_idx" ON "competitions"."matches"("home_entry_id" ASC);

-- CreateIndex
CREATE INDEX "matches_status_idx" ON "competitions"."matches"("status" ASC);

-- CreateIndex
CREATE INDEX "ranking_configs_tenant_id_sport_scope_idx" ON "competitions"."ranking_configs"("tenant_id" ASC, "sport" ASC, "scope" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ranking_entries_config_id_person_id_key" ON "competitions"."ranking_entries"("config_id" ASC, "person_id" ASC);

-- CreateIndex
CREATE INDEX "ranking_entries_config_id_rank_idx" ON "competitions"."ranking_entries"("config_id" ASC, "rank" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ranking_entries_config_id_team_id_key" ON "competitions"."ranking_entries"("config_id" ASC, "team_id" ASC);

-- CreateIndex
CREATE INDEX "ranking_entries_tenant_id_sport_idx" ON "competitions"."ranking_entries"("tenant_id" ASC, "sport" ASC);

-- CreateIndex
CREATE INDEX "ranking_match_events_config_id_idx" ON "competitions"."ranking_match_events"("config_id" ASC);

-- CreateIndex
CREATE INDEX "ranking_match_events_entry_id_idx" ON "competitions"."ranking_match_events"("entry_id" ASC);

-- CreateIndex
CREATE INDEX "ranking_match_events_match_id_idx" ON "competitions"."ranking_match_events"("match_id" ASC);

-- CreateIndex
CREATE INDEX "standings_competition_id_idx" ON "competitions"."standings"("competition_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "standings_division_id_entry_id_key" ON "competitions"."standings"("division_id" ASC, "entry_id" ASC);

-- CreateIndex
CREATE INDEX "standings_division_id_idx" ON "competitions"."standings"("division_id" ASC);

-- CreateIndex
CREATE INDEX "tournament_submissions_competition_id_idx" ON "competitions"."tournament_submissions"("competition_id" ASC);

-- CreateIndex
CREATE INDEX "tournament_submissions_tenant_id_idx" ON "competitions"."tournament_submissions"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "work_cards_person_id_idx" ON "competitions"."work_cards"("person_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "work_cards_tenant_id_person_id_sport_key" ON "competitions"."work_cards"("tenant_id" ASC, "person_id" ASC, "sport" ASC);

-- CreateIndex
CREATE INDEX "work_cards_tenant_id_sport_idx" ON "competitions"."work_cards"("tenant_id" ASC, "sport" ASC);

-- AddForeignKey
ALTER TABLE "competitions"."competition_messages" ADD CONSTRAINT "competition_messages_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"."competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitions"."discipline_actions" ADD CONSTRAINT "discipline_actions_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "competitions"."discipline_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitions"."discipline_cases" ADD CONSTRAINT "discipline_cases_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"."competitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitions"."divisions" ADD CONSTRAINT "divisions_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"."competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitions"."entries" ADD CONSTRAINT "entries_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"."competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitions"."entries" ADD CONSTRAINT "entries_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "competitions"."divisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitions"."matches" ADD CONSTRAINT "matches_away_entry_id_fkey" FOREIGN KEY ("away_entry_id") REFERENCES "competitions"."entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitions"."matches" ADD CONSTRAINT "matches_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"."competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitions"."matches" ADD CONSTRAINT "matches_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "competitions"."divisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitions"."matches" ADD CONSTRAINT "matches_home_entry_id_fkey" FOREIGN KEY ("home_entry_id") REFERENCES "competitions"."entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitions"."ranking_entries" ADD CONSTRAINT "ranking_entries_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "competitions"."ranking_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitions"."ranking_match_events" ADD CONSTRAINT "ranking_match_events_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "competitions"."ranking_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitions"."ranking_match_events" ADD CONSTRAINT "ranking_match_events_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "competitions"."ranking_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitions"."standings" ADD CONSTRAINT "standings_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "competitions"."divisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitions"."standings" ADD CONSTRAINT "standings_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "competitions"."entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitions"."tournament_submissions" ADD CONSTRAINT "tournament_submissions_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"."competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

