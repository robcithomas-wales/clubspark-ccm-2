ALTER TABLE customer.customers
  ADD COLUMN IF NOT EXISTS marketing_consent    BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_recorded_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at           TIMESTAMPTZ NOT NULL DEFAULT now();
