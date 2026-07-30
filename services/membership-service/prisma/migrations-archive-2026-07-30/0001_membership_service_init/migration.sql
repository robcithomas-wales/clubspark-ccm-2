CREATE SCHEMA IF NOT EXISTS membership;

CREATE TABLE IF NOT EXISTS membership.membership_schemes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL,
  organisation_id UUID NOT NULL,
  name           TEXT NOT NULL,
  description    TEXT,
  status         TEXT NOT NULL DEFAULT 'active',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS membership.membership_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  organisation_id UUID NOT NULL,
  scheme_id       UUID NOT NULL REFERENCES membership.membership_schemes(id),
  name            TEXT NOT NULL,
  code            TEXT,
  description     TEXT,
  ownership_type  TEXT,
  duration_type   TEXT,
  visibility      TEXT,
  status          TEXT NOT NULL DEFAULT 'active',
  sort_order      INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS membership.memberships (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  organisation_id UUID NOT NULL,
  plan_id         UUID NOT NULL REFERENCES membership.membership_plans(id),
  customer_id     UUID,
  owner_type      TEXT,
  owner_id        UUID,
  status          TEXT NOT NULL DEFAULT 'active',
  start_date      DATE NOT NULL,
  end_date        DATE,
  renewal_date    DATE,
  auto_renew      BOOLEAN NOT NULL DEFAULT false,
  payment_status  TEXT,
  reference       TEXT,
  source          TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS membership.entitlement_policies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  organisation_id UUID NOT NULL,
  name            TEXT NOT NULL,
  policy_type     TEXT,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS membership.membership_plan_entitlements (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL,
  plan_id                 UUID NOT NULL REFERENCES membership.membership_plans(id),
  entitlement_policy_id   UUID NOT NULL REFERENCES membership.entitlement_policies(id),
  scope_type              TEXT,
  scope_id                UUID,
  configuration           JSONB NOT NULL DEFAULT '{}',
  priority                INTEGER NOT NULL DEFAULT 100,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
