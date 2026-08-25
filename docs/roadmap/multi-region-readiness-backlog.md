# Multi-Region Readiness — Required Actions

> **Status:** Active · **Created:** 2026-07-31 · **Updated:** 2026-08-25
> **Question it answers:** what is still required before this platform can run in EU/US/AU?
> **Parent:** [`pilot-to-production.md`](pilot-to-production.md) · **ADR:** [`../architecture/scalability-and-multi-region.md`](../architecture/scalability-and-multi-region.md)

The original counts were verified against the code and live database on 2026-07-31. Current status
was re-verified against repository code on 2026-08-25; newly committed migrations have not yet been
replayed in an environment.

## Already cleared

- **Cross-service _writes_** — people-service no longer writes `booking.*` / `membership.*`. Replaced
  by a compensating saga. This was the one item with no workaround: a distributed transaction cannot
  span regional databases.
- **Cross-schema foreign key** `membership.memberships → people.persons` — dropped. A DB-level FK
  between two services physically prevents separate regional databases.
- **The repository can build its own database.** Six services previously had no migrations at all;
  a new regional database was impossible to create. Now verified from empty on every PR by CI.
- **Schema drift is a blocking gate** for all 14 services; `KNOWN_DRIFT` is empty.

## The verdict today

**Not yet fit, but the keystone implementation exists.** Booking no longer reads `people.*` or
`auth.*`. Five tenant-scoped Venue/Coaching compatibility reads remain because the new Booking-owned
projections default to `legacy` until their migrations, per-tenant backfill, reconciliation and
shadow comparison have run. A regional split remains blocked until those fallbacks are removed.

---

## MR-1 — Booking stops reading `people.*` and `auth.*` ✅ DONE IN CODE

**Why first:** it is the smallest of the blocking reads, and it removes the `auth.users` dependency —
which blocks **Azure**, not just regions. `auth.users` is Supabase-owned and does not exist on Azure
Database for PostgreSQL, so booking-service cannot currently run on the target platform at all.
It is currently papered over by a shim in `scripts/sql/000_shared_bootstrap.sql`.

**Exact sites (7):**

| File                           | Line     | Reads                                   |
| ------------------------------ | -------- | --------------------------------------- |
| `bookings.repository.ts`       | 137, 138 | `people.persons`, `auth.users` (list)   |
| `bookings.repository.ts`       | 203, 204 | `people.persons`, `auth.users` (detail) |
| `bookings.repository.ts`       | 848      | `people.persons` (top-customers report) |
| `bookings.repository.ts`       | 942      | `people.persons` (reminder cron)        |
| `booking-series.repository.ts` | 158      | `people.persons` (series detail)        |

All seven read the same handful of display fields: first name, last name, email, phone.

**Approach:** people-service gains a **batch lookup** (it has none today — only `GET /people/:id`),
booking hydrates display fields after its own query. Batch, not per-row: the list endpoint is
paginated and an N+1 would be untenable.

**Completed:** Booking and series repositories no longer query `people.*` or `auth.*`; display data
is batch-hydrated through the tenant-scoped People API. Remove the obsolete bootstrap auth shim when
the next empty-database migration replay confirms no remaining dependency.

## MR-2 — Transactional outbox 🟠 PARTIAL

Strict transactional outboxes now cover the critical implemented flows in Booking, Membership,
Payment and Order; Venue and Coaching also persist projection events transactionally. Comms,
Integration and People have durable inbox claims for covered consumers. Remaining work is a full
publisher/consumer classification, external metrics and alerting, operator replay evidence and the
Azure Service Bus transport.

**Acceptance:** killing a subscriber mid-flow loses zero events.

## MR-3 — Booking stops reading `venue.*` 🟠 CODE COMPLETE, ACTIVATION BLOCKING

Display and reporting reads have moved to Venue APIs. Four hot-path compatibility queries remain:
bookable-unit validation, resource-group lookup, lighting and unit conflicts.

**Implemented:** a Booking-owned projection maintained from versioned Venue outbox events, with a
tenant snapshot, idempotent/out-of-order consumer, reconciliation and
`BOOKING_VENUE_PROJECTION_MODE`. Apply migrations, backfill/reconcile, run shadow comparisons, cut
over and then delete the legacy SQL.

## MR-4 — Booking stops reading `coaching.*` 🟠 CODE COMPLETE, ACTIVATION BLOCKING

One compatibility query to `coaching.lesson_sessions` remains in the availability conflict check.
The source outbox, occupancy snapshot, Booking projection, idempotent consumer, reconciliation and
`BOOKING_COACHING_PROJECTION_MODE` are implemented. Activation follows the same sequence as MR-3.

## MR-5 — Tenant → region as a first-class concept ✅ DONE 2026-08-05

`admin.organisations.home_region` is NOT NULL and every request carries `tenantContext.region`,
resolved from `CLUBSPARK_REGION` in `@clubspark/auth`. A service that cannot determine its region
refuses to start; a token claiming a different home region is refused with 403.

**Still open, and it belongs with this item:** the tenant registry is split across
`admin.organisations` and `venue.organisations`. Routing must read one authoritative registry that
sits _outside_ every region — resolving "which region?" cannot itself require knowing the region.
venue-service already upserts into admin, so the flow exists; it just is not declared or enforced.
See [`../architecture/data-classification.md`](../architecture/data-classification.md).

## MR-6 — Scheduled-job concurrency 🟠 HARDENED; PROOF/METRICS OPEN

Scheduled work is catalogued in
[`../architecture/scheduled-job-safety.md`](../architecture/scheduled-job-safety.md). Queue workers
use atomic row claims/leases, singleton batches use database-time conditional leases, and outbox
relays use row locking. Two-runner concurrency tests and job duration/skipped/failure/stale-work
metrics are still required before multi-replica production approval.

## MR-7 — Identity decision 🔴 BLOCKING (decision) / 🟠 (execution)

Auth is Supabase JWKS — single-region by construction. **Decide** on Microsoft Entra External ID;
execution can follow, but the decision shapes every auth touchpoint.

✅ **The execution cost is now much lower.** Auth was extracted into
[`packages/auth`](../../packages/auth/README.md) on 2026-08-04: fifteen copies of the tenant
guard (six divergent variants) collapsed into one, and provider choice is a single call —
`supabaseAuth()` or `entraAuth({...})` — in each service's `app.module.ts`. Nothing else in the
codebase knows which provider issued the token.

⚠️ The remaining work is **not** in our code: Entra does not emit `tenantId` / `organisationId`
by default. They need optional claims / a claims-mapping policy on the app registration. Until
that exists every request fails with "Token is missing tenantId claim".

## MR-8 — Residual cleanups 🟢

- ~~3 services in `KNOWN_DRIFT`~~ ✅ **Done 2026-08-04.** The 15 missing foreign keys were added, all
  14 services are clean, and the allowlist is empty.
- **3 orphaned schemas** (`identity`, `crm`, `customer` — 13 empty, unreferenced tables). These now
  hold the platform's **only remaining cross-schema foreign keys — 16 of them**, all internal to the
  three dead schemas plus two `crm -> identity` keys. Every service schema is clean. Dropping the
  schemas removes all 16 at once.
  ⚠️ No service owns these schemas, so the drop has nowhere natural to live — it belongs in
  `scripts/sql/` alongside the shared bootstrap, not in a service's migrations. That ownership
  question is the only reason this is still open; the SQL itself is three `DROP SCHEMA ... CASCADE`
  statements against empty tables.
- **`public._prisma_migrations_pre_20260731`** — the retired shared migrations table.

---

## Order and why

1. **Activate MR-3/MR-4** — migrate, backfill, reconcile, shadow, cut over, observe and remove the
   five legacy SQL reads.
2. **Finish MR-2/MR-6 evidence** — event inventory, metrics/alerts/replay, and two-runner job tests.
3. **MR-7** — make and execute the regional identity decision.
4. **MR-5 global registry/routing and MR-8 cleanup** — complete before region two activation.

## Honest caveat

Code-level couplings here are verified by `grep`, and schema-level ones against the live database.
What has **not** been re-verified is the broader claim that everything else is region-portable — no
hidden single-region calls outside the auth path. That came from the original readiness review, and
that review has since been wrong twice. Treat it as unconfirmed until MR-1 and MR-3 force the
remaining assumptions into the open.
