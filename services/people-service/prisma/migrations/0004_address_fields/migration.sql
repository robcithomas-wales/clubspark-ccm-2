-- Migration: 0004_address_fields
-- Add postal address fields to customer.customers

ALTER TABLE customer.customers
  ADD COLUMN IF NOT EXISTS address_line1  TEXT,
  ADD COLUMN IF NOT EXISTS address_line2  TEXT,
  ADD COLUMN IF NOT EXISTS city           TEXT,
  ADD COLUMN IF NOT EXISTS county         TEXT,
  ADD COLUMN IF NOT EXISTS postcode       TEXT,
  ADD COLUMN IF NOT EXISTS country        TEXT DEFAULT 'GB';
