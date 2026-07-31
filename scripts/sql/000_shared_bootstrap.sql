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

-- The auth.users shim that used to live here has been REMOVED (MR-1, 2026-07-31).
--
-- booking-service no longer LEFT JOINs Supabase's auth.users for customer display
-- fields; it calls people-service instead. That schema is Supabase-owned and does
-- not exist on plain PostgreSQL or on Azure Database for PostgreSQL, so depending
-- on it blocked the target platform, not just CI.
