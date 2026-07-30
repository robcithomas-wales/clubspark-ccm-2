-- Three-tier SaaS model foundation
-- 1. tenantType on organisations  — drives which UI, defaults, and features apply
-- 2. organisation_id on venues    — placeholder FK for multi-org-per-tenant (Tier 1)
-- 3. affiliations table           — placeholder for NGB/enterprise governance relationships

-- ─── 1. tenantType ────────────────────────────────────────────────────────────

CREATE TYPE venue."TenantType" AS ENUM ('enterprise', 'operator', 'club');

ALTER TABLE venue.organisations
  ADD COLUMN IF NOT EXISTS tenant_type venue."TenantType" NOT NULL DEFAULT 'club';

-- ─── 2. organisation_id on venues ─────────────────────────────────────────────
-- Nullable: Tier 3 clubs leave this null (org inferred from tenantId).
-- Tier 1/2 operators set this to link a venue to a specific organisation.

ALTER TABLE venue.venues
  ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES venue.organisations(id);

CREATE INDEX IF NOT EXISTS venues_organisation_id_idx
  ON venue.venues (organisation_id);

-- ─── 3. affiliations ──────────────────────────────────────────────────────────
-- Placeholder table. Status and profile columns will be extended when the
-- governance layer is built against a real NGB partner requirement.

CREATE TYPE venue."AffiliationStatus" AS ENUM ('pending', 'active', 'suspended', 'ended');

CREATE TABLE IF NOT EXISTS venue.affiliations (
  id                  UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id           UUID        NOT NULL,
  organisation_id     UUID        NOT NULL REFERENCES venue.organisations(id),
  governing_tenant_id UUID        NOT NULL,
  status              venue."AffiliationStatus" NOT NULL DEFAULT 'pending',
  policy_pack_id      UUID,
  effective_from      DATE,
  effective_to        DATE,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS affiliations_tenant_id_idx
  ON venue.affiliations (tenant_id);

CREATE INDEX IF NOT EXISTS affiliations_governing_tenant_id_idx
  ON venue.affiliations (governing_tenant_id);

CREATE INDEX IF NOT EXISTS affiliations_organisation_id_idx
  ON venue.affiliations (organisation_id);
