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

### WO-1.0 — Inventory & classify every cross-schema read 🟢 (S)
- **Scope:** produce the authoritative list of booking-service reads into `venue.*`, `people.*`,
  `auth.*`, `coaching.*`; classify each as **hot-path** (needs a local read-model) vs
  **occasional** (can be a synchronous API call).
- **Known sites (from the readiness review — verify + extend):**
  `bookings.repository.ts:137-141,203-207,237,246,604,827,918-920` (venue.venues, venue.resources,
  venue.bookable_units, people.persons, auth.users); `availability.repository.ts:96`
  (coaching.lesson_sessions), `:128` (venue.unit_conflicts); `pricing.repository.ts:119`
  (venue.resources); `booking-series.repository.ts:158` (people.persons).
- **Acceptance:** a table of every site → owning service → chosen strategy (API vs projection),
  reviewed by `@architecture-reviewer`. No code change yet.
- **Deps:** none. **Do this first.**

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

### WO-1.2 — People/auth reads via API (or projection) 🟡 (M)
- **Scope:** replace `people.persons` / `auth.users` JOINs in `bookings.repository.ts` and
  `booking-series.repository.ts` with people-service API calls, or a minimal person read-model if
  they're hot enough (decide in WO-1.0).
- **Acceptance:** no `people.*` / `auth.*` in booking SQL; booking + series tests green.
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

1. **Wave A (parallelisable):** WO-1.0, WO-5.1, WO-2.1 — inventory, tracing, outbox. No infra deps.
2. **Wave B:** WO-1.1 → WO-1.2 → WO-1.3 (the decouple, in order); WO-3.1 alongside.
3. **Wave C (needs Azure):** WO-2.2, WO-3.2, WO-4.1.

When you say "pick up Phase 1", I start Wave A. Each WO is one focused change → `/review` → commit,
with a checkpoint back to you at every 🟡 decision and before every 🔴 infra step.
