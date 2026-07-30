-- Add reminder_sent_at to booking.bookings
-- Used by the BookingReminderTask cron to track which bookings have already
-- had a reminder event published, preventing duplicate reminders.

ALTER TABLE booking.bookings
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ NULL;

-- Index to make the cron query fast: filters on status + starts_at range + reminder_sent_at IS NULL
CREATE INDEX IF NOT EXISTS idx_bookings_reminder
  ON booking.bookings (starts_at, status)
  WHERE reminder_sent_at IS NULL;
