-- Add the intra-schema foreign keys that schema.prisma declares as relations
-- but the database never had.
--
-- These tables were created by `prisma db push`, which applied them without the
-- constraints. Prisma introspection cannot see a relation with no foreign key, so
-- `db pull` silently dropped the relation fields and the code stopped compiling —
-- which is why booking-service sat in KNOWN_DRIFT.
--
-- Safe to add now: the pilot has no meaningful data, so there are no orphan rows
-- to reconcile. This gets materially harder once there are customers.
--
-- ONLY genuinely-missing keys are added. Constraints that already exist are left
-- alone — in particular person_activities and segment_memberships carry
-- ON UPDATE CASCADE, which the customer-merge saga depends on; Prisma's own diff
-- would have reverted those to its defaults and broken the merge.
--
-- Every key stays INSIDE the booking schema. Cross-schema keys are deliberately not
-- reintroduced — see docs/architecture/cross-schema-coupling-inventory.md.

ALTER TABLE "booking"."bookings" ADD CONSTRAINT "bookings_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "booking"."booking_series"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "booking"."booking_add_ons" ADD CONSTRAINT "booking_add_ons_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "booking"."bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking"."booking_rule_purpose_prices" ADD CONSTRAINT "booking_rule_purpose_prices_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "booking"."booking_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
