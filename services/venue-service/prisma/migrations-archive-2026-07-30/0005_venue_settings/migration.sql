-- Feature toggle settings per venue
CREATE TABLE IF NOT EXISTS venue.venue_settings (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id            UUID        NOT NULL UNIQUE REFERENCES venue.venues(id) ON DELETE CASCADE,
  open_bookings       BOOLEAN     NOT NULL DEFAULT FALSE,
  add_ons_enabled     BOOLEAN     NOT NULL DEFAULT TRUE,
  pending_approvals   BOOLEAN     NOT NULL DEFAULT FALSE,
  split_payments      BOOLEAN     NOT NULL DEFAULT FALSE,
  public_booking_view TEXT        NOT NULL DEFAULT 'none',
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
