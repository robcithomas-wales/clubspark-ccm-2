-- Transactional outbox for domain events (MR-2).
--
-- Events were published with `void eventBus.publish(...)` — unawaited, and the
-- publisher swallows every error. If a subscriber was down, the event was gone,
-- silently. There was no record it had ever existed.
--
-- The outbox makes the event part of the same database transaction as the state
-- change that caused it: either the booking is created AND the event is recorded,
-- or neither happens. A relay then delivers it, retrying until it succeeds.
--
-- This matters more once services are regional: async messaging becomes the
-- consistency mechanism between them, so losing a message means losing state.

CREATE TABLE IF NOT EXISTS membership.event_outbox (
  id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     UUID        NOT NULL,
  event_type    TEXT        NOT NULL,
  payload       JSONB       NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Delivery state. published_at IS NULL means "still owed".
  published_at  TIMESTAMPTZ NULL,
  attempts      INT         NOT NULL DEFAULT 0,
  last_error    TEXT        NULL,
  -- Exponential backoff: the relay ignores rows until this time.
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The relay's only query: undelivered rows that are due, oldest first.
-- Partial index so it stays small — delivered rows are the vast majority.
CREATE INDEX IF NOT EXISTS event_outbox_pending_idx
  ON membership.event_outbox (next_attempt_at)
  WHERE published_at IS NULL;
