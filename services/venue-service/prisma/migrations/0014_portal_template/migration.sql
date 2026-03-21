-- Add portal_template column to organisations
-- Allows admins to select a layout template for their customer portal.
-- 'bold'  = full-screen hero, top horizontal nav (default / current layout)
-- 'club'  = white dashboard, vertical sidebar nav

ALTER TABLE venue.organisations
  ADD COLUMN IF NOT EXISTS portal_template TEXT NOT NULL DEFAULT 'bold';
