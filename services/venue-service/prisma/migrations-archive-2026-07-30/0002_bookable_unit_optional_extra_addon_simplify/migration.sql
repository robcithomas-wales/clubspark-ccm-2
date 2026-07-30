-- Migration 0002: Add isOptionalExtra to bookable_units; remove scheduling fields from add_ons
-- These columns were removed because:
--   - Bookable resource extras (changing rooms, ball machines) are now modelled as BookableUnits
--     with isOptionalExtra=true, not as AddOns. Scheduling offsets belonged to that concept.
--   - The AddOn model is now product-only (tubes of balls, etc.) — no scheduling semantics.

ALTER TABLE venue.bookable_units
  ADD COLUMN IF NOT EXISTS is_optional_extra BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE venue.add_ons
  DROP COLUMN IF EXISTS requires_primary_booking,
  DROP COLUMN IF EXISTS is_time_bound,
  DROP COLUMN IF EXISTS default_start_offset_minutes,
  DROP COLUMN IF EXISTS default_end_offset_minutes;
