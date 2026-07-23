-- Migration: add saved_audiences table for reusable audience definitions

CREATE TABLE IF NOT EXISTS comms.saved_audiences (
  id               UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id        UUID        NOT NULL,
  name             TEXT        NOT NULL,
  description      TEXT,
  rules_json       TEXT        NOT NULL,
  estimated_count  INT         NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_audiences_tenant
  ON comms.saved_audiences (tenant_id);
