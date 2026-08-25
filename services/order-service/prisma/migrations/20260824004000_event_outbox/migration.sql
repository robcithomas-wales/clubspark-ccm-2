CREATE TABLE commerce.event_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX event_outbox_pending_idx
  ON commerce.event_outbox (published_at, next_attempt_at);

CREATE INDEX event_outbox_tenant_idx
  ON commerce.event_outbox (tenant_id, created_at);
