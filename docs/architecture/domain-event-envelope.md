# Domain event envelope

> **Status:** Compatibility contract v1
> **Updated:** 25 August 2026

Critical domain events delivered from a transactional outbox use this additive envelope:

| Field           | Requirement                   | Meaning                                                                                           |
| --------------- | ----------------------------- | ------------------------------------------------------------------------------------------------- |
| `eventId`       | Required for durable delivery | Stable UUID for deduplication and replay; currently the source outbox row ID                      |
| `type`          | Required                      | Namespaced business fact, for example `payment.succeeded`                                         |
| `schemaVersion` | Required                      | Integer payload-contract version, initially `1`                                                   |
| `producer`      | Required                      | Owning service name                                                                               |
| `tenantId`      | Required                      | Tenant boundary for routing and isolation                                                         |
| `occurredAt`    | Required                      | ISO-8601 time at which the domain fact occurred                                                   |
| `correlationId` | Required                      | Stable causal-operation identifier; defaults to `eventId` until request correlation is propagated |

Existing business fields remain at the top level during the pilot compatibility period. A future
v2 may move them under `data`, but consumers must branch on `schemaVersion` rather than infer shape.
Publishers must not mutate a payload while replaying the same `eventId`.

## Delivery rules

- The domain state and outbox row commit in one transaction.
- A relay adds any missing v1 envelope fields from the stable outbox row before delivery.
- Non-2xx or network failure is a failed attempt; the row is not marked published.
- Delivery is at least once. Comms, Integration and People claim durable events in a service-owned
  inbox keyed by `(producer, eventId)` before invoking their handlers. Completed and concurrently
  processing duplicates are suppressed; failed or expired claims can be retried with the same
  immutable payload. Inboxes store a SHA-256 payload fingerprint for that check, not a duplicate
  copy of the event's personal data.
- `correlationId` is for tracing a causal chain and is not a deduplication key.
- Dead-lettered events remain visible and are replayed with the same `eventId`.

## Compatibility and rollout

Booking, Membership, Payment and Order relays add the envelope without changing stored legacy
payloads, so rollback is a code rollback and does not require data reversal. Consumers currently
accept missing envelope fields for direct legacy publishers; new durable producers must provide
them. Comms, People and Integration now persist inbox claims. Legacy direct publishers still bypass
deduplication until they adopt the envelope.

Inbox completion is not a substitute for an external provider idempotency key: a process can still
crash after an email/provider side effect and before marking its inbox row complete. Provider-facing
adapters must pass `eventId` (or a stable derivative) as their idempotency key before delivery can be
described as effectively once across that final boundary.

Projection events retain their more specific versioned contracts and already carry an `eventId`.
