-- Add home page CMS content to organisations
ALTER TABLE venue.organisations
  ADD COLUMN IF NOT EXISTS home_page_content JSONB;
