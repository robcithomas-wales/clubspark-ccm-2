-- Booking rules engine
-- Defines access, pricing, and booking window rules per subject (who) + scope (what)

CREATE TABLE IF NOT EXISTS booking.booking_rules (
  id                      UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id               UUID         NOT NULL,
  name                    TEXT         NOT NULL,
  description             TEXT,

  -- Who this rule applies to
  subject_type            VARCHAR(30)  NOT NULL DEFAULT 'everyone',
  -- 'everyone' | 'role' | 'membership_plan' | 'membership_scheme'
  subject_ref             VARCHAR(200),
  -- null for 'everyone'; role name OR plan/scheme ID otherwise

  -- What resource scope this applies to
  scope_type              VARCHAR(30)  NOT NULL DEFAULT 'organisation',
  -- 'organisation' | 'resource_group' | 'resource'
  scope_id                UUID,
  -- null for 'organisation'; resource_group.id or resource.id otherwise

  -- Optional schedule filter (null = always applies)
  days_of_week            SMALLINT[],
  -- 0=Mon..6=Sun; null = all days
  time_from               TIME,
  time_to                 TIME,

  -- Access control
  can_book                BOOLEAN      NOT NULL DEFAULT true,
  requires_approval       BOOLEAN      NOT NULL DEFAULT false,

  -- Booking window
  advance_days            INTEGER,      -- max days ahead can book; null = unlimited
  min_slot_minutes        INTEGER,
  max_slot_minutes        INTEGER,
  booking_period_days     INTEGER,      -- rolling period length (e.g. 7 = rolling week)
  max_bookings_per_period INTEGER,
  allow_series            BOOLEAN      NOT NULL DEFAULT true,

  -- Pricing
  price_per_slot          DECIMAL(10,2),  -- null = free / not set
  price_currency          VARCHAR(3)   NOT NULL DEFAULT 'GBP',

  -- Capacity
  min_participants        INTEGER,
  max_participants        INTEGER,

  -- Rule priority (higher = wins when multiple rules match a context)
  priority                INTEGER      NOT NULL DEFAULT 0,

  is_active               BOOLEAN      NOT NULL DEFAULT true,
  created_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS booking_rules_tenant_idx
  ON booking.booking_rules (tenant_id);

CREATE INDEX IF NOT EXISTS booking_rules_tenant_active_idx
  ON booking.booking_rules (tenant_id, is_active);

CREATE INDEX IF NOT EXISTS booking_rules_scope_idx
  ON booking.booking_rules (tenant_id, scope_type, scope_id);

-- Purpose-based price overrides (e.g. match = £20, training = £15)
CREATE TABLE IF NOT EXISTS booking.booking_rule_purpose_prices (
  id          UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id     UUID         NOT NULL REFERENCES booking.booking_rules(id) ON DELETE CASCADE,
  purpose     VARCHAR(50)  NOT NULL,  -- 'match' | 'training' | 'social' | etc.
  price       DECIMAL(10,2) NOT NULL,
  currency    VARCHAR(3)   NOT NULL DEFAULT 'GBP',

  UNIQUE (rule_id, purpose)
);

CREATE INDEX IF NOT EXISTS booking_rule_purpose_prices_rule_idx
  ON booking.booking_rule_purpose_prices (rule_id);
