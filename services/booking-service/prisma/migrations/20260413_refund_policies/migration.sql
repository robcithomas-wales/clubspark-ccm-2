-- Refund policies: define what percentage is refunded based on cancellation notice
CREATE TABLE IF NOT EXISTS booking.refund_policies (
  id                  UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id           UUID        NOT NULL,
  name                TEXT        NOT NULL,
  venue_id            UUID        NULL,
  hours_before_start  INT         NOT NULL,  -- cancel >= N hours before → refund applies
  refund_pct          NUMERIC(5, 2) NOT NULL, -- 0–100
  priority            INT         NOT NULL DEFAULT 100,
  is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refund_policies_tenant        ON booking.refund_policies (tenant_id);
CREATE INDEX IF NOT EXISTS idx_refund_policies_tenant_active ON booking.refund_policies (tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_refund_policies_venue         ON booking.refund_policies (tenant_id, venue_id);

-- Refund computed on cancellation — stamped onto the booking row
ALTER TABLE booking.bookings
  ADD COLUMN IF NOT EXISTS refund_pct    NUMERIC(5, 2)  NULL,
  ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10, 2) NULL,
  ADD COLUMN IF NOT EXISTS refund_status TEXT           NULL;  -- pending | processed | waived
