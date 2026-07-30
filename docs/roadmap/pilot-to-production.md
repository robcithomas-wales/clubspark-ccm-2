# Pilot → Production Roadmap

> **Status:** Proposed
> **Date:** 2026-07-29
> **Audience:** CTOO, engineering leadership
> **Horizon:** ~6 months to the first production-ready region.
> **Companion:** [`../architecture/scalability-and-multi-region.md`](../architecture/scalability-and-multi-region.md)

This is the plan to take the pilot to a production-ready **single region on Azure**, built so that
adding EU/US/AU regions later is *deploy-and-route*, not rewrite. It is grounded in a code-evidenced
readiness review (2026-07-29). Effort tags: **S** ≈ days, **M** ≈ 1–2 weeks, **L** ≈ 3–6 weeks.

## Guiding principle

Do the **structural, expensive-to-retrofit** work while the system is still small. Everything below
Phase 1 §1 depends on removing the shared-database coupling first — sequence accordingly.

---

## Phase 0 — Decisions & honesty (weeks 0–2)

- [ ] **Ratify the target architecture** (regional silos + global control plane) and the data
  classification (global vs regional). *(S)*
- [ ] **Make the architecture docs honest.** booking-service JOINs `venue.*`/`people.*`/`auth.*`,
  contradicting invariants #1/#3. Either log these as findings to remove (Phase 1 §1) or amend the
  invariants to admit the coupling with an explicit TODO. *(S)*
- [ ] **Close the security follow-ups** already logged this cycle: event publishers must send
  `X-Internal-Secret` once `INTERNAL_SECRET` is set; converge competition
  entries/standings/messages/draw/submissions onto `CompetitionsRepository`; fix the pre-existing
  `integration webhook-deliveries` async-timing test. *(M)*

## Phase 1 — Structural foundations (months 1–3)

**§1. Decouple the shared database (KEYSTONE — blocks multi-region). (L, highest priority)**
- [ ] Remove booking-service's cross-schema reads of `venue.*`, `people.*`, `auth.*`. Replace with
  API calls to the owning service, or a **booking-owned read model/projection** for hot-path
  availability (maintained from events).
- [ ] Restore the sole-writer invariant; each service's schema becomes independently relocatable.
- [ ] *Acceptance:* no service queries another service's schema except the documented read-only
  analytics exception; grep for cross-schema table names in each service's SQL is clean.

**§2. Reliable eventing — transactional outbox + Azure Service Bus. (L)**
- [ ] Replace `void publish()` + swallowed errors with the **outbox pattern**: write the event in
  the same DB transaction as the state change; a relay ships it to Service Bus with retry.
- [ ] Consumers become Service Bus subscribers (the code already anticipates this); enforce
  idempotency + dead-letter. *Acceptance:* a forced subscriber outage loses **zero** events.

**§3. Caching + real read/write split. (M)**
- [ ] Introduce **Redis** (Azure Cache for Redis) for hot reads (availability, entitlements,
  pricing, sessions). *(M)*
- [ ] Wire the **read replica** that is currently dead config (`readUrl` used only in template);
  route reads to it. Revisit `connection_limit=1` for AKS replica counts. *(S)*
- [ ] *Acceptance:* p95 read latency and DB connection headroom validated under load (Phase 2 §4).

**§4. Fix horizontal-scaling correctness — cron multi-fire. (M)**
- [ ] In-process `@Cron` jobs (analytics scoring/anomaly/forecast, booking expiry/reminder,
  membership expiry, integration webhook worker) fire on **every** replica. Add leader election /
  a distributed lock, or externalize to a single scheduler. *Acceptance:* jobs run exactly once at
  N>1 replicas.

**§5. Observability. (M)**
- [ ] OpenTelemetry tracing + **correlation/request IDs** propagated across services (add to the
  shared `common/`), exported to Azure Monitor / App Insights; centralized structured logs.
- [ ] Keep the existing liveness `/health` + readiness `/health/db` probes for AKS. *Acceptance:*
  a cross-service request is traceable end-to-end.

## Phase 2 — Platform hardening (months 3–5)

**§1. Edge & gateway. (M)** Azure Front Door + API Management / ingress: routing, TLS, WAF, and
**rate limiting** (`@nestjs/throttler` per-service + gateway-level) — none exists today.

**§2. Identity off Supabase. (L)** Move auth to **Microsoft Entra External ID / Azure AD B2C**
(region-aware). Propagate the **caller's** tenant on service-to-service calls (today some use a
fixed default tenant — an isolation smell). *Acceptance:* no Supabase JWKS dependency; s2s calls
carry real tenant context.

**§3. Delivery — CI/CD + IaC. (L)** Pipelines (build/test/scan/deploy to AKS); **IaC** (Bicep or
Terraform) for AKS, Postgres, Redis, Service Bus, Front Door; **secrets in Azure Key Vault** (the
`requireSecret` fail-closed work this cycle already assumes real secret provisioning).

**§4. Load & performance testing. (M)** Model 50k users; validate the cache + read-split +
connection budget; find the real ceiling before customers do.

**§5. Service-granularity decision. (M)** Resolve booking↔venue↔people: once §1 (Phase 1) removes
the DB coupling, decide whether they stay three deployables or recombine. The other services
(competition/team/coaching/comms/payment/order/admin/entitlement) are genuinely independent and
can stay as-is.

## Phase 3 — Region-ready (months 5–6)

- [ ] **Global control plane:** tenant registry (`tenant → home_region`), region-aware routing via
  Front Door, global reference data. *(L)*
- [ ] **Residency mechanics** designed and validated end-to-end with **one** region live (region
  assignment at onboarding, sticky home region, migration runbook). *(M)*
- [ ] **Per-region operations:** backups, DR, runbooks, on-call. *(M)*

## Designed-for-later (post-6-months)

- Activate region 2/3 by deploying the same blueprint and routing by home region.
- Cross-region concerns: global reporting/analytics over region-isolated data; tenants operating
  in multiple regions.

---

## Dependency order (do not reorder the first three)

1. **Decouple the shared DB** (Phase 1 §1) — unblocks per-service and per-region databases.
2. **Outbox + Service Bus** (Phase 1 §2) — reliable state propagation once services are decoupled.
3. **Cache + read-split + cron fix** (Phase 1 §3–§4) — throughput + scaling correctness.
4. Then edge, identity, CI/CD, load-testing (Phase 2), then regionalization (Phase 3).

## Risk register (top structural risks)

| Risk | Impact | Mitigation |
|---|---|---|
| Shared DB + cross-schema JOINs not removed | Multi-region impossible; residency unachievable | Phase 1 §1 first, before any region work |
| Lossy internal events | Silent loss of payment/booking/membership state | Outbox (Phase 1 §2) |
| Cron multi-fire at >1 replica | Duplicate charges/reminders/jobs | Leader election (Phase 1 §4) |
| No cache + `connection_limit=1` + dead read-replica | Throughput ceiling far below 50k | Redis + read-split (Phase 1 §3) |
| Supabase single-region auth | Blocks multi-region identity | Entra/B2C (Phase 2 §2) |
| No tracing across 15 services | Blind to cross-region latency/failures | OpenTelemetry (Phase 1 §5) |
