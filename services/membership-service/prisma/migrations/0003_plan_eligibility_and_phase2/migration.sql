-- Phase 1: Eligibility rules per plan (stored as JSONB)
ALTER TABLE membership.membership_plans
  ADD COLUMN IF NOT EXISTS eligibility         JSONB,
  ADD COLUMN IF NOT EXISTS grace_period_days   INT,
  ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT;

-- Phase 2: Manual payment recording on memberships
ALTER TABLE membership.memberships
  ADD COLUMN IF NOT EXISTS payment_recorded_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_reference    TEXT,
  ADD COLUMN IF NOT EXISTS payment_method       TEXT,
  ADD COLUMN IF NOT EXISTS payment_amount       NUMERIC(10,2);

-- Index to support "renewals due in N days" queries efficiently
CREATE INDEX IF NOT EXISTS idx_memberships_renewal_date
  ON membership.memberships (tenant_id, organisation_id, renewal_date)
  WHERE renewal_date IS NOT NULL;
