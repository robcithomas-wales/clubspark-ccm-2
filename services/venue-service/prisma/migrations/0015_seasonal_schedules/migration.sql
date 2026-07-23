CREATE TABLE IF NOT EXISTS venue.seasonal_schedules (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID        NOT NULL,
  venue_id    UUID        NOT NULL,
  name        TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'draft',
  start_date  DATE        NOT NULL,
  end_date    DATE        NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seasonal_schedules_tenant    ON venue.seasonal_schedules (tenant_id);
CREATE INDEX IF NOT EXISTS idx_seasonal_schedules_venue     ON venue.seasonal_schedules (tenant_id, venue_id);
CREATE INDEX IF NOT EXISTS idx_seasonal_schedules_status    ON venue.seasonal_schedules (tenant_id, status);

CREATE OR REPLACE FUNCTION venue.set_seasonal_schedules_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_seasonal_schedules_updated_at ON venue.seasonal_schedules;
CREATE TRIGGER trg_seasonal_schedules_updated_at
  BEFORE UPDATE ON venue.seasonal_schedules
  FOR EACH ROW EXECUTE FUNCTION venue.set_seasonal_schedules_updated_at();
