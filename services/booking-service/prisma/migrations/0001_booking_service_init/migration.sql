-- Add organisation_id to booking.bookings (was missing from original schema)
ALTER TABLE booking.bookings
  ADD COLUMN IF NOT EXISTS organisation_id UUID;

-- Add missing indexes for performance
CREATE INDEX IF NOT EXISTS bookings_tenant_id_idx
  ON booking.bookings (tenant_id);

CREATE INDEX IF NOT EXISTS bookings_tenant_starts_ends_idx
  ON booking.bookings (tenant_id, starts_at, ends_at);

CREATE INDEX IF NOT EXISTS bookings_tenant_unit_idx
  ON booking.bookings (tenant_id, bookable_unit_id);

CREATE INDEX IF NOT EXISTS bookings_tenant_customer_idx
  ON booking.bookings (tenant_id, customer_id);

CREATE INDEX IF NOT EXISTS bookings_tenant_status_idx
  ON booking.bookings (tenant_id, status);

-- Enable btree_gist for exclusion constraint (prevents overlapping bookings atomically)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Exclusion constraint: prevents any two non-cancelled bookings for the same
-- unit from overlapping in time. This is the atomic safety net that eliminates
-- the TOCTOU race condition regardless of concurrent requests.
ALTER TABLE booking.bookings
  DROP CONSTRAINT IF EXISTS no_overlapping_active_bookings;

ALTER TABLE booking.bookings
  ADD CONSTRAINT no_overlapping_active_bookings
  EXCLUDE USING GIST (
    tenant_id    WITH =,
    bookable_unit_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  )
  WHERE (status <> 'cancelled');
