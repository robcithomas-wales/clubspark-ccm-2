-- Migration 0003: Resource Groups, Resource Attributes, and Availability Configs

-- ─── Resource Groups ──────────────────────────────────────────────────────────

CREATE TABLE "venue"."resource_groups" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID        NOT NULL,
  "venue_id"    UUID        NOT NULL,
  "name"        TEXT        NOT NULL,
  "sport"       TEXT,
  "description" TEXT,
  "colour"      TEXT,
  "sort_order"  INTEGER     NOT NULL DEFAULT 0,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "resource_groups_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "resource_groups_venue_fk"
    FOREIGN KEY ("venue_id") REFERENCES "venue"."venues"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "resource_groups_tenant_id_idx" ON "venue"."resource_groups"("tenant_id");
CREATE INDEX "resource_groups_venue_id_idx"   ON "venue"."resource_groups"("venue_id");

-- ─── Resource Attributes (description already exists in DB) ───────────────────

ALTER TABLE "venue"."resources"
  ADD COLUMN IF NOT EXISTS "group_id"          UUID,
  ADD COLUMN IF NOT EXISTS "surface"           TEXT,
  ADD COLUMN IF NOT EXISTS "is_indoor"         BOOLEAN,
  ADD COLUMN IF NOT EXISTS "has_lighting"      BOOLEAN,
  ADD COLUMN IF NOT EXISTS "booking_purposes"  TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "colour"            TEXT,
  ADD COLUMN IF NOT EXISTS "public_attributes" JSONB   NOT NULL DEFAULT '{}';

ALTER TABLE "venue"."resources"
  ADD CONSTRAINT "resources_group_fk"
    FOREIGN KEY ("group_id") REFERENCES "venue"."resource_groups"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "resources_group_id_idx" ON "venue"."resources"("group_id");

-- ─── Availability Configs ─────────────────────────────────────────────────────

CREATE TABLE "venue"."availability_configs" (
  "id"                       UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"                UUID        NOT NULL,
  "scope_type"               TEXT        NOT NULL,
  "scope_id"                 UUID        NOT NULL,
  "day_of_week"              INTEGER,
  "opens_at"                 TEXT,
  "closes_at"                TEXT,
  "slot_duration_minutes"    INTEGER,
  "booking_interval_minutes" INTEGER,
  "new_day_release_time"     TEXT,
  "is_active"                BOOLEAN     NOT NULL DEFAULT true,
  "created_at"               TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"               TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "availability_configs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "availability_configs_scope_type_check"
    CHECK (scope_type IN ('venue', 'resource_group', 'resource'))
);

CREATE INDEX "availability_configs_tenant_id_idx"
  ON "venue"."availability_configs"("tenant_id");
CREATE INDEX "availability_configs_scope_idx"
  ON "venue"."availability_configs"("tenant_id", "scope_type", "scope_id");
