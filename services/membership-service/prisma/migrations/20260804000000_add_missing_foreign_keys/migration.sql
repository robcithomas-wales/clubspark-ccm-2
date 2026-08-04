-- Add the intra-schema foreign keys that schema.prisma declares as relations
-- but the database never had.
--
-- These tables were created by `prisma db push`, which applied them without the
-- constraints. Prisma introspection cannot see a relation with no foreign key, so
-- `db pull` silently dropped the relation fields and the code stopped compiling —
-- which is why membership-service sat in KNOWN_DRIFT.
--
-- Safe to add now: the pilot has no meaningful data, so there are no orphan rows
-- to reconcile. This gets materially harder once there are customers.
--
-- ONLY genuinely-missing keys are added. Constraints that already exist are left
-- alone — in particular person_activities and segment_memberships carry
-- ON UPDATE CASCADE, which the customer-merge saga depends on; Prisma's own diff
-- would have reverted those to its defaults and broken the merge.
--
-- Every key stays INSIDE the membership schema. Cross-schema keys are deliberately not
-- reintroduced — see docs/architecture/cross-schema-coupling-inventory.md.

ALTER TABLE "membership"."membership_plans" ADD CONSTRAINT "membership_plans_scheme_id_fkey" FOREIGN KEY ("scheme_id") REFERENCES "membership"."membership_schemes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "membership"."memberships" ADD CONSTRAINT "memberships_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "membership"."membership_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "membership"."membership_plan_entitlements" ADD CONSTRAINT "membership_plan_entitlements_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "membership"."membership_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "membership"."membership_plan_entitlements" ADD CONSTRAINT "membership_plan_entitlements_entitlement_policy_id_fkey" FOREIGN KEY ("entitlement_policy_id") REFERENCES "membership"."entitlement_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
