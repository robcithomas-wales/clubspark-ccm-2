-- Remove foreign keys that exist only in the live database and have no place in
-- the datamodel. Every statement is IF EXISTS: on a database built from these
-- migrations these constraints were never created, so this migration is a no-op.
-- Its purpose is to bring the live Supabase instance back in line with what the
-- migrations produce.

-- 1. Four duplicated constraints.
--
-- These relations already carried a foreign key under a hand-written `_fk` name.
-- 20260804000000_add_missing_foreign_keys filtered the existing keys by constraint
-- NAME rather than by table+column, so the `_fk` names did not match and a second,
-- identical constraint was added alongside each one.
--
-- Both are enforced, so nothing was ever unprotected — but Prisma expects exactly
-- one constraint per relation, so the extras show as permanent, unfixable drift.
-- Dropping the hand-named copy keeps the Prisma-convention `_fkey` and leaves the
-- relation enforced throughout; at no point is the column unconstrained.
ALTER TABLE membership.membership_plan_entitlements DROP CONSTRAINT IF EXISTS membership_plan_entitlements_policy_fk;
ALTER TABLE membership.membership_plan_entitlements DROP CONSTRAINT IF EXISTS membership_plan_entitlements_plan_fk;
ALTER TABLE membership.membership_plans DROP CONSTRAINT IF EXISTS membership_plans_scheme_fk;
ALTER TABLE membership.memberships DROP CONSTRAINT IF EXISTS memberships_plan_fk;

-- 2. A cross-schema foreign key into an orphaned schema.
--
--     membership.membership_participants.person_id -> identity.people(id)
--
-- Applied by hand; it appears in no migration file, which is why a database built
-- from this repository has never had it. Two independent reasons to remove it:
--
--   * `identity` is one of three orphaned schemas left over from an abandoned
--     data model. `identity.people` holds 0 rows; the real person records are in
--     `people.persons` (6 rows). So this key pointed at the wrong table, and it
--     has only ever validated because both it and the referencing table are empty
--     — the first participant insert would have failed against it.
--   * A foreign key between two services' schemas is the exact coupling that
--     makes regionalisation impossible — it forces both schemas into the same
--     database forever. See docs/architecture/cross-schema-coupling-inventory.md.
--
-- Nothing depends on the constraint: `membership_participants` is empty, no module
-- in src/ reads or writes it, and membership-service references no `identity.*`
-- object anywhere. Person ids are held as opaque values, not joined.
ALTER TABLE membership.membership_participants DROP CONSTRAINT IF EXISTS membership_participants_person_fk;
