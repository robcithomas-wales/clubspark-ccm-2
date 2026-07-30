# ADR: Scalability & Multi-Region Architecture

> **Status:** Proposed
> **Date:** 2026-07-29
> **Audience:** CTOO, engineering leadership
> **Decision drivers:** hard data-residency (EU/US/AU), ~50k users, Azure (AKS/Redis/Service Bus),
> one-region-first rollout, ~6-month horizon to first production region.

This ADR records how the platform should evolve from the current pilot to a scalable, multi-region
SaaS. It is grounded in a code-evidenced review of the platform as-built (2026-07-29), **not** the
aspirational picture in [`platform-architecture.md`](platform-architecture.md) — where the two
disagree, this document reflects the code.

---

## 1. Context — what the pilot actually is today

Verified against the code (not the docs):

- **One physical PostgreSQL instance.** All 15 services set `DATABASE_URL` to the *same* host.
  "One schema per service" is **namespacing inside a single database**, not separate databases.
- **Cross-schema coupling in core paths.** `booking-service` reads `venue.*`, `people.*`,
  `auth.*` and `coaching.*` directly via SQL JOINs (availability, pricing, booking reads) — not
  just the sanctioned read-only analytics exception. Worse, `people-service` **writes** into
  `booking.*` and `membership.*` in a single distributed transaction (customer merge / `rehome`).
  This **contradicts invariants #1 (sole writer) and #3 (never a shared database)** in
  `architecture-principles.md`. Full site-by-site list:
  [`cross-schema-coupling-inventory.md`](cross-schema-coupling-inventory.md).
- **Lossy internal event bus.** `EventBus.publish()` is called as `void publish(...)` (unawaited)
  and swallows delivery errors, with no outbox, retry, or dead-letter. Internal domain events can
  be permanently lost. (integration-service *does* have a durable outbound-webhook queue, but it
  sits downstream of this lossy hop.)
- **No caching, throttling capped hard.** No Redis. `connection_limit=1` per replica against a
  single pooled instance. The read/write split is dead config (`read === write`; `readUrl` wired
  only in `template-service`).
- **No tenant→region routing.** The only `region` in the codebase is a display-label column on
  `admin.organisations`. Nothing routes data or connections by region.
- **Auth is Supabase JWKS.** Every service verifies JWTs against `${SUPABASE_URL}/.../jwks.json`
  — a single-region identity coupling. (Postgres access, by contrast, genuinely is Azure-portable:
  no Supabase SDK anywhere, all config from env.)
- **Statelessness is real.** No per-request in-memory state — Node processes scale horizontally
  cleanly. **But** in-process `@Cron` jobs (analytics/booking/membership/integration) will
  **multi-fire** once there is more than one replica.

**Verdict:** cleaner than most pilots on portability and statelessness; but structurally a
**shared-database monolith wearing 15 deployables**, with no regional concept.

## 2. Decision drivers

1. **Data residency is a hard legal requirement** — EU/US/AU customer data must stay in-region.
2. ~50k users across three regions (modest scale; residency + latency are the real constraints).
3. Azure target (AKS, Azure Database for PostgreSQL, Redis, Service Bus, Front Door).
4. Rollout: **one region first**, then expand. First production region in ~6 months.

## 3. Decision

### 3.1 Target topology — regional silos + thin global control plane

Because residency is a hard requirement, the platform adopts **regional data planes with tenants
pinned to a home region**, coordinated by a small **global control plane**.

```
                    ┌─────────────────── Global control plane ───────────────────┐
                    │  Tenant registry (tenant → home region)                      │
   Azure Front Door │  Identity (region-aware)   Global reference data (catalog)   │
   (geo + tenant  ) └──────────────────────────────────────────────────────────────┘
        routing                 │                    │                    │
        ┌────────────────┬──────┴──────┬─────────────┴───────┐
        ▼                ▼             ▼                      ▼
   ┌─────────┐      ┌─────────┐   ┌─────────┐
   │ EU stack│      │ US stack│   │ AU stack│   … each = full AKS stack + Redis +
   │ EU PG   │      │ US PG   │   │ AU PG   │      Service Bus + regional Postgres,
   └─────────┘      └─────────┘   └─────────┘      serving only its region's tenants
```

- **Regional data plane** (per region): the full service stack on AKS, a **regional** Azure
  Postgres, regional Redis and Service Bus. Serves only tenants whose home region is this region.
- **Global control plane**: the **tenant registry** (authoritative `tenant → home_region`),
  region-aware identity, and genuinely-global reference data (plan/product catalogue). Kept small.
- **Azure Front Door** routes each request to the tenant's home region (by tenant/host), so an AU
  user is served from the AU stack against AU data.

### 3.2 Data classification (decide per entity, up front)

- **Regional** (the default): bookings, people, memberships, payments, comms, competitions,
  coaching, orders — all customer/PII data. Lives only in the tenant's home-region DB.
- **Global**: tenant registry, org→region mapping, product/plan catalogue, platform config.

### 3.3 The keystone prerequisite — decouple the shared DB **before** regionalizing

Regional silos are **impossible** while `booking-service` JOINs `venue.*` / `people.*` / `auth.*`
in one database: you cannot place those schemas in different regional databases if a single query
spans them. Therefore, **before any regionalization**:

- booking-service must stop reading other services' schemas directly. Replace cross-schema JOINs
  with **API calls** to the owning service, or with a **booking-owned read model / projection**
  (denormalised copy booking maintains from events) for hot-path availability queries.
- Re-establish the sole-writer invariant, or amend the invariant docs to reflect reality in the
  interim (see §5).

This is the single most expensive retrofit and everything else depends on it.

### 3.4 Tenant→region pinning

- Add `home_region` to the tenant registry, set at onboarding, treated as **sticky** (migrating a
  live tenant between regions is a deliberate, heavy operation — not routine).
- Front Door + a routing layer resolve `tenant → home_region → regional ingress`.
- Re-home identity to a **region-aware** provider (Microsoft Entra External ID / Azure AD B2C),
  since Supabase JWKS is single-region; this replaces the Supabase auth coupling.

## 4. Alternatives considered (and rejected)

| Option | Why rejected |
|---|---|
| **Single global database** (status quo) | Violates data residency outright; cross-region latency (AU→EU ~250ms/query). |
| **Primary + global read-replicas** | Residency forbids EU PII replicating to US/AU. Replicas don't satisfy legal isolation. |
| **Row-level `region` sharding in one DB** | Data still physically co-located in one region → fails residency. |
| **Regional silos + global control plane** ✅ | Satisfies residency, gives per-region latency and blast-radius isolation; fits the existing stateless/portable design once the shared-DB coupling is removed. |

## 5. Consequences

- **Positive:** legal residency satisfied; per-region latency and failure isolation; each region is
  the *same* deployable blueprint (Phase 2 = deploy + route, not rewrite); forces the healthy
  removal of the booking↔venue↔people DB coupling.
- **Negative / cost:** cross-service reads that were free SQL JOINs become API calls or maintained
  projections (latency + complexity); a new global control plane to build and operate;
  cross-region features (global reporting, a tenant that operates in two regions) need explicit
  design; identity must move off Supabase.
- **Doc honesty:** `architecture-principles.md` #1/#3 currently describe a stricter architecture
  than the code implements. Either raise the booking cross-schema reads as findings and remove
  them (§3.3), or amend the invariants to admit the current coupling with an explicit TODO. A
  stale invariant misleads every future review.

## 6. Phasing (summary — full plan in [`../roadmap/pilot-to-production.md`](../roadmap/pilot-to-production.md))

1. **One hardened region**, built with the region-aware seams in place: decouple the shared DB,
   add the transactional outbox + Service Bus, Redis + real read/write split, fix cron multi-fire,
   add observability. Ship this within ~6 months.
2. **Stand up the global control plane** (tenant registry + Front Door routing) and validate the
   residency mechanics — even with only one region live.
3. **Activate region 2/3** — deploy the same blueprint, route by home region.
