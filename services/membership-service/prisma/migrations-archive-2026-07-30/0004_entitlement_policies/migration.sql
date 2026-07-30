-- Entitlement policies: reusable policy definitions attached to plans
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

CREATE INDEX IF NOT EXISTS idx_entitlement_policies_tenant
  ON membership.entitlement_policies (tenant_id, organisation_id);

-- Drop any pre-existing constraints that were too restrictive on legacy tables
ALTER TABLE membership.entitlement_policies
  DROP CONSTRAINT IF EXISTS entitlement_policies_policy_type_check;
ALTER TABLE membership.entitlement_policies
  ALTER COLUMN policy_type DROP NOT NULL;

ALTER TABLE membership.membership_plans
  DROP CONSTRAINT IF EXISTS membership_plans_duration_type_check;

ALTER TABLE membership.membership_plan_entitlements
  ALTER COLUMN scope_type DROP NOT NULL;

-- Plan entitlements: join table linking plans to policies
CREATE TABLE IF NOT EXISTS membership.membership_plan_entitlements (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL,
  plan_id               UUID NOT NULL REFERENCES membership.membership_plans(id) ON DELETE CASCADE,
  entitlement_policy_id UUID NOT NULL REFERENCES membership.entitlement_policies(id) ON DELETE CASCADE,
  scope_type            TEXT,
  scope_id              UUID,
  configuration         JSONB NOT NULL DEFAULT '{}',
  priority              INT NOT NULL DEFAULT 100,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_entitlements_plan
  ON membership.membership_plan_entitlements (tenant_id, plan_id);
