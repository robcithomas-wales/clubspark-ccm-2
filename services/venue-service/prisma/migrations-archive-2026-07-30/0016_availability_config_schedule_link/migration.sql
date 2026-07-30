-- Link availability configs to a seasonal schedule (optional)
ALTER TABLE venue.availability_configs
  ADD COLUMN IF NOT EXISTS seasonal_schedule_id UUID NULL
    REFERENCES venue.seasonal_schedules(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_availability_configs_schedule
  ON venue.availability_configs (tenant_id, seasonal_schedule_id)
  WHERE seasonal_schedule_id IS NOT NULL;
