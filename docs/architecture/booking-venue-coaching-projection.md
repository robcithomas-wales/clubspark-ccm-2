# Booking Venue and Coaching projection delivery contract

> **Status:** Venue and Coaching implementation complete locally; environment rollout pending
> **Date:** 24 August 2026
> **Owners:** Booking owns the projection; Venue and Coaching own source truth.

## Outcome

Remove Booking's five remaining runtime reads of `venue.*` and `coaching.*` while keeping booking
creation, pricing and availability fast and independently deployable.

Booking stores only the source fields it needs:

- Venue resources: venue, group, active state and lighting.
- Venue bookable units: venue, resource, name, type and active state.
- Venue unit-conflict pairs.
- Coaching occupancy: unit, start/end and status.

The projection is regional and tenant-scoped. It is not a second source of truth and must not expose
Venue or Coaching write behaviour.

## Contracts

### Snapshot/backfill

Venue and Coaching expose internal-secret-protected, tenant-scoped snapshots. Each snapshot uses a
repeatable-read transaction and a transaction-start watermark, so a mutation concurrent with the
snapshot produces a later event rather than being hidden by the snapshot cursor. Booking replaces
one tenant's corresponding projection atomically. Bootstrap refresh is repeatable before live
consumers are enabled; later repair uses reconciliation plus replay rather than destructive refresh.

### Live events

Source mutations publish versioned events through a transactional outbox. Every event contains:

- unique `eventId`;
- `type` ending in `.v1`;
- `tenantId`;
- `occurredAt` and source `updatedAt`;
- complete projection payload for upserts, or the source id for deletion.

Booking records event receipts for idempotency. An entity cursor retains the latest source timestamp
and deletion state, preventing late delivery from resurrecting deleted source data. Consumers must
accept duplicates and out-of-order delivery.

## Rollout

1. Deploy Booking projection tables and disabled consumers.
2. Deploy source snapshot APIs.
3. Backfill each tenant and reconcile counts/fields.
4. Deploy source outbox producers, then enable consumers.
5. Enable shadow comparison without changing results.
6. Enable projection reads by cohort, one hot path at a time.
7. Remove foreign-schema SQL only after reconciliation remains clean.

Booking's Venue read switch is `BOOKING_VENUE_PROJECTION_MODE`: `legacy` (default), `shadow`, or
`projection`. Shadow mode compares the projection with the tenant-scoped legacy query but always
returns the legacy result. Projection mode does not silently fall back, so missing projection data
continues to fail closed through the existing validation paths.

Coaching occupancy uses the equivalent `BOOKING_COACHING_PROJECTION_MODE` switch. Its source
contract covers the `lesson_sessions` occupancy behaviour Booking already enforces; programme
sessions remain a separate product decision because they were not part of the existing conflict
guard.

## Failure behaviour

- Existing reads remain the fallback until final cutover.
- Snapshot failure preserves the last complete projection.
- Duplicate and older events are acknowledged without changing data.
- Projection lag/dead letters must be observable before enabling reads.
- After final cutover, missing projection data fails closed for create/pricing rather than treating a
  missing or inactive unit as valid.

## Rollback

Disable projection reads and return to the existing SQL path while schemas are still co-located.
Projection tables, consumers and source events are additive and can remain deployed during rollback.
Do not remove the fallback until the separate-database activation gate.

## Non-production rollout runbook

Run this per tenant, with `x-internal-secret` and `x-tenant-id` supplied by the deployment
environment. Never enable either projection mode before its source outbox and Booking consumer are
running.

1. Deploy the additive Booking, Venue and Coaching migrations.
2. Deploy Booking consumers with both modes set to `legacy`.
3. Deploy Venue and Coaching snapshot endpoints, outbox producers and relays.
4. Call `POST /booking-projections/internal/venue/refresh` and
   `POST /booking-projections/internal/coaching/refresh` once for the tenant.
5. Call `GET /booking-projections/internal/reconcile`; require `matches: true` and zero mismatches
   for resources, units, conflict edges and coaching occupancies.
6. Set both modes to `shadow`, exercise booking create, pricing and availability, and require no
   shadow mismatch or dead-letter errors through the agreed soak period.
7. Set one projection mode at a time to `projection`, rerun regression/smoke checks, and retain the
   other mode in shadow until the first is stable.
8. Roll back immediately to `legacy` if reconciliation, lag, dead-letter or booking behaviour
   diverges. Projection data can remain in place for investigation and replay.

The refresh endpoints are bootstrap tools. After live consumers are active, repair should reconcile
and replay missing events rather than destructively refreshing a tenant projection.

### Local operator tooling

`npm run projection:ops --` provides guarded, tenant-explicit operations without storing secrets in
arguments or output:

- `backfill --tenant <uuid>` refreshes Venue and Coaching, reconciles, and checkpoints each
  successful tenant in a mode-0600 resumable state file;
- `reconcile --tenant <uuid>` returns the read-only field/count comparison;
- `status --tenant <uuid>` combines Booking cursor age with Venue and Coaching pending/dead-letter
  state;
- `dead-letters --source <venue|coaching> --tenant <uuid>` lists exhausted events;
- `replay --source <venue|coaching> --tenant <uuid> --event <uuid>` tenant-scopes and resets one
  unpublished event for normal relay processing.

Cursor age measures time since the last projected mutation, not guaranteed source lag when a tenant
has no activity. Reconciliation remains the authoritative correctness check. The source outbox
status reports actual pending age and exhausted delivery counts.

## Verification

- Snapshot endpoints cannot return another tenant's records.
- Refresh is atomic and repeatable.
- Duplicate, late, deletion and replay scenarios are tested.
- Shadow comparison covers unit validation, group, lighting, conflict graph and coaching conflicts.
- `rg` finds no foreign Venue/Coaching schema access after final cutover.

## Architecture and security review — 24 August 2026

- **Ownership:** Venue remains authoritative and is the only writer of Venue source rows; Booking
  writes only its projection schema.
- **Consistency:** source writes and outbox rows commit atomically; Booking receipts and entity
  cursors make delivery idempotent and protect deletion tombstones from older events.
- **Isolation:** snapshot, refresh, status and event routes require the internal secret and an
  explicit tenant; header and event tenant must match; all source and projection queries scope the
  tenant directly or through both conflict-edge units.
- **Failure/rollout:** `legacy` remains the default. Shadow failures do not alter member results;
  projection mode fails closed and can be rolled back by changing one environment value.
- **Migration:** both migrations are additive. They have not been applied or backfilled by this
  implementation, and projection mode must not be enabled until reconciliation succeeds.
- **Residual risk:** projection freshness needs operational lag/dead-letter metrics before any
  production cutover. Same-timestamp source mutations are extremely unlikely but should ultimately
  use an explicit monotonic source revision when the transport contract is generalised.
