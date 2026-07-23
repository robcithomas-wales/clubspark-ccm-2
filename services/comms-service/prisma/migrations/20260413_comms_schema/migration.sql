-- ClubSpark Comms Service — Initial Schema
-- Creates the comms schema and all core tables.
-- Run via: cd services/comms-service && npx prisma migrate deploy

CREATE SCHEMA IF NOT EXISTS comms;

-- ─── message_log ────────────────────────────────────────────────────────────
-- Central record of every outbound communication intent.
-- status lifecycle: queued → sent | failed | suppressed | bounced

CREATE TABLE comms.message_log (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID        NOT NULL,

  -- Recipient
  recipient_email     TEXT,
  recipient_name      TEXT,
  recipient_phone     TEXT,
  recipient_person_id UUID,

  -- Channel + content
  channel             TEXT        NOT NULL,   -- email | sms | push | in_app
  template_key        TEXT,
  subject             TEXT,
  body_preview        TEXT,                   -- first 200 chars for log display

  -- Status
  status              TEXT        NOT NULL DEFAULT 'queued',
  error_detail        TEXT,

  -- Source tracing
  source_event_type   TEXT,                   -- e.g. booking.confirmed
  source_entity_id    TEXT,                   -- bookingId, membershipId, etc.
  source_module       TEXT,                   -- bookings | membership | payment | manual
  campaign_id         UUID,

  -- Provider tracking (populated via delivery webhooks in production)
  provider_message_id TEXT,
  sent_at             TIMESTAMPTZ,
  delivered_at        TIMESTAMPTZ,
  opened_at           TIMESTAMPTZ,
  clicked_at          TIMESTAMPTZ,
  bounced_at          TIMESTAMPTZ,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_message_log_tenant       ON comms.message_log (tenant_id);
CREATE INDEX idx_message_log_channel      ON comms.message_log (tenant_id, channel);
CREATE INDEX idx_message_log_status       ON comms.message_log (tenant_id, status);
CREATE INDEX idx_message_log_event_type   ON comms.message_log (tenant_id, source_event_type);
CREATE INDEX idx_message_log_campaign     ON comms.message_log (campaign_id);
CREATE INDEX idx_message_log_created_at   ON comms.message_log (created_at DESC);

-- ─── suppression ────────────────────────────────────────────────────────────
-- Org-level opt-outs, bounces, and spam complaints.
-- Checked before every send by SendRulesService.

CREATE TABLE comms.suppression (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL,
  email       TEXT,
  phone       TEXT,
  channel     TEXT        NOT NULL,  -- email | sms | all
  reason      TEXT        NOT NULL,  -- unsubscribed | bounced | spam_complaint | admin
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, email, channel),
  UNIQUE (tenant_id, phone, channel)
);

CREATE INDEX idx_suppression_email ON comms.suppression (tenant_id, email);
CREATE INDEX idx_suppression_phone ON comms.suppression (tenant_id, phone);

-- ─── templates ──────────────────────────────────────────────────────────────
-- System templates (tenant_id IS NULL, is_system = true) are seeded at startup.
-- Orgs can add tenant-level overrides that shadow system templates by key.

CREATE TABLE comms.templates (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID,                   -- NULL = global system default
  key               TEXT        NOT NULL,   -- e.g. booking.confirmed
  name              TEXT        NOT NULL,
  channel           TEXT        NOT NULL,   -- email | sms
  is_system         BOOLEAN     NOT NULL DEFAULT false,
  is_active         BOOLEAN     NOT NULL DEFAULT true,

  -- Email
  subject_template  TEXT,
  body_template     TEXT,
  custom_footer     TEXT,                   -- org-editable appended section

  -- SMS
  sms_template      TEXT,

  -- Routing
  reply_to          TEXT,
  from_name         TEXT,

  -- Variable manifest (array of variable names used in this template)
  variables         TEXT[]      NOT NULL DEFAULT '{}',

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (key),                             -- system templates: unique by key alone
  UNIQUE (tenant_id, key)                   -- tenant overrides: unique per tenant + key
);

CREATE INDEX idx_templates_tenant ON comms.templates (tenant_id);
CREATE INDEX idx_templates_key    ON comms.templates (key);

-- ─── campaigns ──────────────────────────────────────────────────────────────
-- User-initiated bulk sends. Each recipient produces one message_log row.
-- status: draft | scheduled | sending | sent | cancelled

CREATE TABLE comms.campaigns (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID        NOT NULL,
  name                 TEXT,
  channel              TEXT        NOT NULL,
  audience_definition  TEXT,       -- JSON: { type, filters, recipients }
  subject              TEXT,
  body                 TEXT,
  template_id          UUID,
  reply_to             TEXT,
  status               TEXT        NOT NULL DEFAULT 'draft',
  recipient_count      INT,
  sent_count           INT,
  suppressed_count     INT,
  scheduled_at         TIMESTAMPTZ,
  sent_at              TIMESTAMPTZ,
  created_by           TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaigns_tenant ON comms.campaigns (tenant_id);
CREATE INDEX idx_campaigns_status ON comms.campaigns (tenant_id, status);

-- Foreign key from message_log → campaigns
ALTER TABLE comms.message_log
  ADD CONSTRAINT fk_message_log_campaign
  FOREIGN KEY (campaign_id) REFERENCES comms.campaigns (id)
  ON DELETE SET NULL;

-- ─── Trigger: auto-update updated_at ────────────────────────────────────────
CREATE OR REPLACE FUNCTION comms.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_templates_updated_at
  BEFORE UPDATE ON comms.templates
  FOR EACH ROW EXECUTE FUNCTION comms.set_updated_at();

CREATE TRIGGER trg_campaigns_updated_at
  BEFORE UPDATE ON comms.campaigns
  FOR EACH ROW EXECUTE FUNCTION comms.set_updated_at();
