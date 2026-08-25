# Pilot → Production Roadmap

> **Status:** Active
> **Date:** 2026-07-29 · **Revised:** 2026-08-25
> **Audience:** CTOO, engineering leadership
> **Companion ADR:** [`../architecture/scalability-and-multi-region.md`](../architecture/scalability-and-multi-region.md)
> **Live coupling inventory:** [`../architecture/cross-schema-coupling-inventory.md`](../architecture/cross-schema-coupling-inventory.md)
> **Product decision log:** [`../decisions/2026-08-24-cpo-product-architecture-decisions.md`](../decisions/2026-08-24-cpo-product-architecture-decisions.md)
> **Engineering execution list:** [`architecture-hardening-todo.md`](architecture-hardening-todo.md)

## The goal, stated plainly

Build a **SaaS MVP we can confidently sell**, serving customers in **one region**, on a codebase whose
**structure is already correct for multi-region**. Data residency (EU/US/AU) is a hard legal
requirement, so multi-region is not a "maybe later" — it is a certainty we are deliberately deferring
the _deployment_ of, not the _design_ of.

**Non-negotiable:** we do not accept months of structural refactoring later. Anything expensive to
retrofit gets done before feature development resumes. Anything cheap to add later, we defer.

## How to decide what's in scope: one-way vs two-way doors

The whole plan reduces to one test — **if we get this wrong, how expensive is it to change once we
have customers and features on top?**

- **One-way door** — reshapes data ownership, service boundaries, or how services talk. Retrofitting
  means touching every feature built since. **These are in scope now, without exception.**
- **Two-way door** — additive infrastructure that sits alongside the code. Adding it later costs the
  same as adding it now. **These are deliberately deferred.**

The insight that makes this affordable: **multi-region readiness is overwhelmingly about data
ownership and communication patterns, not infrastructure.** Regional silos, Front Door, per-region
Postgres — those are deployment concerns we can stand up in weeks when we need them. What we cannot
do cheaply later is unpick services that read each other's tables. So we fix the boundaries now and
buy the infrastructure later.

---

## Product-alignment gates added 24 August 2026

The CPO review identified four product decisions that are also one-way architecture doors. They do
not all need implementation for pilot, but they must be resolved before dependent capabilities
make the current pilot assumptions expensive to reverse:

1. **Tenant/NGB and organisation association:** retain tenant = NGB and define how one organisation
   associates with several tenants while preserving isolation and regional residency.
2. **Platform Person:** separate auth identity, platform Person and organisation Contact/Profile;
   support people across organisations and, where legally possible, across tenants.
3. **Enrolment ownership:** stress-test domain-owned enrolment against a shared capability before
   standardising lifecycle, participants, forms, capacity, waitlists, refunds and reporting.
4. **Multi-site grouping:** assess Group/Operator ownership, inheritance, permissions, billing,
   reporting and residency before treating `tenant_type=operator` as the final model.

Commerce authority is settled: operational domains own fulfilment context; Commerce owns payment
information and history. Membership and Competition paths that bypass it are known target gaps.

---

## Status — what is already done

| Item                                                                    | Why it was a one-way door                                                      | State                                           |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------- |
| **Cross-service _writes_ removed**                                      | A distributed transaction cannot span regional databases. No workaround exists | ✅ Verified: no service writes another's schema |
| **Cross-schema FK dropped** (`membership.memberships → people.persons`) | A DB-level FK physically prevents separate regional databases                  | ✅ Applied + verified                           |
| **Coupling inventory**                                                  | You cannot plan a decouple you haven't measured                                | ✅ Verified against the live DB                 |
| **Integrity bypass removed** (`session_replication_role`)               | Needed a privilege the app role must never hold                                | ✅ Gone                                         |

Two live bugs surfaced and fixed on the way: booking reminders had never sent, and customer financial
profiles always reported zero.

---

## Gate 1 — must complete before feature development resumes

Everything here is a one-way door. Estimated **6–8 weeks**.

### G1.0 — CI, first (S)

No CI exists, and the pre-push test hook is **not committed** — it lives only on one machine. With a
second engineer, nothing prevents broken code reaching `main`.

Build + test + lint on every PR; commit the hook; protect `main`.

_Why first:_ it is the thing that stops the team regressing everything below.

### G1.1 — Finish the decouple (L) 🟠 Code complete; activation pending

People/Auth and display-only Venue reads have moved to tenant-scoped service APIs. Five hot-path
compatibility queries remain in Booking: four against Venue and one against Coaching.

Hot paths (availability, pricing, create) get a **booking-owned projection**; occasional reads
(dashboards, reports) become **API calls**. Decision already taken: projection — an API hop per
availability cell is untenable.

**Progress 25 August 2026:** Booking-owned Venue and Coaching projections, versioned source
outboxes, snapshots, idempotent consumers, reconciliation and rollout switches are implemented.
They default to legacy reads because migrations/backfill/shadow comparison have not run. The five
fallback queries can be removed only after an observed projection cutover.

_Why now:_ this is the last genuinely blocking structural item. Every feature built on top of a
cross-schema JOIN is another feature to rewrite later.

### G1.2 — Transactional outbox (L) 🟠 Critical flows covered

Booking, Membership, Payment and Order use strict transactional outboxes for covered state changes;
Venue and Coaching persist projection events transactionally. Covered consumers in Comms,
Integration and People use durable inbox claims. A complete contract inventory, transport/alerting
work and end-to-end crash/replay evidence remain.

_Why now:_ retrofitting delivery guarantees under features that already assume them is far worse than
building them first.

### G1.3 — Tenant → region as a first-class concept (M) ✅ Done 2026-08-05

`admin.organisations.home_region` (NOT NULL, defaulted to `eu-west-2`), and every request now carries
`tenantContext.region` from `CLUBSPARK_REGION`. A service that cannot determine its region **refuses
to start** rather than booting and reporting healthy. A token whose home-region claim disagrees with
the serving region is refused with a 403 — inert today because Supabase does not emit the claim, live
the moment an IdP is configured to.

Deliberately _not_ reusing the existing `admin.organisations.region`: that column is nullable,
free-text, NULL on every row and used only as a list filter. Overloading a filter field with a legal
boundary is how residency incidents happen.

### G1.4 — Data classification: global vs regional (S) ✅ Done 2026-08-05

[`../architecture/data-classification.md`](../architecture/data-classification.md). 120 models: 89
directly tenant-scoped, 27 inheriting tenancy through a foreign-key chain, 4 genuinely global (the
plan catalogue), plus 2 tenant-registry tables.

Two findings worth knowing: the tenant registry is **split across `admin.organisations` and
`venue.organisations`**, and the 27 inherited-tenancy tables cannot be selected by tenant without a
join — so any "export/erase all of a tenant's data" operation that filters on `tenant_id` silently
misses them.

### G1.5 — Scheduled-job concurrency (M) 🟠 Mechanisms implemented

Queue-like jobs now claim rows atomically, singleton batches use database-time leases, and outbox
relays use row locks. The maintained catalogue is
[`../architecture/scheduled-job-safety.md`](../architecture/scheduled-job-safety.md). Two-runner
concurrency proof and operational job metrics remain before multi-replica production approval.

_Why now:_ it is a correctness bug, not a scaling nicety. "Production-ready" and "single replica
only" are incompatible.

### G1.6 — Identity decision (S to decide, L to execute)

Auth is Supabase JWKS — single-region. **Decide now** whether to move to Microsoft Entra External ID.
The decision still matters; the _execution_ is no longer expensive. Auth lives in
[`packages/auth`](../../packages/auth/README.md) and each service picks a provider in one line,
so this stopped being a one-way door in August 2026.
Execution can land in Gate 2, but the decision shapes every auth touchpoint.

---

## Gate 2 — alongside feature development

Two-way doors. Add when needed; no structural penalty for waiting.

- **Redis caching** — availability, entitlements, pricing. Additive.
- **Read replica** — currently dead config (`read === write`). Wiring is a config change.
- **Observability** — OpenTelemetry, correlation IDs, Azure Monitor.
- **Edge & gateway** — Front Door, WAF, rate limiting (none today).
- **CI/CD + IaC** — pipelines, Bicep/Terraform, Key Vault.
- **Load testing** — model 50k users; find the ceiling before customers do.
- **Identity migration execution** — per the G1.6 decision.
- **Service granularity** — once G1.1 removes the DB coupling, revisit whether booking/venue/people
  stay three deployables.

---

## Gate 3 — activating region two

Deliberately deferred. If Gate 1 is done properly this is **deploy-and-route, not rewrite**.

- Global control plane: tenant registry, region-aware routing via Front Door.
- Residency mechanics validated end-to-end with one region live.
- Per-region operations: backups, DR, runbooks, on-call.
- Cross-region concerns: global reporting over region-isolated data; tenants operating in two regions.

---

## Dependency order

1. **G1.0 CI** — protects everything after it.
2. **G1.1 decouple** — unblocks per-service and per-region databases.
3. **G1.2 outbox** — the consistency mechanism the projections rely on.
4. **G1.3/G1.4/G1.5** — parallelisable once the above are moving.

## Risk register

| Risk                                 | Impact                                                | Mitigation                                                                             |
| ------------------------------------ | ----------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Features built on cross-schema JOINs | Every one needs rewriting before regions              | **G1.1 before feature work**                                                           |
| No CI with a growing team            | Silent regression of the work just completed          | **G1.0 first**                                                                         |
| Cron multi-fire at >1 replica        | Duplicate charges, emails, reminders                  | Row claims and singleton leases implemented locally; apply migrations and add metrics  |
| Lossy internal events                | Silent loss of payment/booking/membership/order state | Transactional outboxes implemented for covered critical flows; consumer inboxes remain |
| No tenant→region concept             | Retrofitting touches every request path               | G1.3                                                                                   |
| Supabase single-region identity      | Blocks multi-region auth                              | G1.6                                                                                   |
| Unowned legacy schemas remain        | Cleanup is absent from service migrations             | Verify empty and remove through an explicitly owned shared migration                   |

## What we are explicitly NOT doing before MVP

Standing up regions two and three; building the global control plane; migrating identity; Front Door
and WAF; Redis. All are two-way doors. Saying so explicitly is what keeps Gate 1 to 6–8 weeks instead
of six months.
