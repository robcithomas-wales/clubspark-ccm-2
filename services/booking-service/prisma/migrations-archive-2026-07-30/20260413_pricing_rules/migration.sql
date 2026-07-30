-- Migration: add pricing_rules table to booking schema
-- Date: 2026-04-13

CREATE TABLE booking.pricing_rules (
  id                         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id                  UUID        NOT NULL,
  name                       TEXT        NOT NULL,
  label                      TEXT,
  description                TEXT,

  scope_type                 TEXT        NOT NULL DEFAULT 'organisation',
  scope_id                   UUID,

  days_of_week               INTEGER[]   NOT NULL DEFAULT '{}',
  time_from                  TEXT,
  time_to                    TEXT,

  rate_per_hour              NUMERIC(10,2) NOT NULL,
  currency                   VARCHAR(3)  NOT NULL DEFAULT 'GBP',
  lighting_surcharge_per_hour NUMERIC(10,2),
  member_discount_pct        NUMERIC(5,2),

  priority                   INTEGER     NOT NULL DEFAULT 0,
  is_active                  BOOLEAN     NOT NULL DEFAULT TRUE,

  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX pricing_rules_tenant_idx
  ON booking.pricing_rules (tenant_id);

CREATE INDEX pricing_rules_tenant_active_idx
  ON booking.pricing_rules (tenant_id, is_active);

CREATE INDEX pricing_rules_scope_idx
  ON booking.pricing_rules (tenant_id, scope_type, scope_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION booking.set_pricing_rules_updated_at()
  RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_pricing_rules_updated_at
  BEFORE UPDATE ON booking.pricing_rules
  FOR EACH ROW EXECUTE FUNCTION booking.set_pricing_rules_updated_at();
