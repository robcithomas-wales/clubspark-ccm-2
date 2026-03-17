-- Blackout dates: venue-wide or resource-specific date closures
-- Supports single dates, date ranges, and recurring dates via iCal RRULE

CREATE TABLE IF NOT EXISTS venue.blackout_dates (
  id               UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id        UUID        NOT NULL,
  venue_id         UUID        NOT NULL REFERENCES venue.venues(id) ON DELETE CASCADE,
  resource_id      UUID        REFERENCES venue.resources(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL,
  start_date       DATE        NOT NULL,
  end_date         DATE        NOT NULL,
  recurrence_rule  TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blackout_dates_tenant_idx
  ON venue.blackout_dates (tenant_id);

CREATE INDEX IF NOT EXISTS blackout_dates_tenant_venue_idx
  ON venue.blackout_dates (tenant_id, venue_id);

CREATE INDEX IF NOT EXISTS blackout_dates_tenant_resource_idx
  ON venue.blackout_dates (tenant_id, resource_id)
  WHERE resource_id IS NOT NULL;
