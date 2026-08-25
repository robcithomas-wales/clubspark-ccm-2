CREATE TABLE comms.event_inbox (
  producer TEXT NOT NULL,
  event_id TEXT NOT NULL,
  tenant_id UUID,
  event_type TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing',
  owner_id TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 1,
  lease_until TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (producer, event_id),
  CONSTRAINT event_inbox_status_check CHECK (status IN ('processing', 'completed', 'failed'))
);

CREATE INDEX event_inbox_status_lease_idx ON comms.event_inbox (status, lease_until);
CREATE INDEX event_inbox_tenant_created_idx ON comms.event_inbox (tenant_id, created_at);
