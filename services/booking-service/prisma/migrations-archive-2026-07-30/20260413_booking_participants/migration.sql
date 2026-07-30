-- Additional named participants on a single booking.
-- Allows e.g. a coach to book a court for "Alice, Bob, Charlie"
-- without creating three separate bookings.

CREATE TABLE booking.booking_participants (
  id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID        NOT NULL REFERENCES booking.bookings(id) ON DELETE CASCADE,
  tenant_id  UUID        NOT NULL,
  person_id  UUID        NULL,        -- optional link to people.people (no FK)
  name       TEXT        NOT NULL,
  email      TEXT        NULL,
  phone      TEXT        NULL,
  notes      TEXT        NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_participants_booking_id
  ON booking.booking_participants (booking_id);

CREATE INDEX idx_booking_participants_tenant_booking
  ON booking.booking_participants (tenant_id, booking_id);

CREATE INDEX idx_booking_participants_tenant_person
  ON booking.booking_participants (tenant_id, person_id)
  WHERE person_id IS NOT NULL;

-- updated_at trigger
CREATE OR REPLACE FUNCTION booking.set_booking_participants_updated_at()
  RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_booking_participants_updated_at
  BEFORE UPDATE ON booking.booking_participants
  FOR EACH ROW EXECUTE FUNCTION booking.set_booking_participants_updated_at();
