-- CreateTable: venue.add_ons
-- The other venue schema tables (venues, resources, bookable_units, unit_conflicts)
-- already exist in the database from the previous service version.

CREATE TABLE IF NOT EXISTS "venue"."add_ons" (
    "id"                           UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id"                    UUID NOT NULL,
    "venue_id"                     UUID,
    "name"                         TEXT NOT NULL,
    "code"                         TEXT NOT NULL,
    "description"                  TEXT,
    "category"                     TEXT NOT NULL,
    "status"                       TEXT NOT NULL DEFAULT 'active',
    "pricing_type"                 TEXT NOT NULL DEFAULT 'fixed',
    "price"                        DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency"                     CHAR(3) NOT NULL DEFAULT 'GBP',
    "inventory_mode"               TEXT NOT NULL DEFAULT 'unlimited',
    "total_inventory"              INTEGER,
    "requires_primary_booking"     BOOLEAN NOT NULL DEFAULT true,
    "is_time_bound"                BOOLEAN NOT NULL DEFAULT true,
    "default_start_offset_minutes" INTEGER NOT NULL DEFAULT 0,
    "default_end_offset_minutes"   INTEGER NOT NULL DEFAULT 0,
    "allowed_resource_types"       TEXT[] NOT NULL DEFAULT '{}',
    "created_at"                   TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at"                   TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "add_ons_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "add_ons_tenant_code_unique" UNIQUE ("tenant_id", "code")
);

CREATE INDEX IF NOT EXISTS "add_ons_tenant_id_idx"         ON "venue"."add_ons" ("tenant_id");
CREATE INDEX IF NOT EXISTS "add_ons_tenant_venue_idx"      ON "venue"."add_ons" ("tenant_id", "venue_id");
CREATE INDEX IF NOT EXISTS "add_ons_tenant_status_idx"     ON "venue"."add_ons" ("tenant_id", "status");
