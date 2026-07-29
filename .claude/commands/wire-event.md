---
description: Add a cross-service domain event the secure, fail-closed way
---

Wire a domain event so one service can notify others without sharing a database. Emit
event **`$2`** from `services/$1-service`; the consumer(s) are described in: $3

Cross-service communication here is explicit HTTP fan-out over the event bus — **never** a shared
DB or an in-process import between services (architecture invariant #3). Follow the existing
pattern; do not invent a new transport.

1. **Study the pattern first.** Look at a service that already publishes and one that consumes:
   - Publisher side lives in `src/event-bus/` (e.g. `booking-service`, `membership-service`,
     `order-service`, `payment-service`) or `src/events/` (`comms-service`, `integration-service`).
   - Consumer side is a controller with `@Post('inbound')` + `@SkipTenant()` under
     `@Controller({ path: 'events', version: '1' })`, guarded by a **fail-closed
     `INTERNAL_SECRET` check** (see `comms-service/src/events/events.controller.ts`).
2. **Publisher (`$1-service`)** — emit `$2` from the service layer at the point the state change
   is committed. POST to each consumer's `/v1/events/inbound` with the `X-Internal-Secret` header
   set from `INTERNAL_SECRET`. Resolve consumer base URLs from `<NAME>_SERVICE_URL` env vars
   (never hard-code hosts/ports). Publishing must not block or fail the primary operation.
3. **Consumer(s)** — for each service in `$3`, add/extend the inbound handler to recognise `$2`
   and do its work. It **must**: verify the internal secret (fail-closed in prod), be
   `@SkipTenant()`, read tenant/org from the event payload (not a JWT), and be idempotent.
4. **Never** trust an inbound event without the secret check, and never let an inbound handler
   read/write another service's schema — it acts only within its own.
5. **Test** both sides (`npm run test --workspace=services/<name>`) — include a rejected-without-
   secret case on the consumer.
6. If this is a genuinely new cross-service interaction, note it for the architecture doc and hand
   to `@architecture-reviewer` + `@security-reviewer`.

Report the event name, its payload shape, the publisher and every consumer touched.
