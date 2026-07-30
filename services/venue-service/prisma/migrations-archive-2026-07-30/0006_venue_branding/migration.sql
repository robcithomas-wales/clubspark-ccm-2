-- Mobile app branding fields + club code for tenant lookup
ALTER TABLE venue.venue_settings
  ADD COLUMN IF NOT EXISTS club_code      TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS primary_colour TEXT NOT NULL DEFAULT '#1857E0',
  ADD COLUMN IF NOT EXISTS logo_url       TEXT,
  ADD COLUMN IF NOT EXISTS app_name       TEXT;

-- Index so the public config endpoint can look up by club code quickly
CREATE INDEX IF NOT EXISTS venue_settings_club_code_idx ON venue.venue_settings (club_code);
