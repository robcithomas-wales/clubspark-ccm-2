-- Create booking_series table
CREATE TABLE IF NOT EXISTS booking.booking_series (
  id               UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id        UUID        NOT NULL,
  organisation_id  UUID,
  venue_id         UUID        NOT NULL,
  resource_id      UUID        NOT NULL,
  bookable_unit_id UUID        NOT NULL,
  customer_id      UUID,
  booking_source   VARCHAR,
  rrule            TEXT        NOT NULL,
  slot_starts_at   TIME        NOT NULL,
  slot_ends_at     TIME        NOT NULL,
  payment_status   VARCHAR(20) NOT NULL DEFAULT 'unpaid',
  notes            TEXT,
  status           VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS booking_series_tenant_idx
  ON booking.booking_series (tenant_id);

CREATE INDEX IF NOT EXISTS booking_series_tenant_status_idx
  ON booking.booking_series (tenant_id, status);

-- Add series_id FK to bookings
ALTER TABLE booking.bookings
  ADD COLUMN IF NOT EXISTS series_id UUID REFERENCES booking.booking_series(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS bookings_series_id_idx
  ON booking.bookings (series_id)
  WHERE series_id IS NOT NULL;
