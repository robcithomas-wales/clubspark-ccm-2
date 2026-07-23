-- Add renewal reminder stamp column to prevent duplicate reminders from the daily cron
ALTER TABLE membership.memberships
  ADD COLUMN IF NOT EXISTS renewal_reminder_sent_at TIMESTAMPTZ NULL;

-- Partial index for the renewal reminder query (active memberships not yet reminded, expiring soon)
CREATE INDEX IF NOT EXISTS idx_memberships_renewal_reminder
  ON membership.memberships (end_date, status)
  WHERE renewal_reminder_sent_at IS NULL;
