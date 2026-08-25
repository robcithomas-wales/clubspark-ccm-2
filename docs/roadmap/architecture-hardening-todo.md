# Architecture hardening execution TODO

> **Status:** Active
> **Updated:** 25 August 2026 (post-review)
> **Purpose:** Ordered development queue for making the pilot safe to scale and separate by region.
> **Inputs:** [Pilot-to-production roadmap](pilot-to-production.md),
> [coupling inventory](../architecture/cross-schema-coupling-inventory.md), and
> [CPO decisions](../decisions/2026-08-24-cpo-product-architecture-decisions.md).

This is the working order for engineering. Product-model decisions are listed separately and must
not prevent work on the unblocked architecture queue. A checkbox is only completed when code,
tests, documentation, rollout and rollback evidence exist.

## Completed foundation

- [x] CI builds services, tests shared packages, applies migrations to an empty database and runs
      service integration suites.
- [x] Cross-service writes from People into Booking and Membership removed.
- [x] Cross-schema service foreign keys and `session_replication_role` bypass removed.
- [x] Region added to request context and tenant registry.
- [x] Transactional outbox implemented in Booking, Membership and Payment.
- [x] Booking display hydration moved from People/Venue SQL joins to authenticated service APIs.
- [x] Booking utilisation capacity moved from a Venue schema query to an authenticated Venue API.

## P0 — security findings raised in review (pre-existing, not from this work)

Both surfaced while reviewing the hardening branch on 25 August 2026. Neither is introduced by it;
both concern the internal cross-tenant admin plane and want their own change.

- [ ] **The internal staff portal authorises any authenticated Supabase user.**
      `internal-portal/middleware.ts` checks only that a session exists. All portals share one
      Supabase project and `venue-service` exposes unauthenticated self-registration
      (`POST organisations/public/register`), so a self-service customer account can sign in and
      reach every route that forwards `INTERNAL_SECRET` to admin-service: list and mutate any
      organisation, flip any tenant's feature flags, read the platform audit log, and start an
      impersonation session against any tenant. Needs an explicit staff claim, checked in the
      middleware **and** re-checked in each route handler before the secret is attached. Requires a
      decision on what marks a staff user (Supabase `app_metadata` role, directory group, allowlist).
- [ ] **`admin-service` carries a local fork of the internal guard.**
      `services/admin-service/src/internal/guards/internal.guard.ts` compares the secret with `===`
      rather than the shared guard's constant-time compare, and trusts `x-staff-id` / `x-staff-email`
      unverified — so audit entries are attributable to whatever the caller claims. Replace with
      `InternalSecretGuard` from `@clubspark/auth` and derive staff identity from a verified token.

## P0 — work through next

### 1. Finish the Booking-owned Venue and Coaching projection

Goal: remove the five remaining hot-path cross-schema reads from Booking.

- [x] Write the projection delivery contract and event-versioning rules.
- [x] Add Booking-owned projection tables for:
  - venue resource identity, venue, group, active state and lighting;
  - bookable-unit identity, resource, venue, type and active state;
  - unit-conflict relationships;
  - coaching-session occupancy by unit and time range.
- [x] Add migrations, tenant indexes, compatibility and rollback notes.
- [x] Add transactional outbox support to Venue and Coaching for the projection events they own.
- [x] Publish versioned create/update/deactivate/delete events from Venue (for currently exposed
      mutation paths; bookable-unit deletion is not exposed today). Includes resource-group deletion,
      which sets `resources.group_id` to NULL through the foreign key: it now emits a resource event
      per affected row, because the database-side change bumps no `updated_at` for a later resync to
      notice.
- [x] Publish versioned scheduled/rescheduled/cancelled events from Coaching.
- [x] Add an authenticated snapshot/backfill contract to each source service.
- [x] Add idempotent Booking consumers that tolerate duplicate and out-of-order events.
- [ ] Backfill projections and add a reconciliation command/report. Guarded refresh, resumable local
      backfill, read-only reconciliation and the runbook are complete; environment execution remains.
- [ ] Run shadow comparisons between projection results and current schema reads. The
      `legacy`/`shadow`/`projection` switch is implemented; environment migration/backfill is pending.
- [ ] Cut over bookable-unit validation and resource-group lookup. Projection reads are implemented
      but default-disabled pending migration/backfill/reconciliation.
- [ ] Cut over lighting pricing. Projection read is implemented but default-disabled.
- [ ] Cut over unit-conflict availability. Projection read is implemented but default-disabled.
- [ ] Cut over coaching-session conflicts. Projection read is implemented but default-disabled.
- [ ] Remove all five foreign-schema SQL reads and update the coupling inventory.
- [ ] Verify Booking behaviour when a source service or event delivery is temporarily unavailable.

Definition of done:

- `rg` finds no Venue or Coaching schema access in Booking runtime code.
- Projection lag, failed events and reconciliation differences are observable.
- Create, pricing and availability regression suites pass.
- Backfill is repeatable, tenant-scoped and safe to resume.
- Rollback can switch reads to the old path until the separate-database cutover.

### 1a. Review findings still open on the projection work

Raised by the reviewer agents on 25 August 2026. None block the additive migrations, all block a
`projection` cutover or matter operationally.

- [ ] Fail closed on a **stale** projection, not only an empty one. Reads now require a
      `projection_entity_cursors` row for their source, so an un-backfilled tenant gets a 503
      instead of "no conflicts" — but a populated-yet-lagging projection (dead-lettered relay) still
      answers. Needs a lag bound in the read path, which needs the metrics below.
- [ ] Add projection-lag, dead-letter and failed-event metrics with alerting. `status` and
      `reconcile` expose the numbers; nothing watches them.
- [ ] Replace timestamp ordering with an explicit monotonic source revision. Watermarks and event
      stamps now share the producing service's clock, but two replicas of one producer can still
      disagree, and equal timestamps are dropped by the `<=` comparison.
- [ ] Make `refresh` safe to run while relays deliver — it clears cursors but retains event
      receipts, so an event consumed mid-refresh is erased and then suppressed from redelivery. The
      runbook now orders refresh before relay start; the code should enforce it.
- [ ] Add a retention policy for `projection_event_receipts` (unbounded growth per tenant).
- [ ] Compare reconciliation rows field-by-field rather than by `JSON.stringify` (implicit key-order
      coupling reports every row as mismatched if a `select` changes).
- [ ] Verify `venueId`/`resourceId`/`parentUnitId` belong to the caller's tenant on bookable-unit
      create, and emit the tenant-scoped conflict list there as `update` already does.
- [ ] Extract the outbox/inbox/lease mechanics into a shared package (tables stay service-owned).
      Six copies of the relay, three of the inbox claim and two of the lease already differ; this is
      the same drift that produced six variants of the auth guard.
- [ ] Cover the claim SQL with database-backed tests — the inbox dedupe predicate and the projection
      receipt/cursor logic are asserted only against mocked `$queryRaw` today, which is why two
      defects in that SQL reached review.
- [ ] Decide whether the new internal routes should be URI-versioned like the rest of the platform
      (they rely on `VERSION_NEUTRAL`), and exclude the operator routes from Swagger.

### 2. Complete event-delivery reliability

Goal: no important domain change depends on fire-and-forget publication.

- [ ] Inventory every remaining direct event publish and classify its loss impact.
- [x] Define the standard outbox envelope, retry policy, dead-letter state and correlation fields.
      See [domain event envelope](../architecture/domain-event-envelope.md). Booking, Membership,
      Payment and Order relays add stable v1 envelope fields during delivery.
- [ ] Add outbox delivery to state changes needed by the Booking projections first.
- [ ] Extend the pattern to other critical domain events. Booking, Membership, Payment and Order
      now use strict transactional outboxes for covered state changes. Comms, Integration and People
      use durable inbox claims; remaining direct publishers and external-provider idempotency are
      pending.
- [ ] Add dead-letter metrics, alerting and an operator replay procedure. Tenant-scoped status,
      dead-letter listing and safe replay are complete; external metrics/alert transport remains.
- [ ] Test commit, rollback, duplicate delivery, retry exhaustion and replay.
- [ ] Document which events are notifications versus durable integration contracts.

Definition of done: a service crash between domain commit and publication cannot lose a critical
event, and failed delivery is visible and replayable.

### 3. Make scheduled work safe across replicas

Goal: multiple service replicas cannot duplicate scheduled side effects.

- [x] Catalogue every `@Cron` job and classify it as row-claim worker, singleton batch or outbox
      relay. See [scheduled-job safety](../architecture/scheduled-job-safety.md).
- [x] Prefer atomic row claiming with `FOR UPDATE SKIP LOCKED` for queue-like work. Webhook and
      accounting retries now use leases; outbox relays already use row locking.
- [x] Choose and document the regional singleton mechanism for batch jobs; validate it against the
      current transaction pooler and the Azure target. The selected mechanism is a service-owned,
      database-time conditional lease rather than a connection-local advisory lock.
- [x] Protect booking reminders/expiry, membership expiry, campaigns, analytics batches,
      accounting reconciliation and webhook retries. Queue work uses row leases/claims; Membership
      and Analytics use database-time singleton leases. Campaign stale-work recovery remains an
      explicit follow-up but concurrent replicas cannot both claim a scheduled campaign.
- [x] Keep outbox relays horizontally scalable through row claiming rather than singleton locking.
- [ ] Add two-runner concurrency tests proving each side effect happens once.
- [ ] Add job duration, skipped-run, failure and stale-work metrics.

Definition of done: two replicas can run simultaneously without duplicate charges, messages,
expiry transitions or analytics batches.

### 4. Remove migration drift and prove database reproducibility

- [x] Resolve the Booking drift exception (completed 4 August 2026).
- [x] Resolve the Membership drift exception (completed 4 August 2026).
- [x] Resolve the People drift exception (completed 4 August 2026).
- [x] Remove all three from `KNOWN_DRIFT`; the allowlist is empty.
- [ ] Rebuild every service schema from migrations in CI with no exceptions. Historical migrations
      are already covered; rerun against an empty database after the 24 August projection, lease and
      Order outbox migrations. No database environment is currently available locally.
- [ ] Compare constraints and indexes against the expected Prisma models.
- [x] Document safe deployment and rollback for the current additive migrations. Deploy schema
      before code; roll code back first and retain unused projection/outbox/lease tables until a
      later cleanup migration.

Definition of done: an empty regional database built from source exactly matches every committed
service schema.

### 5. Make Commerce authoritative for Membership payments

- [ ] Define the Membership → Order → Payment → fulfilment contract.
- [ ] Define idempotency keys and duplicate-webhook behaviour.
- [ ] Create a Commerce Order for customer membership purchases.
- [ ] Activate/fulfil Membership from confirmed payment state.
- [ ] Retain membership payment fields only as explicit read projections during compatibility.
- [ ] Cover failed, abandoned, refunded and retried payments.
- [ ] Add reconciliation between Membership, Order and Payment.
- [ ] Roll out behind a cohort/feature flag with an old-path fallback.

Definition of done: Membership no longer creates independent authoritative payment history.

### 6. Make Commerce authoritative for Competition payments

- [ ] Reuse the Membership Commerce contract where behaviour is genuinely shared.
- [ ] Create Orders for paid entries and late-entry charges.
- [ ] Confirm entries from payment outcomes idempotently.
- [ ] Handle withdrawal, refund and failed-payment states.
- [ ] Add reconciliation and flagged rollout.

Definition of done: Competition entry payment state is derived from Commerce, without duplicating
payment truth inside Competition.

## P1 — follow after the structural blockers

### 7. Make person merges durable and extensible

- [ ] Replace People’s hard-coded downstream reassignment list with a durable `person.merged`
      contract.
- [ ] Add idempotent subscribers in Booking, Membership, Coaching and Payment.
- [ ] Add reconciliation for soft person references and alert on inconsistent merge state.
- [ ] Preserve compensation only as a compatibility fallback during rollout.

### 8. Build the Website Builder foundation

- [ ] Complete the delivery contract for Website, Page, ContentBlock, Asset and publishing.
- [ ] Confirm service ownership, residency, permissions and public-read contracts.
- [ ] Add draft/publish/version behaviour, SEO and member-only visibility.
- [ ] Migrate existing Home and News content without changing public URLs unexpectedly.
- [ ] Add portal/editor tests and rollback for migrated content.

### 9. Establish production observability

- [ ] Propagate correlation IDs across HTTP and events.
- [ ] Add OpenTelemetry traces and structured service metrics.
- [ ] Alert on outbox dead letters, projection lag, failed cron runs and reconciliation drift.
- [ ] Add service-level health/readiness checks for required dependencies.
- [ ] Redact secrets and personal data from logs and traces.

### 10. Harden deployment and regional activation

- [ ] Convert deployment ordering assumptions into pipeline dependencies.
- [ ] Add infrastructure-as-code and secret references for Azure.
- [ ] Load-test booking availability, pricing and checkout.
- [ ] Exercise failover, rollback, restore and region-activation runbooks.
- [ ] Prove a second region can be created from migrations and configuration without code changes.

## Decision-gated — do not implement the final model yet

Development may produce ADRs, prototypes and migration analysis for these items, but not commit the
final schema before product approval:

- [ ] Tenant = NGB, Organisation association and multi-tenant visibility ADR.
- [ ] Platform Person, organisation Contact, authentication and residency ADR.
- [ ] Shared versus domain-owned enrolment stress test.
- [ ] Group/Operator hierarchy ADR.
- [ ] Hierarchy language review after prototype testing.
- [ ] Membership CostPeriod requirement after prototype testing.
- [ ] Fixture versus Competition Match discovery.
- [ ] Rankings build-versus-integrate discovery.

## Execution rules

For every item above:

1. Preserve service ownership and tenant/region boundaries.
2. Prefer additive migrations and backward-compatible contracts.
3. Make consumers idempotent before enabling retries.
4. Test source unavailable, low-data, timeout and duplicate-delivery behaviour.
5. Add observability before removing the fallback path.
6. Deploy producers before consumers when introducing a new contract.
7. Record rollout, rollback, flags and residual risk in the same change.
