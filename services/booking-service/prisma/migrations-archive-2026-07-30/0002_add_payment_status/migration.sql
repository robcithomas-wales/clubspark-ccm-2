-- Add payment_status to booking.bookings
-- Values: free | paid | unpaid | refunded | pending
ALTER TABLE booking.bookings
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid';

CREATE INDEX IF NOT EXISTS bookings_tenant_payment_status_idx
  ON booking.bookings (tenant_id, payment_status);
