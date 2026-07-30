-- Platform bootstrap — applied by scripts/migrate-all.sh before any service.
--
-- Objects that belong to no single service but that several services' schemas
-- depend on. Kept deliberately tiny: anything that can live inside a service's
-- own schema should, because shared objects are a coupling point and every
-- regional database has to reproduce them.
--
-- Why this file exists: membership's ten `*_set_updated_at` triggers call
-- shared.set_updated_at(). pg_dump of the membership schema does not include a
-- function from another schema, so replaying membership's baseline into an empty
-- database failed with 'schema "shared" does not exist'.
--
-- Extensions live here too. Prisma cannot represent them, and booking's EXCLUDE
-- constraint (the atomic guard against double-booking) needs btree_gist.

CREATE SCHEMA IF NOT EXISTS shared;

-- Sets updated_at on UPDATE. Several services define an identical private copy
-- inside their own schema (comms, integration, analytics, booking, venue, people);
-- membership uses this shared one. Worth converging on one approach eventually.
CREATE OR REPLACE FUNCTION shared.set_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

-- Required by booking's no_overlapping_active_bookings EXCLUDE constraint.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- gen_random_uuid() is built into PostgreSQL 13+, so pgcrypto is not required.

-- ─── TEMPORARY SHIM: auth.users ──────────────────────────────────────────────
--
-- ⚠️ Delete this block when WO-1.2(a) removes booking-service's auth.users joins.
--
-- booking-service's list/detail queries LEFT JOIN auth.users to fall back to
-- Supabase auth metadata for a customer's name and email:
--     bookings.repository.ts — findAll / findById
--
-- auth.users is created and owned by Supabase. It does not exist on a plain
-- PostgreSQL server, so without this shim those queries return 500 on any
-- non-Supabase database — CI, a local Postgres, and, importantly, Azure Database
-- for PostgreSQL. That last one makes this a migration blocker, not just a test
-- inconvenience: the target platform has no auth schema.
--
-- Created only if absent, so this is a no-op against Supabase and never shadows
-- the real table. Columns are limited to exactly what booking-service reads.

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id                  uuid PRIMARY KEY,
  email               text,
  raw_user_meta_data  jsonb
);
