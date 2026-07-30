-- Drop the cross-schema foreign key membership.memberships -> people.persons.
--
-- Why: a database-level FK between two services' schemas is the hardest form of
-- the shared-database coupling. It physically prevents membership and people from
-- ever living in separate databases, which is a prerequisite for the EU/US/AU
-- regional split (docs/architecture/scalability-and-multi-region.md), and it
-- violates invariant #3 in docs/engineering/architecture-principles.md.
--
-- It was also the real reason the customer-merge path ran with
--   SET LOCAL session_replication_role = replica
-- (disabling ALL integrity enforcement for that transaction, and needing a
-- privilege the app role should not hold): re-pointing people.persons.id tripped
-- this constraint from a table membership owns.
--
-- NOTE: this constraint was never in a migration file — it existed only in the
-- live database, presumably applied by hand. That is why the repo appeared to have
-- no cross-schema FKs. Recording the removal here so the schema history is honest.
--
-- What replaces it: membership.memberships.customer_id stays a plain UUID. Referential
-- integrity across the service boundary is now maintained by contract rather than by
-- the database — people-service calls POST /v1/memberships/internal/reassign-customer
-- when a person id changes, and that call is idempotent and compensated on failure.
-- This is the standard trade of a distributed system: the FK cannot survive the split.

ALTER TABLE membership.memberships
  DROP CONSTRAINT IF EXISTS memberships_customer_fk;

-- Keep the lookup fast now that the FK's implicit support is gone.
CREATE INDEX IF NOT EXISTS idx_memberships_customer_id
  ON membership.memberships (customer_id);
