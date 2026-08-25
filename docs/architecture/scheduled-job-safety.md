# Scheduled job safety

> **Status:** Active hardening record
> **Updated:** 25 August 2026

## Invariant

Every scheduled operation must be safe when two service replicas enter it at the same time. Queue
work should use short database transactions with `FOR UPDATE SKIP LOCKED`; whole-dataset batches
should use a durable, database-time lease. Process memory and PostgreSQL session advisory locks are
not coordination mechanisms because services use a transaction pooler and will run in more than one
region.

An acquired lease only prevents concurrent execution. The work itself must remain idempotent, use
stable external idempotency keys, or checkpoint progress so recovery after a crashed/expired lease
does not duplicate a side effect.

## Inventory

| Service     | Job                                                        | Class                                 | Current protection                                                            | Remaining work                                                |
| ----------- | ---------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Booking     | Outbox relay (10s), dead-letter report (hourly)            | Row-claim relay / read-only report    | `FOR UPDATE SKIP LOCKED`; strict delivery and v1 envelope                     | Apply migration; add external metrics/alerting                |
| Booking     | Pending-booking expiry (hourly)                            | Set transition                        | Atomic `UPDATE ... WHERE status = 'pending'`; repeat is a no-op               | Add run metrics                                               |
| Booking     | Booking reminders (hourly)                                 | Row side effect                       | Conditional reminder claim and outbox insert share one transaction            | Apply migration; add two-runner/replay coverage               |
| Membership  | Outbox relay (10s), dead-letter report (hourly)            | Row-claim relay / read-only report    | `FOR UPDATE SKIP LOCKED`; strict delivery and v1 envelope                     | Apply migration; add external metrics/alerting                |
| Membership  | Expiry, auto-renewal and renewal reminders (daily)         | Singleton batch plus row side effects | Database-time singleton lease; reminder claim and outbox insert are atomic    | Apply migration; add run metrics                              |
| Payment     | Outbox relay (10s), dead-letter report (hourly)            | Row-claim relay / read-only report    | `FOR UPDATE SKIP LOCKED`; strict delivery and v1 envelope                     | Add operator replay and consumer idempotency                  |
| Order       | Outbox relay (10s), dead-letter report (hourly)            | Row-claim relay / read-only report    | Transactional outbox, row locking, strict delivery and v1 envelope            | Apply migration; add operator replay and consumer idempotency |
| Venue       | Projection outbox relay (10s), dead-letter report (hourly) | Row-claim relay / report              | `FOR UPDATE SKIP LOCKED`; operator status/replay endpoints                    | Add external alert transport                                  |
| Coaching    | Projection outbox relay (10s), dead-letter report (hourly) | Row-claim relay / report              | `FOR UPDATE SKIP LOCKED`; operator status/replay endpoints                    | Add external alert transport                                  |
| Comms       | Scheduled campaigns (minute)                               | Claimed aggregate side effect         | Atomic `draft/scheduled -> sending` claim                                     | Add stale-`sending` recovery and recipient-level idempotency  |
| Integration | Webhook delivery (30s)                                     | Row-claim worker                      | Due `pending/failed` rows leased with `FOR UPDATE SKIP LOCKED`                | Metrics and dead-letter alerting                              |
| Integration | Accounting reconciliation (daily)                          | Row-claim worker                      | Due rows leased with `FOR UPDATE SKIP LOCKED`; null retry time is recoverable | Stable provider idempotency keys and metrics                  |
| Analytics   | Member scoring (daily 01:30)                               | Singleton batch                       | Database-time singleton lease; output is upserted                             | Apply migration; add run metrics                              |
| Analytics   | Utilisation forecasting (daily 02:00)                      | Singleton batch                       | Database-time singleton lease; output is upserted                             | Apply migration; add run metrics                              |
| Analytics   | Anomaly detection (daily 03:00)                            | Singleton batch                       | Database-time singleton lease; flags are upserted                             | Apply migration; add run metrics                              |

## Singleton mechanism

Use a service-owned `scheduled_job_leases` table keyed by job name. Acquisition is one conditional
UPSERT using database time: insert a lease, or replace it only when `lease_until <= now()`. Store a
random owner token and release only when both job name and token match. A worker that crashes loses
the lease automatically; a late former owner cannot release a successor's lease.

Lease duration must exceed the observed p99 job duration. Long-running jobs must renew with the same
owner token and stop before performing another side effect if renewal fails. Regional activation
must ensure only the owning region competes for a global job; tenant-partitioned jobs should include
region or tenant in the lease key when they can run independently.

This design works with the current Supabase transaction pooler and Azure Database for PostgreSQL
because coordination state is committed data, not connection-local state.

## Rollout and rollback

- All changes are local and default behaviour remains inactive until their migrations are applied.
- Deploy schema before code for any new lease table or outbox field.
- Roll back code before removing a coordination table. Keeping an unused table is safe.
- Do not enable multi-replica scheduled execution until the applicable row claim or singleton lease
  and its two-runner test are present.
