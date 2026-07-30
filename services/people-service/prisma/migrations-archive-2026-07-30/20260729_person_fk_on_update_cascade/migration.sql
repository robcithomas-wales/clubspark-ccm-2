-- Make the person_id foreign keys cascade on UPDATE as well as DELETE.
--
-- Why: merging two customer records re-points people.persons.id from an old id to
-- a new (Supabase auth) id. These FKs were ON DELETE CASCADE only, so the UPDATE
-- violated them. The previous workaround was to run the whole merge with
--   SET LOCAL session_replication_role = replica
-- which disables *all* trigger and FK enforcement for the transaction. That needs
-- superuser/replication privilege the application role should never hold on Azure
-- Database for PostgreSQL, and it silently disabled integrity checks well beyond
-- the two constraints actually in the way.
--
-- ON UPDATE CASCADE makes the id change legal on its own terms, so the merge no
-- longer needs elevated privilege and no longer switches integrity checking off.
--
-- Both constraints are Postgres-default names from the inline REFERENCES clauses
-- in 20260413_activities_segments; DROP ... IF EXISTS keeps this re-runnable.

ALTER TABLE people.person_activities
  DROP CONSTRAINT IF EXISTS person_activities_person_id_fkey;

ALTER TABLE people.person_activities
  ADD CONSTRAINT person_activities_person_id_fkey
  FOREIGN KEY (person_id) REFERENCES people.persons(id)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE people.segment_memberships
  DROP CONSTRAINT IF EXISTS segment_memberships_person_id_fkey;

ALTER TABLE people.segment_memberships
  ADD CONSTRAINT segment_memberships_person_id_fkey
  FOREIGN KEY (person_id) REFERENCES people.persons(id)
  ON DELETE CASCADE ON UPDATE CASCADE;
