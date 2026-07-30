-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "team";

-- CreateEnum
CREATE TYPE "team"."ChargeRunStatus" AS ENUM ('draft', 'sent', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "team"."ChargeStatus" AS ENUM ('pending', 'paid', 'waived');

-- CreateEnum
CREATE TYPE "team"."FixtureStatus" AS ENUM ('draft', 'scheduled', 'squad_selected', 'fees_requested', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "team"."HomeAway" AS ENUM ('home', 'away', 'neutral');

-- CreateEnum
CREATE TYPE "team"."MemberRole" AS ENUM ('player', 'coach', 'manager');

-- CreateEnum
CREATE TYPE "team"."PlayerAvailability" AS ENUM ('available', 'maybe', 'unavailable', 'no_response');

-- CreateEnum
CREATE TYPE "team"."SelectionRole" AS ENUM ('starter', 'substitute', 'reserve');

-- CreateEnum
CREATE TYPE "team"."Sport" AS ENUM ('football', 'cricket', 'other');

-- CreateTable
CREATE TABLE "team"."availability_responses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "fixture_id" UUID NOT NULL,
    "team_member_id" UUID NOT NULL,
    "response" "team"."PlayerAvailability" NOT NULL DEFAULT 'no_response',
    "responded_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "availability_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team"."charge_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "fixture_id" UUID NOT NULL,
    "initiated_by" UUID,
    "status" "team"."ChargeRunStatus" NOT NULL DEFAULT 'draft',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "order_id" UUID,

    CONSTRAINT "charge_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team"."charges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "charge_run_id" UUID NOT NULL,
    "team_member_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "team"."ChargeStatus" NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payment_id" TEXT,

    CONSTRAINT "charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team"."fixtures" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "opponent" TEXT NOT NULL,
    "home_away" "team"."HomeAway" NOT NULL DEFAULT 'home',
    "venue" TEXT,
    "kickoff_at" TIMESTAMPTZ(6) NOT NULL,
    "meet_time" TIMESTAMPTZ(6),
    "duration_minutes" INTEGER,
    "match_type" TEXT,
    "status" "team"."FixtureStatus" NOT NULL DEFAULT 'draft',
    "notes" TEXT,
    "external_ref" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "away_score" INTEGER,
    "home_score" INTEGER,

    CONSTRAINT "fixtures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team"."selections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "fixture_id" UUID NOT NULL,
    "team_member_id" UUID NOT NULL,
    "role" "team"."SelectionRole" NOT NULL DEFAULT 'starter',
    "position" TEXT,
    "shirt_number" INTEGER,
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "selections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team"."team_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "person_id" UUID,
    "display_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "position" TEXT,
    "shirt_number" INTEGER,
    "is_guest" BOOLEAN NOT NULL DEFAULT false,
    "is_junior" BOOLEAN NOT NULL DEFAULT false,
    "date_of_birth" DATE,
    "guardian_name" TEXT,
    "guardian_email" TEXT,
    "guardian_phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "photo_url" TEXT,
    "role" "team"."MemberRole" NOT NULL DEFAULT 'player',

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team"."teams" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sport" "team"."Sport" NOT NULL DEFAULT 'football',
    "season" TEXT,
    "age_group" TEXT,
    "gender" TEXT,
    "default_match_fee" DECIMAL(10,2),
    "junior_match_fee" DECIMAL(10,2),
    "substitute_match_fee" DECIMAL(10,2),
    "charge_rule" TEXT NOT NULL DEFAULT 'selected',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fixtures_url" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "availability_responses_fixture_id_idx" ON "team"."availability_responses"("fixture_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "availability_responses_fixture_id_team_member_id_key" ON "team"."availability_responses"("fixture_id" ASC, "team_member_id" ASC);

-- CreateIndex
CREATE INDEX "availability_responses_team_member_id_idx" ON "team"."availability_responses"("team_member_id" ASC);

-- CreateIndex
CREATE INDEX "charge_runs_fixture_id_idx" ON "team"."charge_runs"("fixture_id" ASC);

-- CreateIndex
CREATE INDEX "charge_runs_tenant_id_idx" ON "team"."charge_runs"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "charges_charge_run_id_idx" ON "team"."charges"("charge_run_id" ASC);

-- CreateIndex
CREATE INDEX "charges_status_idx" ON "team"."charges"("status" ASC);

-- CreateIndex
CREATE INDEX "charges_team_member_id_idx" ON "team"."charges"("team_member_id" ASC);

-- CreateIndex
CREATE INDEX "fixtures_team_id_idx" ON "team"."fixtures"("team_id" ASC);

-- CreateIndex
CREATE INDEX "fixtures_team_id_kickoff_at_idx" ON "team"."fixtures"("team_id" ASC, "kickoff_at" ASC);

-- CreateIndex
CREATE INDEX "fixtures_team_id_status_idx" ON "team"."fixtures"("team_id" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "fixtures_tenant_id_idx" ON "team"."fixtures"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "selections_fixture_id_idx" ON "team"."selections"("fixture_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "selections_fixture_id_team_member_id_key" ON "team"."selections"("fixture_id" ASC, "team_member_id" ASC);

-- CreateIndex
CREATE INDEX "selections_team_member_id_idx" ON "team"."selections"("team_member_id" ASC);

-- CreateIndex
CREATE INDEX "team_members_person_id_idx" ON "team"."team_members"("person_id" ASC);

-- CreateIndex
CREATE INDEX "team_members_team_id_idx" ON "team"."team_members"("team_id" ASC);

-- CreateIndex
CREATE INDEX "team_members_team_id_is_active_idx" ON "team"."team_members"("team_id" ASC, "is_active" ASC);

-- CreateIndex
CREATE INDEX "team_members_tenant_id_idx" ON "team"."team_members"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "teams_tenant_id_idx" ON "team"."teams"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "teams_tenant_id_is_active_idx" ON "team"."teams"("tenant_id" ASC, "is_active" ASC);

-- CreateIndex
CREATE INDEX "teams_tenant_id_sport_idx" ON "team"."teams"("tenant_id" ASC, "sport" ASC);

-- AddForeignKey
ALTER TABLE "team"."availability_responses" ADD CONSTRAINT "availability_responses_fixture_id_fkey" FOREIGN KEY ("fixture_id") REFERENCES "team"."fixtures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team"."availability_responses" ADD CONSTRAINT "availability_responses_team_member_id_fkey" FOREIGN KEY ("team_member_id") REFERENCES "team"."team_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team"."charge_runs" ADD CONSTRAINT "charge_runs_fixture_id_fkey" FOREIGN KEY ("fixture_id") REFERENCES "team"."fixtures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team"."charges" ADD CONSTRAINT "charges_charge_run_id_fkey" FOREIGN KEY ("charge_run_id") REFERENCES "team"."charge_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team"."charges" ADD CONSTRAINT "charges_team_member_id_fkey" FOREIGN KEY ("team_member_id") REFERENCES "team"."team_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team"."fixtures" ADD CONSTRAINT "fixtures_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"."teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team"."selections" ADD CONSTRAINT "selections_fixture_id_fkey" FOREIGN KEY ("fixture_id") REFERENCES "team"."fixtures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team"."selections" ADD CONSTRAINT "selections_team_member_id_fkey" FOREIGN KEY ("team_member_id") REFERENCES "team"."team_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team"."team_members" ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"."teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

