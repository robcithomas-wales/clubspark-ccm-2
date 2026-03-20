-- Migration: 0005_person_roles
-- Person roles: multi-role assignment per person (coach, parent, committee member, etc.)

CREATE TABLE IF NOT EXISTS customer.person_roles (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        NOT NULL,
  customer_id   UUID        NOT NULL REFERENCES customer.customers(id) ON DELETE CASCADE,
  role          TEXT        NOT NULL,   -- 'coach' | 'committee_member' | 'team_captain' | 'parent' | 'volunteer' | 'team_manager' | 'junior' | 'other'
  context_type  TEXT,                   -- optional: 'team' | 'organisation' | 'activity'
  context_id    UUID,                   -- FK to the context entity (e.g. team ID)
  context_label TEXT,                   -- denormalised label for display without joins
  status        TEXT        NOT NULL DEFAULT 'active',  -- 'active' | 'inactive' | 'expired'
  starts_at     DATE,
  ends_at       DATE,
  notes         TEXT,
  assigned_by   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_person_roles_tenant     ON customer.person_roles (tenant_id);
CREATE INDEX IF NOT EXISTS idx_person_roles_customer   ON customer.person_roles (customer_id);
CREATE INDEX IF NOT EXISTS idx_person_roles_tenant_role ON customer.person_roles (tenant_id, role);
