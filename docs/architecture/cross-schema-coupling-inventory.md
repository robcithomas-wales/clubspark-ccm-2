# Cross-Schema Coupling Inventory (WO-1.0)

> **Status:** Maintained inventory — implementation re-verified 2026-08-25
> **Date:** 2026-07-29 · **Updated:** 2026-08-25
> **Work order:** [`../roadmap/phase-1-backlog.md`](../roadmap/phase-1-backlog.md) §1 WO-1.0
> **ADR:** [`scalability-and-multi-region.md`](scalability-and-multi-region.md)

The authoritative list of every place a service reaches into another service's schema. This is the
keystone deliverable: nothing in §1 (decouple the shared DB) can be planned until this list is
closed, and regionalization is blocked until every row below is resolved.

Method: `grep` for `<schema>.<table>` across all 15 services' `src/**/*.ts`, cross-checked against
each service's `prisma/schema.prisma`, with every hit read in context and classified. Event-name
false positives (`booking.confirmed`, `payment.succeeded`, …) and import paths were excluded.
**Then verified against the live database** via `pg_constraint` — which turned out to matter, see §5.

---

## 0. Corrections to the readiness review

The 2026-07-29 readiness pass characterised this as "booking-service reads other schemas." That is
incomplete in two ways that change the plan:

1. **people-service *writes* into `booking.*` and `membership.*`** (row PS1). This is a
   cross-service **write**, not a read — a direct violation of invariant #1 (sole writer), and a
   harder blocker than any of booking's reads. It was not in the ADR. It escalates WO-1.x scope.
2. **`booking.findDueReminders()` joins `people.people`, a table that does not exist** (row B7).
   The table is `people.persons` everywhere else. This is a **live production bug**, not just
   coupling — see §4.

Both are folded into the strategy table below.

---

## 1. booking-service → other schemas (reads, raw SQL)

All access is via `$queryRaw`; none of it goes through the Prisma client.

| # | Site | Foreign object(s) | Purpose | Frequency | Strategy |
|---|---|---|---|---|---|
| B1 | `bookings.repository.ts` `findAll` | formerly `people.persons`, `auth.users`, `venue.venues`, `venue.resources`, `venue.bookable_units` | Display names on the booking list | Warm — paginated admin list | ✅ **Resolved:** batch/API hydration through People and Venue clients |
| B2 | `bookings.repository.ts` `findById` | formerly the same five | Display names for one booking | Warm | ✅ **Resolved:** batch/API hydration through People and Venue clients |
| B3 | `bookings.repository.ts` `findBookableUnit` | `venue.bookable_units` | Validate the unit on booking create | **Hot** — every create | **Projection implemented behind `BOOKING_VENUE_PROJECTION_MODE`; tenant-scoped legacy fallback retained for rollout** |
| B4 | `bookings.repository.ts` `findResourceGroupId` | `venue.resources` | Resolve resource group for pricing/conflicts | **Hot** | **Projection implemented behind the same rollout switch; tenant-scoped legacy fallback retained** |
| B5 | `bookings.repository.ts` `getStats` | `venue.bookable_units` | Count active units for the utilisation % | Occasional — dashboard | **Resolved 2026-08-24:** authenticated Venue API call; report fails rather than treating upstream failure as zero capacity |
| B6 | `bookings.repository.ts` `topCustomers` | formerly `people.persons` | Customer names in a report | Occasional — report | ✅ **Resolved:** People batch lookup |
| B7 | `bookings.repository.ts` `findDueReminders` | formerly `people.persons`, `venue.venues`, `venue.resources` | Enrich the reminder event payload | Hourly cron | ✅ **Resolved:** tenant-grouped People/Venue API hydration; original table-name bug remains regression-covered (§4) |
| A1 | `availability.repository.ts` `getCoachingSessionConflicts` | `coaching.lesson_sessions` | Coaching sessions block bookable units | **Hot** — every booking create | **Projection implemented behind `BOOKING_COACHING_PROJECTION_MODE`; tenant-scoped legacy fallback retained for rollout** |
| A2 | `availability.repository.ts` `getConflictMapForUnits` | `venue.unit_conflicts` | Unit conflict map (parent/child courts) | **Hot** | **Projection implemented behind the rollout switch; legacy query now scopes through both units' tenant ownership** |
| P1 | `pricing.repository.ts` `getResourceLighting` | `venue.resources.has_lighting` | Lighting surcharge on a quote | **Hot** — every quote | **Projection implemented behind the rollout switch; tenant-scoped legacy fallback retained** |
| S1 | `booking-series.repository.ts` | formerly `people.persons` | Customer names on a series | Warm | ✅ **Resolved:** People/Venue API hydration |

### 1a. Schema-level coupling — ✅ RESOLVED 2026-07-29

`booking-service/prisma/schema.prisma` used to declare `schemas = ["booking", "venue"]` with two
models under `@@schema("venue")` (`BookableUnit`, `Resource`), so booking's Prisma client was
generated against venue's tables.

Verified no application code used `prisma.bookableUnit` / `prisma.resource` (the only hits were in
generated `.d.ts` doc comments), so both models and the `"venue"` datasource entry were removed.
The datasource now declares `schemas = ["booking"]`. A comment in the schema records why they must
not return: with the models present, a later removal would make `prisma migrate` emit `DROP TABLE`
against venue-service's real tables.

---

## 2. people-service → booking + membership (**writes**) 🔴

| # | Site | Foreign object(s) | Purpose | Frequency | Strategy | Status |
|---|---|---|---|---|---|---|
| PS1 | `customers.repository.ts` `rehome` | `UPDATE booking.bookings`, `UPDATE membership.memberships` | Re-point `customer_id` when merging a customer onto a new id | Occasional — customer merge | Saga / owning-service API calls | ✅ **RESOLVED 2026-07-29** |

Called from `customers.service.ts` when an incoming customer id collides with an existing record.

Three separate problems, all blockers:

- **Sole-writer violation.** people-service mutated two other services' tables directly.
- **Distributed transaction.** All three updates shared one local `$transaction`. Once booking,
  membership, and people are in different databases — let alone different *regions* — that atomicity
  is simply unavailable.
- **Privilege escalation.** It issued `SET LOCAL session_replication_role = replica` to bypass FK
  checks. That requires superuser or an equivalent replication role; the platform's app user should
  never hold it. This was a security finding in its own right, not merely an architectural one.

**How it was resolved** (see also §5 — the FK discovery that made this harder than it first looked):

- booking-service and membership-service each expose
  `POST /{bookings,memberships}/internal/reassign-customer`, owning the update to their own table.
  (Unversioned: booking enables URI versioning with no `defaultVersion` and its controller declares
  none; membership enables no versioning at all. A `/v1` prefix 404s on both.)
- Those routes are `@SkipTenant()` — a service-to-service caller has no end-user JWT, and the tenant
  guard rejects header-only auth outside test/dev. `InternalSecretGuard` is therefore the **sole**
  authenticator and is fail-closed everywhere except `NODE_ENV=test`; the tenant comes from the
  explicit `x-tenant-id` header, and each repository filters on it. This matches the platform's
  existing internal-endpoint pattern (integration-service `events/inbound`, comms-service).
- Both are **idempotent** (they filter on the *old* id, so a replay matches nothing) and
  **reversible** (reassigning new→old undoes them) — the two properties the saga needs.
- `CustomersService.rehome` orchestrates: move our own person row first, then each owning service in
  turn, compensating in reverse on any failure.
- `session_replication_role` is gone. people-service's own child FKs got `ON UPDATE CASCADE`
  (`20260729_person_fk_on_update_cascade`) so the id change is legal on its own terms rather than by
  switching integrity checking off.
- **Residual risk, stated honestly:** if a *compensation* also fails, the merge is left partially
  applied. That is logged as `INCONSISTENT STATE` for manual reconciliation. Making recovery
  automatic requires the transactional outbox (WO-2.1), which turns these best-effort HTTP calls
  into durable retryable messages. This is a genuine limit of the current design, not an oversight.
- **Covered by tests:** happy path, downstream failure mid-saga (rollback verified), first-service
  failure (no partial application), and already-merged no-op.

---

## 3. analytics-service → six schemas (reads) ✅

`booking.bookings`, `booking.sessions`, `booking.session_participants`, `coaching.lesson_sessions`,
`comms.message_log`, `membership.membership_plans`, `membership.memberships`, `payment.payments`,
`people.persons`.

Verified **read-only** — grep for `INSERT INTO|UPDATE|DELETE FROM` against non-`analytics` schemas
returns nothing. This is the *sanctioned* read-only reporting exception in
`architecture-principles.md`, and it is behaving as documented.

It is still a regionalization constraint, but a benign one: analytics reads only data that is
co-regional with it by definition (a region's analytics reads that region's data). No change needed
in Phase 1; revisit only when cross-region global reporting is designed (Phase 3 / post-6-months).

## 3a. Services verified clean

comms-service, integration-service, template-service matched only on **event names**
(`booking.confirmed`, `membership.expired`, …), not schema access. venue, coaching, membership,
payment, competition, team, order, admin, entitlement services: no cross-schema access at all.

---

## 4. Live bug found: booking reminders never sent — ✅ FIXED 2026-07-29 🐛

`bookings.repository.ts` `findDueReminders` read:

```sql
LEFT JOIN people.people p ON p.id = b.customer_id
```

`people.people` does not exist — people-service maps its model to `persons`, and every other booking
query used `people.persons` correctly. (The name was plausible because the orphaned `identity.people`
table really did exist once; see §5.)

Impact: the query threw `relation "people.people" does not exist` on every execution. The caller,
`booking-reminder.task.ts`, awaited it **outside** its `try/catch`, so the hourly `@Cron` rejected
before doing any work. **No booking reminder had ever been sent**, and the failure was near-silent —
an unhandled rejection with no alert.

**Fixed:** the join now targets `people.persons`; the task catches lookup failures and logs them, so
a future breakage is visible instead of invisible; and `test/booking-reminders.integration.spec.ts`
guards it — validated by reintroducing the typo (4 of its 5 tests fail with the bug present).

**Also hardened while here:** the interim joins were tenant-qualified. Those joins have since been
removed; reminder rows are grouped by tenant and hydrated through authenticated People and Venue
APIs, so the original cross-tenant resolution path no longer exists.

---

## 5. Cross-schema foreign keys — present in the database, absent from the repo ⚠️

**Correction to an earlier version of this document.** A first pass concluded "no cross-schema FKs"
on the strength of grepping the migration files. That was wrong: querying `pg_constraint` on the
live database found four, **none of which appear in any migration**. They were applied by hand.
Any audit of this platform's schema that reads only `prisma/migrations/` will draw false conclusions.

| Constraint | Child | Parent | Status |
|---|---|---|---|
| `memberships_customer_fk` | `membership.memberships` | `people.persons` | ✅ Dropped — `20260729_drop_cross_schema_customer_fk` |
| `membership_participants_person_fk` | `membership.membership_participants` | `identity.people` | ✅ Dropped — `20260804010000_drop_legacy_and_orphan_fks` |
| `customers_person_fk` | `crm.customers` | `identity.people` | Remains — both ends are orphaned schemas; goes with MR-8 |
| `customers_household_fk` | `crm.customers` | `identity.households` | Remains — both ends are orphaned schemas; goes with MR-8 |

**Status as of 2026-08-04: no service schema has a cross-schema foreign key.** A full
`pg_constraint` comparison of live against a database built only from the migrations shows an
identical set of 98 foreign keys across the 14 service schemas, and none of them crosses a schema
boundary. The only two left on the platform sit entirely between the orphaned `crm` and `identity`
schemas and disappear when those are dropped (MR-8).

`memberships_customer_fk` was the true reason the customer merge ran with
`session_replication_role = replica`: re-pointing `people.persons.id` tripped a constraint owned by
*membership's* table. A database-level FK between two services' schemas is the hardest form of the
shared-database coupling — it makes separate regional databases physically impossible — so it is
dropped rather than worked around. Integrity across that boundary is now a contract (the idempotent,
compensated reassign API), which is the standard and unavoidable trade when a system distributes.

**Also found: three orphaned schemas.** `identity` (`people`, `households`, `household_members`,
`person_relationships`), `crm` (`customers`) and `customer` (`customers`, `households`,
`household_members`, `lifecycle_history`, `person_relationships`, `person_roles`, `person_tags`,
`tags`) are all empty and referenced by no code — leftovers from the rename in
`0007_rename_schema_customer_to_people`. They are harmless but they are why the reminder bug in §4
looked plausible (`identity.people` really did exist once). Between them they still hold 16 foreign
keys, which is every remaining cross-schema key on the platform. Dropping them is a separate,
deliberate cleanup — deleting schemas is destructive and is **not** part of this work.

---

## 6. What this means for the plan

**Confirmed:** the ADR's core judgement holds. The hot paths (B3, B4, A1, A2, P1) are exactly the
availability/pricing/create paths, and they justify a booking-owned projection rather than
synchronous API calls — an API hop per availability cell would be untenable.

**Done:** WO-1.0a (§1a, §4) and WO-1.2(b) (§2) — see the backlog for the record.

**Still open:**

1. **Activate WO-1.1** — the Venue/Coaching projection code is complete, but its additive
   migrations have not been applied and the read switches still default to `legacy`. The projection
   scope is: resources (`id`, `name`,
   `group_id`, `has_lighting`), bookable_units (`id`, `name`, `resource_id`, `venue_id`,
   `is_active`, `tenant_id`), venues (`id`, `name`), unit_conflicts (`unit_id`,
   `conflicting_unit_id`) and coaching occupancy (`id`, `bookable_unit_id`, `starts_at`,
   `ends_at`, `status`, `tenant_id`).
2. **After migration:** backfill and reconcile per tenant, run `shadow`, cut over to `projection`,
   observe lag/failures, then remove the five legacy SQL fallbacks (B3, B4, A1, A2 and P1).

**Progress 2026-08-24:** B5 is closed. `BookingsService.getStats` now obtains the active
bookable-unit denominator from a narrow, tenant-scoped, internal-secret-protected Venue API.
Display hydration still degrades to blank labels, but the capacity lookup deliberately fails with
503 when Venue is unavailable because substituting zero would produce a plausible but incorrect
utilisation result. On 2026-08-25, source inspection confirmed that only the five hot-path
Venue/Coaching compatibility reads B3, B4, A1, A2 and P1 remain in Booking runtime SQL.

### Known residuals from the §2 saga

- **Not every `customer_id` holder is in the merge fan-out.** `CustomersService.rehomeTargets` lists
  booking and membership. `coaching-service` and `payment-service` also carry `customer_id` as a
  soft cross-service reference, so after a merge those rows still point at the old id. This gap
  predates the change (the old SQL didn't update them either) — but it is now an explicit,
  enumerable list, so it should be closed deliberately rather than left implicit.
- **The orchestrator list runs the wrong way.** Every future service storing a customer id needs a
  code change *in people-service*. When WO-2.1 lands, invert this: publish `person.merged` once and
  let each owner subscribe. That also removes the availability coupling from the create path.
- **Compensation is best-effort.** If a rollback itself fails, the merge is left partially applied
  and logged as `INCONSISTENT STATE`. Those log lines are not currently alertable, and there is no
  reconciliation sweep for `customer_id`s with no matching person — worth adding now that the FK no
  longer provides that backstop.
