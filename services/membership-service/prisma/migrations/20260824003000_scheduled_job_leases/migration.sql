CREATE TABLE membership.scheduled_job_leases (
  job_name TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  lease_until TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX scheduled_job_leases_expiry_idx
  ON membership.scheduled_job_leases (lease_until);
