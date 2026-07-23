-- Allow bookings to be made on behalf of a different person (e.g. parent books for child)
-- customerId = payer/booker, bookedForPersonId = the person the slot is actually for
ALTER TABLE booking.bookings
  ADD COLUMN IF NOT EXISTS booked_for_person_id UUID NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_booked_for
  ON booking.bookings (tenant_id, booked_for_person_id)
  WHERE booked_for_person_id IS NOT NULL;
