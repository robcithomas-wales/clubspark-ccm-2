# Multi-Region Readiness — Required Actions

> **Status:** Active · **Created:** 2026-07-31
> **Question it answers:** what is still required before this platform can run in EU/US/AU?
> **Parent:** [`pilot-to-production.md`](pilot-to-production.md) · **ADR:** [`../architecture/scalability-and-multi-region.md`](../architecture/scalability-and-multi-region.md)

Every item below is verified against the code and the live database, not inferred. Counts are real
`grep`/`pg_catalog` results as of 2026-07-31.

## Already cleared

- **Cross-service *writes*** — people-service no longer writes `booking.*` / `membership.*`. Replaced
  by a compensating saga. This was the one item with no workaround: a distributed transaction cannot
  span regional databases.
- **Cross-schema foreign key** `membership.memberships → people.persons` — dropped. A DB-level FK
  between two services physically prevents separate regional databases.
- **The repository can build its own database.** Six services previously had no migrations at all;
  a new regional database was impossible to create. Now verified from empty on every PR by CI.
- **Schema drift is a blocking gate** for 11 of 14 services.

## The verdict today

**Not fit.** The keystone is untouched: booking-service still reads three other services' schemas
directly. A single SQL query spanning `venue.*`, `people.*` and `coaching.*` cannot execute once
those schemas live in separate regional databases.

---

## MR-1 — Booking stops reading `people.*` and `auth.*` 🔴 BLOCKING

**Why first:** it is the smallest of the blocking reads, and it removes the `auth.users` dependency —
which blocks **Azure**, not just regions. `auth.users` is Supabase-owned and does not exist on Azure
Database for PostgreSQL, so booking-service cannot currently run on the target platform at all.
It is currently papered over by a shim in `scripts/sql/000_shared_bootstrap.sql`.

**Exact sites (7):**

| File | Line | Reads |
|---|---|---|
| `bookings.repository.ts` | 137, 138 | `people.persons`, `auth.users` (list) |
| `bookings.repository.ts` | 203, 204 | `people.persons`, `auth.users` (detail) |
| `bookings.repository.ts` | 848 | `people.persons` (top-customers report) |
| `bookings.repository.ts` | 942 | `people.persons` (reminder cron) |
| `booking-series.repository.ts` | 158 | `people.persons` (series detail) |

All seven read the same handful of display fields: first name, last name, email, phone.

**Approach:** people-service gains a **batch lookup** (it has none today — only `GET /people/:id`),
booking hydrates display fields after its own query. Batch, not per-row: the list endpoint is
paginated and an N+1 would be untenable.

**Acceptance:** no `people.*` or `auth.*` in booking SQL; the `auth.users` shim deleted from the
bootstrap; booking + series suites green; a from-scratch CI database no longer needs an auth schema.

## MR-2 — Transactional outbox 🔴 BLOCKING

7 fire-and-forget `void eventBus.publish(...)` sites; events can vanish silently. Once services are
decoupled, async messaging **is** the consistency mechanism, and MR-3's projections depend on it.

**Acceptance:** killing a subscriber mid-flow loses zero events.

## MR-3 — Booking stops reading `venue.*` 🔴 BLOCKING

13 sites: `venue.resources` (5), `venue.bookable_units` (4), `venue.venues` (3),
`venue.unit_conflicts` (1). These are the **hot paths** — availability, pricing, booking creation.

**Approach:** a booking-owned projection maintained from venue events, not synchronous API calls —
an API hop per availability cell is untenable. Depends on MR-2 for reliable updates.

## MR-4 — Booking stops reading `coaching.*` 🔴 BLOCKING

2 sites: `coaching.lesson_sessions` in the availability conflict check. Same projection approach as
MR-3.

## MR-5 — Tenant → region as a first-class concept 🔴 BLOCKING

No `home_region` exists anywhere. Add it to the tenant registry **now, with one region**, and resolve
tenant context through it everywhere.

**Why now:** cheapest item on this list today and one of the most expensive later — it touches every
request path. With one region every tenant simply resolves to the same value.

## MR-6 — Cron leader election 🟠

10 scheduled jobs across 6 services, all unguarded — they fire on **every** replica. Until fixed the
platform cannot run more than one replica of anything without duplicate charges, emails and
reminders. Not strictly a *region* blocker, but "production-ready" and "single replica only" are
incompatible.

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

1. **MR-1** — smallest blocking read, and the only item that unblocks **Azure** itself.
2. **MR-2** — the consistency mechanism MR-3/MR-4 rely on.
3. **MR-3 → MR-4** — the hot-path projections.
4. **MR-5 / MR-6 / MR-7** — parallelisable once the above are moving.
5. **MR-8** — opportunistic.

## Honest caveat

Code-level couplings here are verified by `grep`, and schema-level ones against the live database.
What has **not** been re-verified is the broader claim that everything else is region-portable — no
hidden single-region calls outside the auth path. That came from the original readiness review, and
that review has since been wrong twice. Treat it as unconfirmed until MR-1 and MR-3 force the
remaining assumptions into the open.
