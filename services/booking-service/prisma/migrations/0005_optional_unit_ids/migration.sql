-- Add optional_unit_ids array to bookings
-- Stores UUIDs of optional extra bookable units (e.g. ball machines, changing rooms)
-- attached to a booking alongside the primary bookable_unit_id.

ALTER TABLE booking.bookings
  ADD COLUMN IF NOT EXISTS optional_unit_ids UUID[] NOT NULL DEFAULT '{}';
