-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "analytics";

-- CreateTable
CREATE TABLE "analytics"."anomaly_flags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "person_id" UUID,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "resolved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anomaly_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics"."forecast_slots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "forecast_date" DATE NOT NULL,
    "hour_slot" INTEGER NOT NULL,
    "predicted_occupancy" DOUBLE PRECISION NOT NULL,
    "historical_weeks" INTEGER NOT NULL DEFAULT 0,
    "is_dead_slot" BOOLEAN NOT NULL DEFAULT false,
    "computed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forecast_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics"."member_scores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "churn_risk" INTEGER NOT NULL DEFAULT 0,
    "churn_band" TEXT NOT NULL DEFAULT 'low',
    "churn_factors" JSONB NOT NULL DEFAULT '{}',
    "ltv_score" INTEGER NOT NULL DEFAULT 0,
    "ltv_factors" JSONB NOT NULL DEFAULT '{}',
    "default_risk" INTEGER NOT NULL DEFAULT 0,
    "default_band" TEXT NOT NULL DEFAULT 'low',
    "default_factors" JSONB NOT NULL DEFAULT '{}',
    "optimal_send_hour" INTEGER,
    "send_hour_confidence" DOUBLE PRECISION,
    "computed_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "anomaly_flags_tenant_person_idx" ON "analytics"."anomaly_flags"("tenant_id" ASC, "person_id" ASC);

-- CreateIndex
CREATE INDEX "anomaly_flags_tenant_resolved_idx" ON "analytics"."anomaly_flags"("tenant_id" ASC, "resolved_at" ASC);

-- CreateIndex
CREATE INDEX "anomaly_flags_tenant_rule_idx" ON "analytics"."anomaly_flags"("tenant_id" ASC, "rule_id" ASC);

-- CreateIndex
CREATE INDEX "forecast_slots_tenant_date_dead_idx" ON "analytics"."forecast_slots"("tenant_id" ASC, "forecast_date" ASC, "is_dead_slot" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "forecast_slots_tenant_id_unit_id_forecast_date_hour_slot_key" ON "analytics"."forecast_slots"("tenant_id" ASC, "unit_id" ASC, "forecast_date" ASC, "hour_slot" ASC);

-- CreateIndex
CREATE INDEX "member_scores_tenant_churn_idx" ON "analytics"."member_scores"("tenant_id" ASC, "churn_risk" ASC);

-- CreateIndex
CREATE INDEX "member_scores_tenant_default_idx" ON "analytics"."member_scores"("tenant_id" ASC, "default_risk" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "member_scores_tenant_person_key" ON "analytics"."member_scores"("tenant_id" ASC, "person_id" ASC);

