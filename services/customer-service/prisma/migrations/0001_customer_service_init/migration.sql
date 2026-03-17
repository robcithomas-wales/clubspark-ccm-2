-- Customer Service — initial migration
-- The customer.customers table already exists in the shared database.
-- This migration is intentionally a no-op to register the baseline state
-- so Prisma migration history is consistent across environments.

-- Ensure the schema exists (idempotent)
CREATE SCHEMA IF NOT EXISTS customer;

-- Ensure the table exists (idempotent — will be a no-op if already present)
CREATE TABLE IF NOT EXISTS customer.customers (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID        NOT NULL,
  first_name TEXT,
  last_name  TEXT,
  email      TEXT,
  phone      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customers_tenant_id_idx       ON customer.customers (tenant_id);
CREATE INDEX IF NOT EXISTS customers_tenant_email_idx    ON customer.customers (tenant_id, email);
