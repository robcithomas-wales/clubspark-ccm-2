-- Add mobile app / cross-channel branding fields to organisations.
-- club_code replaces the per-venue club_code in venue_settings.
-- app_name is the display name shown in the mobile app (defaults to org name).

ALTER TABLE venue.organisations
  ADD COLUMN IF NOT EXISTS app_name  TEXT,
  ADD COLUMN IF NOT EXISTS club_code TEXT UNIQUE;
