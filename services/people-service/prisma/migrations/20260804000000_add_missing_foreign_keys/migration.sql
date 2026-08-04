-- Add the intra-schema foreign keys that schema.prisma declares as relations
-- but the database never had.
--
-- These tables were created by `prisma db push`, which applied them without the
-- constraints. Prisma introspection cannot see a relation with no foreign key, so
-- `db pull` silently dropped the relation fields and the code stopped compiling —
-- which is why people-service sat in KNOWN_DRIFT.
--
-- Safe to add now: the pilot has no meaningful data, so there are no orphan rows
-- to reconcile. This gets materially harder once there are customers.
--
-- ONLY genuinely-missing keys are added. Constraints that already exist are left
-- alone — in particular person_activities and segment_memberships carry
-- ON UPDATE CASCADE, which the customer-merge saga depends on; Prisma's own diff
-- would have reverted those to its defaults and broken the merge.
--
-- Every key stays INSIDE the people schema. Cross-schema keys are deliberately not
-- reintroduced — see docs/architecture/cross-schema-coupling-inventory.md.

ALTER TABLE "people"."lifecycle_history" ADD CONSTRAINT "lifecycle_history_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "people"."persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "people"."person_roles" ADD CONSTRAINT "person_roles_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "people"."persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "people"."person_tags" ADD CONSTRAINT "person_tags_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "people"."persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "people"."person_tags" ADD CONSTRAINT "person_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "people"."tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "people"."household_members" ADD CONSTRAINT "household_members_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "people"."households"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "people"."household_members" ADD CONSTRAINT "household_members_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "people"."persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "people"."person_relationships" ADD CONSTRAINT "person_relationships_from_customer_id_fkey" FOREIGN KEY ("from_customer_id") REFERENCES "people"."persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "people"."person_relationships" ADD CONSTRAINT "person_relationships_to_customer_id_fkey" FOREIGN KEY ("to_customer_id") REFERENCES "people"."persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
