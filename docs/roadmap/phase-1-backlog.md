# Phase 1 — Executable Backlog

> **Status:** Ready to execute
> **Parent:** [`pilot-to-production.md`](pilot-to-production.md) · **ADR:** [`../architecture/scalability-and-multi-region.md`](../architecture/scalability-and-multi-region.md)

Phase 1 broken into discrete, reviewable **work orders (WO)**. Each is self-contained: scope,
files, approach, acceptance, review gates, dependencies, and whether it **needs your input**.
Execute in the dependency order below — WO-1.x (decouple the shared DB) unblocks everything else.

**Legend:** 🟢 I can do solo · 🟡 I do it, but a decision/input is needed first · 🔴 needs infra
access (Azure creds) — I produce the code/IaC, you apply.

**Every WO ends the same way:** run the affected suites pool-safe (`/service-test`), then
`/review` (dispatches the right reviewer agents), block on any High, then a focused commit.

---

## §1 — Decouple the shared database (KEYSTONE)

**Why first:** regionalization is impossible while `booking-service` JOINs other services' schemas
in one physical DB. Until these are gone, no per-service or per-region database split is possible.

### WO-1.0 — Inventory & classify every cross-schema read ✅ **DONE** (2026-07-29)
- **Deliverable:** [`../architecture/cross-schema-coupling-inventory.md`](../architecture/cross-schema-coupling-inventory.md)
  — every site → owning service → hot/occasional → chosen strategy. 11 booking read sites, 1
  people-service **write** site, analytics verified as the sanctioned read-only exception, 10
  services verified clean.
- **Outstanding:** `@architecture-reviewer` sign-off on the inventory (gate before WO-1.1).
- **Two findings that changed this backlog** (see §0 and §5 of the inventory):
  - people-service **writes** into `booking.*` and `membership.*` in one distributed transaction
    (`customers.repository.ts:59-84`) — not in the original review. WO-1.2 resized accordingly.
  - `findDueReminders` joins the non-existent `people.people` → the hourly reminder cron has never
    run successfully. Split out as WO-1.0a.

### WO-1.0a — Two safe cleanups, no dependencies ✅ **DONE** (2026-07-29)
- **(a) Reminder cron fixed.** `people.people` → `people.persons` in
  `bookings.repository.ts:918`. Also hardened `booking-reminder.task.ts`: the lookup was awaited
  *outside* the try/catch, so any query failure became a silent unhandled rejection — it is now
  caught and logged, so a future breakage is visible rather than invisible.
- **(b) Dead venue models removed** from `booking-service/prisma/schema.prisma`; datasource now
  declares `schemas = ["booking"]`. A comment records *why* they must not come back: with the
  models present and `"venue"` in the schemas list, a later removal would make `prisma migrate`
  emit `DROP TABLE` against venue-service's real tables.
- **Verified:** booking-service **157/157 tests green**; build clean (proving nothing used the
  deleted models); no new lint errors. The new
  `test/booking-reminders.integration.spec.ts` was validated by reintroducing the typo — 4 of its
  5 tests fail with the bug present and pass without it, so it genuinely guards the regression.
- **Deps:** none.

### WO-1.1 — Venue read-model projection for availability/pricing hot paths 🟡 (L)
- **Scope:** replace hot-path `venue.*` JOINs with a booking-owned projection (resources,
  bookable_units, unit_conflicts) kept current from venue events.
- **Decision needed:** projection (eventually-consistent copy) vs synchronous venue API calls for
  availability. Recommendation: **projection** for availability (latency + resilience); API calls
  for rare admin reads. Confirm before building.
- **Approach:** define the projection schema in `booking`'s own schema; populate via venue domain
  events (depends on WO-2.x for reliable delivery, or a one-off backfill + polling until then);
  swap `availability.repository.ts` / `pricing.repository.ts` reads to the projection.
- **Acceptance:** availability & pricing queries touch only `booking.*`; grep shows no `venue.*` in
  booking SQL for these paths; availability integration tests green.
- **Deps:** WO-1.0. Reliable projection updates strengthen once WO-2.1 lands.

### WO-1.2 — People/auth reads via API + kill the cross-service *write* 🟡 (L)
- **Resized S→M→L by WO-1.0:** this is no longer only about booking's reads.

**Scope (b) — the cross-service write ✅ DONE (2026-07-29).** The harder half, done first because
it is the one item with no "amend the invariant" escape hatch.
  - booking + membership each own `POST /{bookings,memberships}/internal/reassign-customer`
    (unversioned — neither service serves `/v1` on these controllers), `@SkipTenant()` + gated by a
    fail-closed `InternalSecretGuard`; idempotent and reversible.
  - `CustomersService.rehome` is now a compensating saga; `session_replication_role` is gone.
  - people's own child FKs got `ON UPDATE CASCADE` (`20260729_person_fk_on_update_cascade`).
  - **`memberships_customer_fk` dropped** (`20260729_drop_cross_schema_customer_fk`) — a real
    cross-schema FK that existed only in the live DB, never in a migration. See §5 of the inventory.

**Review findings fixed before commit** (`@service-reviewer`, `@security-reviewer`,
`@architecture-reviewer` — all three independently caught the first two):
  - **Blocker:** internal calls carried no JWT, so the `APP_GUARD` tenant guard 401'd them outside
    test/dev — the saga was dev-only. Now `@SkipTenant()` + internal secret as sole authenticator.
  - **Blocker:** the caller used a `/v1` prefix neither service serves — every call 404'd. (Same
    latent bug found in the pre-existing `getFinancialProfile` fetches, which were silently
    returning zero spend for every customer. Fixed too.)
  - **High:** `InternalSecretGuard` allowed all requests when `NODE_ENV=development` — which is what
    `run-all.sh` exports — leaving a bulk-mutation endpoint unauthenticated on every dev machine.
    Now fail-closed except under test, constant-time compare, `INTERNAL_SECRET` documented in all
    three `.env.example` files (membership and people had none at all).
  - **High:** compensation only replayed *confirmed* successes, so a call that failed after
    committing remotely was never undone — a dangling reference with no FK left to catch it. Now
    compensates every *attempted* target.
  - **Medium:** cross-tenant PII leak — the reminder join wasn't tenant-qualified, so the newly-live
    cron could email another tenant's person. All three joins now qualified.
  - **Medium:** membership-service had no global `ValidationPipe`, so its DTO decorators were inert
    in production. Added.
  - **Medium:** downstream error bodies were relayed to the API caller, as a 500. Now a generic
    `BadGatewayException`, detail logged server-side.
  - **Medium:** no timeout on the internal `fetch` — a wedged downstream would hang a merge
    indefinitely mid-flight. Now 10s.
  - Plus: org-scope of the merge made explicit and tested, `INTERNAL_SECRET` via `ConfigService`,
    dead `TENANT_HEADER` constant removed, guard-enforcement tests added (the enforcement branch had
    zero coverage), and one saga test that passed for the wrong reason corrected.

**Scope (a) — reads (outstanding).** Replace `people.persons` / `auth.users` JOINs in
`bookings.repository.ts` (B1, B2, B6) and `booking-series.repository.ts` (S1) with a batch API
hydrate against people-service, or a minimal person read-model (display fields only).
- **Acceptance:** no `people.*` / `auth.*` in booking SQL; booking + series suites green.
- **Review gates:** `@architecture-reviewer` **and** `@security-reviewer`.
- **Deps:** WO-1.0.

### WO-1.3 — Coaching read + restore the invariant 🟢 (S–M)
- **Scope:** the `coaching.lesson_sessions` read in `availability.repository.ts:96` is the one
  *documented* exception — confirm it should be an API call/projection too, apply, then update
  `architecture-principles.md` #1/#3 so the docs match reality (the "doc honesty" fix from Phase 0
  lands here for real).
- **Acceptance:** `@architecture-reviewer`'s `check`-style pass confirms sole-writer holds for
  booking; invariants #1/#3 accurate again.
- **Deps:** WO-1.1, WO-1.2.

## §2 — Reliable eventing (transactional outbox + Service Bus)

### WO-2.1 — Transactional outbox in publishers 🟢 (L)
- **Scope:** replace `void eventBus.publish(...)` + swallowed errors with an **outbox**: write the
  event row in the **same DB transaction** as the state change, in booking/payment/membership
  (call sites: `bookings.service.ts:175,287`, `webhooks.service.ts:108,125,141`,
  `memberships.service.ts:267,280`).
- **Acceptance:** killing the subscriber mid-flow loses **zero** events; the event row persists and
  is retried. Unit + integration tests for the outbox relay.
- **Deps:** independent of §1, but §1's projections consume these events — sequence §2.1 early.

### WO-2.2 — Azure Service Bus transport + idempotent consumers 🟡🔴 (L)
- **Scope:** relay outbox → Service Bus; consumers (comms/people/integration inbound, plus booking
  projections) become subscribers; enforce idempotency + dead-letter. Keep the HTTP inbound path
  for local/pilot behind config.
- **Needs:** Service Bus namespace provisioned (🔴 — I write the IaC + client, you provision).
- **Acceptance:** end-to-end delivery with retry + DLQ; a poisoned message lands in DLQ, not lost.
- **Deps:** WO-2.1.

## §3 — Caching + real read/write split

### WO-3.1 — Wire the (currently dead) read replica 🟢 (S–M)
- **Scope:** `prisma.service.ts` sets `read === write`; `readUrl`/`DATABASE_READ_URL` is used only
  in template-service. Wire `this.read` to the replica across services; route read queries to it.
  Revisit `connection_limit=1` for AKS replica counts.
- **Acceptance:** reads demonstrably hit the replica; connection budget validated.
- **Deps:** none (but pairs with WO-3.2).

### WO-3.2 — Redis cache for hot reads 🟡🔴 (M)
- **Scope:** introduce Azure Cache for Redis; cache availability, entitlements, pricing, session
  lookups with sensible TTL/invalidation (invalidate from the same events in §2).
- **Needs:** Redis instance provisioned (🔴). Cache-key/invalidation design (🟡 — I'll propose).
- **Acceptance:** p95 read latency + DB load improvement measured under WO-4-style load.
- **Deps:** WO-2.1 (for event-driven invalidation) preferred, not strictly required.

## §4 — Fix horizontal-scaling correctness

### WO-4.1 — Stop `@Cron` jobs multi-firing 🟢 (M)
- **Scope:** analytics (scoring/anomaly/forecast), booking (expiry/reminder), membership (expiry),
  integration (webhook worker) crons fire on every replica. Add leader election / a distributed
  lock (Redis-based once WO-3.2 exists) or externalize to a single scheduler.
- **Acceptance:** at N>1 replicas each job runs exactly once (verified with a run-once assertion /
  lock test).
- **Deps:** can use Redis from WO-3.2 for the lock; otherwise a DB advisory lock in the interim.

## §5 — Observability

### WO-5.1 — Tracing + correlation IDs 🟢 (M)
- **Scope:** OpenTelemetry + a request-ID interceptor in each service's `common/`, propagated on
  every inter-service call and event; export to Azure Monitor / App Insights; structured logs carry
  the trace/correlation id.
- **Acceptance:** a single request is traceable across services end-to-end in App Insights.
- **Needs:** App Insights resource (🔴 to export; 🟢 to instrument).
- **Deps:** none — can start immediately in parallel with §1.

---

## Suggested execution waves

1. **Wave A (parallelisable):** ~~WO-1.0~~ ✅, ~~WO-1.0a~~ ✅, **WO-5.1**, **WO-2.1** — tracing and
   outbox remain. No infra deps, no decisions.
2. **Wave B:** WO-1.1 → WO-1.2 → WO-1.3 (the decouple, in order); WO-3.1 alongside.
3. **Wave C (needs Azure):** WO-2.2, WO-3.2, WO-4.1.

Each WO is one focused change → `/review` → commit, with a checkpoint back to you at every 🟡
decision and before every 🔴 infra step.

## Migrations — applied ✅ (2026-07-29)

Both DDL migrations were applied to the shared Supabase database and verified against
`pg_constraint`:

- `memberships_customer_fk` (membership.memberships → people.persons) — **dropped**, plus
  `idx_memberships_customer_id` created to keep the lookup fast.
- `person_activities_person_id_fkey` and `segment_memberships_person_id_fkey` — now
  **ON UPDATE CASCADE**.

Three cross-schema FKs remain, all on empty legacy tables with no code references
(`crm.customers` ×2 and `membership.membership_participants`, all → the orphaned `identity` schema).
Harmless; dropping the dead `identity`/`crm` schemas is a separate, deliberate cleanup.

Note for future migrations — **corrected 2026-08-12.** The earlier note here claimed the platform
shared a single `public._prisma_migrations` table, and concluded that per-service
`prisma migrate deploy` was unreliable so SQL should be applied directly. Both halves were wrong,
and the advice was dangerous.

Checked against the live database: there is **no** `public._prisma_migrations`. Each service owns
its own, in its own schema (`venue._prisma_migrations`, `commerce._prisma_migrations`, and so on —
14 in total; `template-service` has no migrations). The design in CLAUDE.md was right all along.

`scripts/migrate-all.sh` was already correct: it reads `schemas =` out of each
`schema.prisma` and pins `?schema=` per service on both URLs, so `migrate deploy` through that
script has always been reliable. `check-migration-drift.sh` does the same. There was nothing to
work around.

What *was* missing is a read-only equivalent, so engineers reached for `npx prisma migrate
status` inside a service directory — which failed, because `DIRECT_DATABASE_URL` was undefined
(`P1012`). That is now `npm run migrate:status`, which derives the session URL and the schema pin
the same way. All 14 report up to date.

Do not apply SQL directly, and do not put `DIRECT_DATABASE_URL` in a `.env`: use the scripts.

**Next up:** WO-2.1 (transactional outbox) or WO-5.1 (tracing) — both 🟢, no decisions, no infra.
Wave B (the actual decouple) proceeds on the WO-1.0 recommendation: **projection** for the hot
paths (B3, B4, A1, A2, P1), API hydrate for the occasional ones (B5, B6, S1).
