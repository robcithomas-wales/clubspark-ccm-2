-- Migration: Open Bookings — sessions + session_participants tables
-- Date: 2026-04-13

CREATE TABLE booking.sessions (
  id                  UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id           UUID        NOT NULL,
  organisation_id     UUID,

  venue_id            UUID        NOT NULL,
  resource_id         UUID        NOT NULL,
  bookable_unit_id    UUID        NOT NULL,

  name                TEXT        NOT NULL,
  description         TEXT,
  starts_at           TIMESTAMPTZ NOT NULL,
  ends_at             TIMESTAMPTZ NOT NULL,

  price_per_participant NUMERIC(10,2),
  currency            CHAR(3)     NOT NULL DEFAULT 'GBP',

  min_participants    INTEGER,
  max_participants    INTEGER,

  -- 'open' | 'full' | 'cancelled' | 'completed'
  status              TEXT        NOT NULL DEFAULT 'open',

  coach_id            UUID,
  notes               TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX sessions_tenant_idx        ON booking.sessions (tenant_id);
CREATE INDEX sessions_tenant_status_idx ON booking.sessions (tenant_id, status);
CREATE INDEX sessions_tenant_starts_idx ON booking.sessions (tenant_id, starts_at);
CREATE INDEX sessions_unit_idx          ON booking.sessions (tenant_id, bookable_unit_id);

CREATE OR REPLACE FUNCTION booking.set_sessions_updated_at()
  RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER set_sessions_updated_at
  BEFORE UPDATE ON booking.sessions
  FOR EACH ROW EXECUTE FUNCTION booking.set_sessions_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE booking.session_participants (
  id                  UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id          UUID        NOT NULL REFERENCES booking.sessions (id) ON DELETE CASCADE,
  tenant_id           UUID        NOT NULL,

  customer_id         UUID,

  participant_name    TEXT        NOT NULL,
  participant_email   TEXT,

  -- 'registered' | 'attended' | 'cancelled' | 'no_show'
  status              TEXT        NOT NULL DEFAULT 'registered',
  payment_status      TEXT        NOT NULL DEFAULT 'unpaid',

  joined_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX session_participants_session_idx  ON booking.session_participants (session_id);
CREATE INDEX session_participants_tenant_idx   ON booking.session_participants (tenant_id, session_id);
CREATE INDEX session_participants_customer_idx ON booking.session_participants (tenant_id, customer_id);

CREATE OR REPLACE FUNCTION booking.set_session_participants_updated_at()
  RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER set_session_participants_updated_at
  BEFORE UPDATE ON booking.session_participants
  FOR EACH ROW EXECUTE FUNCTION booking.set_session_participants_updated_at();
