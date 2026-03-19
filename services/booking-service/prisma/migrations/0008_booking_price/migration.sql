-- Add price and currency to bookings for revenue tracking
ALTER TABLE booking.bookings
  ADD COLUMN IF NOT EXISTS price    DECIMAL(10,2) NULL,
  ADD COLUMN IF NOT EXISTS currency CHAR(3) NOT NULL DEFAULT 'GBP';
