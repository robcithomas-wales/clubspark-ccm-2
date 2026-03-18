-- Allow 'pending' as a valid booking status for approval-workflow bookings
ALTER TABLE booking.bookings DROP CONSTRAINT chk_booking_status;
ALTER TABLE booking.bookings ADD CONSTRAINT chk_booking_status
  CHECK (status = ANY (ARRAY['active'::text, 'cancelled'::text, 'pending'::text]));
