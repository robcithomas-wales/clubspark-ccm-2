-- Payment splits: multiple payers contributing to a single booking's total
CREATE TABLE IF NOT EXISTS booking.booking_payment_splits (
  id              UUID           NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id      UUID           NOT NULL REFERENCES booking.bookings(id) ON DELETE CASCADE,
  tenant_id       UUID           NOT NULL,
  payer_person_id UUID           NULL,
  payer_name      TEXT           NOT NULL,
  payer_email     TEXT           NULL,
  amount_due      NUMERIC(10, 2) NOT NULL,
  amount_paid     NUMERIC(10, 2) NOT NULL DEFAULT 0,
  currency        CHAR(3)        NOT NULL DEFAULT 'GBP',
  payment_status  TEXT           NOT NULL DEFAULT 'unpaid',
  notes           TEXT           NULL,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_payment_splits_booking ON booking.booking_payment_splits (booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_payment_splits_tenant  ON booking.booking_payment_splits (tenant_id, booking_id);

CREATE OR REPLACE FUNCTION booking.set_payment_splits_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_payment_splits_updated_at ON booking.booking_payment_splits;
CREATE TRIGGER trg_payment_splits_updated_at
  BEFORE UPDATE ON booking.booking_payment_splits
  FOR EACH ROW EXECUTE FUNCTION booking.set_payment_splits_updated_at();
