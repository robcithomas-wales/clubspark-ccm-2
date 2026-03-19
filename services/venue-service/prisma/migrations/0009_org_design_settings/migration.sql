-- Add design settings columns to organisations
ALTER TABLE venue.organisations
  ADD COLUMN IF NOT EXISTS secondary_colour TEXT,
  ADD COLUMN IF NOT EXISTS heading_font     TEXT,
  ADD COLUMN IF NOT EXISTS body_font        TEXT,
  ADD COLUMN IF NOT EXISTS nav_layout       TEXT NOT NULL DEFAULT 'dark-inline',
  ADD COLUMN IF NOT EXISTS favicon_url      TEXT;
