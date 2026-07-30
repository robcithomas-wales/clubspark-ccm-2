-- Restore DEFAULT now() on updated_at for tables where Prisma stripped it.
-- These tables use raw SQL INSERTs that don't include updated_at, so the
-- column needs a DB-level default to satisfy the NOT NULL constraint.

ALTER TABLE booking.booking_series
  ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE booking.booking_rules
  ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE booking.booking_add_ons
  ALTER COLUMN updated_at SET DEFAULT now();
