-- Migration: 0006_households
-- Household grouping and parent/child person relationships

CREATE TABLE IF NOT EXISTS customer.households (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID        NOT NULL,
  name       TEXT        NOT NULL,   -- e.g. "The Williams Family"
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_households_tenant ON customer.households (tenant_id);

-- Links a person to a household with a role within that household
CREATE TABLE IF NOT EXISTS customer.household_members (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID        NOT NULL,
  household_id UUID        NOT NULL REFERENCES customer.households(id) ON DELETE CASCADE,
  customer_id  UUID        NOT NULL REFERENCES customer.customers(id) ON DELETE CASCADE,
  role         TEXT        NOT NULL DEFAULT 'member',  -- 'primary' | 'member' | 'child'
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (household_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_household_members_household ON customer.household_members (household_id);
CREATE INDEX IF NOT EXISTS idx_household_members_customer  ON customer.household_members (customer_id);
CREATE INDEX IF NOT EXISTS idx_household_members_tenant    ON customer.household_members (tenant_id);

-- Direct person-to-person relationships (parent/guardian ↔ child, etc.)
CREATE TABLE IF NOT EXISTS customer.person_relationships (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL,
  from_customer_id UUID       NOT NULL REFERENCES customer.customers(id) ON DELETE CASCADE,
  to_customer_id  UUID        NOT NULL REFERENCES customer.customers(id) ON DELETE CASCADE,
  relationship    TEXT        NOT NULL,  -- 'parent' | 'guardian' | 'child' | 'sibling' | 'spouse' | 'other'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (from_customer_id, to_customer_id, relationship)
);

CREATE INDEX IF NOT EXISTS idx_person_relationships_from ON customer.person_relationships (from_customer_id);
CREATE INDEX IF NOT EXISTS idx_person_relationships_to   ON customer.person_relationships (to_customer_id);
CREATE INDEX IF NOT EXISTS idx_person_relationships_tenant ON customer.person_relationships (tenant_id);
