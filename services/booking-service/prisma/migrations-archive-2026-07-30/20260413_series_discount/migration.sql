-- Add series pricing fields: optional base price per session and discount percentage
-- discountPct is applied at booking creation time (price = pricePerSession * (1 - discountPct/100))
ALTER TABLE booking.booking_series
  ADD COLUMN IF NOT EXISTS price_per_session NUMERIC(10, 2) NULL,
  ADD COLUMN IF NOT EXISTS discount_pct      NUMERIC(5, 2)  NULL,
  ADD COLUMN IF NOT EXISTS currency          CHAR(3)        NOT NULL DEFAULT 'GBP';
