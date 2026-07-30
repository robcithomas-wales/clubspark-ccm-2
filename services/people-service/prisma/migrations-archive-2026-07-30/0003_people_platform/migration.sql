-- People Platform: extend customers with lifecycle, engagement, tags
-- All new columns are nullable/have defaults — fully backward-compatible.

-- ─── 1. Extend customers table ────────────────────────────────────────────────

ALTER TABLE customer.customers
  ADD COLUMN IF NOT EXISTS lifecycle_state      TEXT        NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS lifecycle_changed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source               TEXT        DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS date_of_birth        DATE,
  ADD COLUMN IF NOT EXISTS avatar_url           TEXT,
  ADD COLUMN IF NOT EXISTS comms_preferences    JSONB       NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS engagement_score     SMALLINT,
  ADD COLUMN IF NOT EXISTS engagement_band      TEXT,
  ADD COLUMN IF NOT EXISTS last_activity_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS merged_into_id       UUID,
  ADD COLUMN IF NOT EXISTS is_primary           BOOLEAN     NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_customers_tenant_lifecycle
  ON customer.customers (tenant_id, lifecycle_state);

CREATE INDEX IF NOT EXISTS idx_customers_tenant_engagement
  ON customer.customers (tenant_id, engagement_band);

CREATE INDEX IF NOT EXISTS idx_customers_last_activity
  ON customer.customers (tenant_id, last_activity_at DESC);

-- ─── 2. Lifecycle history ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS customer.lifecycle_history (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID        NOT NULL REFERENCES customer.customers(id) ON DELETE CASCADE,
  tenant_id   UUID        NOT NULL,
  from_state  TEXT,
  to_state    TEXT        NOT NULL,
  reason      TEXT,
  changed_by  TEXT,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lifecycle_history_customer
  ON customer.lifecycle_history (customer_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_lifecycle_history_tenant
  ON customer.lifecycle_history (tenant_id);

-- ─── 3. Tags ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS customer.tags (
  id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id  UUID        NOT NULL,
  name       TEXT        NOT NULL,
  colour     TEXT,
  source     TEXT        NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tags_tenant ON customer.tags (tenant_id);

-- ─── 4. Person tags ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS customer.person_tags (
  customer_id UUID        NOT NULL REFERENCES customer.customers(id) ON DELETE CASCADE,
  tag_id      UUID        NOT NULL REFERENCES customer.tags(id) ON DELETE CASCADE,
  tenant_id   UUID        NOT NULL,
  applied_by  TEXT,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ,
  PRIMARY KEY (customer_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_person_tags_customer ON customer.person_tags (customer_id);
CREATE INDEX IF NOT EXISTS idx_person_tags_tag      ON customer.person_tags (tag_id);
CREATE INDEX IF NOT EXISTS idx_person_tags_tenant   ON customer.person_tags (tenant_id);
