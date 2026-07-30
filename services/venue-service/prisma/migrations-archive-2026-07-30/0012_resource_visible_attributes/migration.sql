-- Controls which built-in resource attributes are shown on the public-facing
-- customer portal and mobile app. Defaults to all attributes visible.
ALTER TABLE venue.resources
  ADD COLUMN IF NOT EXISTS visible_attributes TEXT[]
    NOT NULL DEFAULT ARRAY['surface','isIndoor','hasLighting','description','sport'];
