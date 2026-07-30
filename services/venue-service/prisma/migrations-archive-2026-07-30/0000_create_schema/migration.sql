-- Create this service's schema before anything tries to use it.
--
-- Why this exists: 0001_venue_service_init (and everything after) assumes the
-- "venue" schema already exists. It did on the shared development database —
-- created by hand or by `prisma db push` — so migrations appeared to work. But
-- replaying them into an EMPTY database failed immediately with
-- 'schema "venue" does not exist', which meant the repository could not build a
-- database from nothing. That property is a hard prerequisite for CI on an
-- ephemeral Postgres and for standing up a new regional database.
--
-- Named 0000_ so it sorts before 0001_. Idempotent, so it is a no-op on any
-- database where the schema already exists.

CREATE SCHEMA IF NOT EXISTS "venue";
