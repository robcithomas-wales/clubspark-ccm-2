-- Booking approval fields
ALTER TABLE booking.bookings
  ADD COLUMN IF NOT EXISTS approved_by    TEXT,
  ADD COLUMN IF NOT EXISTS approved_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_override BOOLEAN NOT NULL DEFAULT FALSE;

-- Series min/max session limits
ALTER TABLE booking.booking_series
  ADD COLUMN IF NOT EXISTS min_sessions INT,
  ADD COLUMN IF NOT EXISTS max_sessions INT;
