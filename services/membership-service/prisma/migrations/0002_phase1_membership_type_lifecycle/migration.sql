-- Phase 1: Membership type, pricing model, and lifecycle

-- Add Phase 1 fields to membership_plans
ALTER TABLE membership.membership_plans
  ADD COLUMN IF NOT EXISTS membership_type   TEXT,
  ADD COLUMN IF NOT EXISTS sport_category    TEXT,
  ADD COLUMN IF NOT EXISTS max_members       INTEGER,
  ADD COLUMN IF NOT EXISTS is_public         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pricing_model     TEXT,
  ADD COLUMN IF NOT EXISTS price             DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS currency          TEXT NOT NULL DEFAULT 'GBP',
  ADD COLUMN IF NOT EXISTS billing_interval  TEXT,
  ADD COLUMN IF NOT EXISTS instalment_count  INTEGER;

-- Update membership status default from 'active' to 'pending'
ALTER TABLE membership.memberships
  ALTER COLUMN status SET DEFAULT 'pending';

-- Add lifecycle timestamp columns to memberships
ALTER TABLE membership.memberships
  ADD COLUMN IF NOT EXISTS activated_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lapsed_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expired_at    TIMESTAMPTZ;

-- Create lifecycle event log table
CREATE TABLE IF NOT EXISTS membership.membership_lifecycle_events (
  id             UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  membership_id  UUID        NOT NULL REFERENCES membership.memberships(id),
  from_status    TEXT        NOT NULL,
  to_status      TEXT        NOT NULL,
  reason         TEXT,
  created_by     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
