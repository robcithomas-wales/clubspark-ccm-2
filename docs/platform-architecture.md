# ClubSpark Platform — Architecture & Implementation Plan

> **Document purpose:** Records all architectural decisions, the target platform design, and the phased implementation plan. Used as the reference for all development work.
>
> **Last updated:** April 2026
> **Status:** Active — Phase 0 complete. Teams (Phase 1), Coaching (Phase 6), Competitions, Rankings, Team Sport Website Pages, Comms, Segments, Sessions, Pricing Rules, Refund Policies, Integration Layer, and AI Analytics (member scoring, anomaly detection, utilisation forecasting, player matching) live. 817 automated tests (733 integration + 84 e2e). Gaps 1, 2, 4, 8 resolved; Gap 3 (Supavisor) pending config change.

---

## Known Gaps & Live Risks

> Identified April 2026. Ordered by severity.

| # | Risk | Severity | Status |
|---|---|---|---|
| 1 | **Coaching sessions not conflict-checked against venue bookings** — `coaching.lesson_sessions` are invisible to the booking availability check. A coaching session in Court 1 at 10am does not block a regular booking for Court 1 at 10am. | 🔴 High | ✅ **Resolved** — `bookable_unit_id` added to `coaching.lesson_sessions`; `AvailabilityRepository.getCoachingSessionConflicts()` queries coaching sessions cross-schema; `BookingsService.create()` calls it before insert. 5 integration tests. |
| 2 | **Pricing not evaluated at booking creation** — `booking.pricing_rules` CRUD API is live but not wired into the booking creation flow. Bookings are created with `null` `base_price`/`total_price`. | 🔴 High | ✅ **Resolved** — `PricingService.resolvePrice()` is called in `BookingsService.create()`; resolved total overwrites any caller-supplied price. 5 integration tests verify org/venue/resource-scoped rules and null fallback. |
| 3 | **No connection pooling through Supavisor** — services connect directly to Postgres. Supabase session mode caps at ~60 concurrent connections across the whole project. Under real load this is a ceiling. | 🔴 High | ⚠️ **Pending** — Change each service's `DATABASE_URL` env var to the Supabase transaction-mode pooler endpoint (port 6543). No code change required. Must be done before public launch. |
| 4 | **Booking access rules not evaluated** — `booking.booking_rules` CRUD exists but is not applied at booking time. Advance booking windows, max bookings per period, and time restrictions are not enforced for any live bookings. | 🟠 Medium | ✅ **Resolved** — `BookingRulesService.enforceRules()` is called in `BookingsService.create()` for all non-admin bookings. 17 integration tests covering CRUD + canBook/maxSlot/minSlot/advanceDays/org-scoped/admin-bypass. |
| 5 | **No Redis / caching layer** — every availability check, pricing rule lookup, and membership entitlement check hits Postgres cold. | 🟠 Medium | Phase 0.5 TODO |
| 6 | **No tenant isolation at DB level (RLS)** — tenant isolation is application-enforced only. A bug in tenant context extraction could leak cross-tenant data. | 🟠 Medium | Phase 0.5 TODO |
| 7 | **No Docker / containerisation** — services run as bare Node processes. No Docker, no docker-compose for local dev parity. | 🟡 Low | Phase 0.5 TODO |
| 8 | **No API gateway** — no centralised rate limiting, versioning, or auth enforcement. Fine for pilot; needed before NGB integrations. | 🟡 Low | ✅ **Resolved** — `integration-service` provides API key issuance (scoped credentials for NGB consumers), webhook delivery (push notifications), and full Xero/QuickBooks OAuth 2.0 accounting integration (real-time invoice/credit note sync + nightly batch reconciliation). Centralised rate limiting remains a production TODO. |

---

## Table of Contents

1. [Context & Goals](#1-context--goals)
2. [Current State](#2-current-state)
3. [Technology Stack Decisions](#3-technology-stack-decisions)
4. [Target Architecture](#4-target-architecture)
5. [Domain Model](#5-domain-model)
6. [Target Database Schemas](#6-target-database-schemas)
7. [Performance Strategy](#7-performance-strategy)
8. [Infrastructure — Supabase → Azure](#8-infrastructure--supabase--azure)
9. [Phased Implementation Plan](#9-phased-implementation-plan)
10. [Coding Standards & Conventions](#10-coding-standards--conventions)

---

## 1. Context & Goals

### Platform

ClubSpark is a **multi-sport SaaS platform** targeting team sports facilities. It is a **pilot that is intended to become the production system** — all decisions should reflect production quality from the start.

**Primary sports:** any team sport (football, rugby, cricket, hockey, padel, tennis, etc.)
**Coaching module:** live — dedicated coaching-service with coaches, lesson types, and session management
**Scale target:** thousands of tenants, each potentially with thousands of customers

### Why we are rebuilding

The existing platform runs on ASP.NET + SQL Server. Core issues:
- Performance problems under load (EF Core N+1 queries, lock contention on concurrent bookings, no caching layer)
- Architectural coupling between modules that should be independent
- Booking rules tied to membership plans — prevents applying rules to roles, teams, non-members
- No concept of teams or clubs as booking subjects
- No recurring/series bookings
- No pricing rules engine — surcharges like floodlighting are not modelled correctly

### Core design principles

1. **Performance by design** — caching, indexing, atomic operations, and async event processing are not afterthoughts
2. **Scalability by default** — stateless services, connection pooling, horizontal scaling, partitioned tables
3. **Module independence** — booking works without membership, membership works without booking
4. **Multi-sport from the start** — the domain model accommodates any team sport
5. **Coaching-ready** — the booking primitives support coaching sessions and programmes without redesign
6. **Azure-native target** — all infrastructure choices have a clear Azure equivalent

---

## 2. Current State

### Services (as of March 2026)

| Service | Port | Stack | Status |
|---|---|---|---|
| template-service | 4000 | NestJS / TypeScript / Fastify | ✅ Live — two-template system (Bold / Club) |
| venue-service | 4003 | NestJS / TypeScript / Fastify | ✅ Live — venues, orgs, sponsors, affiliations |
| people-service | 4004 | NestJS / TypeScript / Fastify | ✅ Live — persons, households, roles, tags, lifecycle, segments |
| booking-service | 4005 | NestJS / TypeScript / Fastify | ✅ Live — bookings, series, rules, approvals, stats, sessions, pricing rules, refund policies, booking participants |
| admin-service | 4006 | NestJS / TypeScript / Fastify | ✅ Live — admin users, RBAC |
| coaching-service | 4007 | NestJS / TypeScript / Fastify | ✅ Live — coaches, lesson types, lesson sessions |
| team-service | 4008 | NestJS / TypeScript / Fastify | ✅ Live — teams, rosters (roles + photos), fixtures, availability, charges, public API |
| competition-service | 4009 | NestJS / TypeScript / Fastify | ✅ Live — competitions, divisions, entries, draws, matches, results, standings, rankings, submissions, work cards, discipline |
| membership-service | 4010 | NestJS / TypeScript / Fastify | ✅ Live — schemes, plans, memberships, entitlements, renewals |
| payment-service | 4011 | NestJS / TypeScript / Fastify | ✅ Live — gateway-agnostic (Stripe live, GoCardless ready) |
| comms-service | 4012 | NestJS / TypeScript / Fastify | ✅ Live — campaigns, message log, system templates with tenant overrides |
| integration-service | 4013 | NestJS / TypeScript / Fastify | ✅ Live — API key issuance (scoped, hashed), webhook subscriptions, delivery worker with 5-attempt retry, inbound event fan-out, Xero/QuickBooks OAuth 2.0, real-time accounting sync (payment.succeeded → invoice, refund → credit note, membership.activated → invoice), nightly batch reconciliation |
| analytics-service | 4014 | NestJS / TypeScript / Fastify | ✅ Live — nightly member scoring: churn risk, LTV, payment default, optimal send hour; rule-based anomaly detection (4 rules, `@Cron` 03:00); utilisation forecasting with dead-slot identification (`@Cron` 02:00); player matching by ELO proximity; cross-schema raw SQL; ELO draw seeding in competition-service |
| admin-portal | 3005 | Next.js / React | ✅ Live |
| customer-portal | 3006 | Next.js / React | ✅ Live — multi-tenant via `/[slug]`, teams pages |
| mobile-app | — | Expo / React Native | ✅ Live |

### Phase 0 issues (all resolved)

- [x] `venue-service` add-ons persisted to `venue.add_ons` DB table
- [x] Cross-service schema coupling removed — venue-service no longer queries booking DB directly
- [x] booking-service rewritten in NestJS + TypeScript
- [x] Migration system in place (Prisma) across all services
- [x] Race condition fixed — atomic INSERT with SERIALIZABLE transaction + btree_gist exclusion constraint
- [x] Booking reference fixed — `BK-${randomBytes(5).hex().toUpperCase()}`
- [x] Indexes defined on all critical tables
- [x] Connection pooling fixed — single PrismaClient per service with `connection_limit=2` (Supabase session mode)
- [x] coaching-service built — coaches, lesson types, sessions (port 4007)
- [x] team-service built — teams, rosters, fixtures, availability, squad selection, charge runs (port 4008)
- [x] payment-service built — gateway-agnostic Stripe integration with webhook handling
- [x] People service extended — households, roles, tags, lifecycle history, activity timeline, financial profile
- [x] Membership service extended — renewal automation endpoint
- [x] Admin portal extended — coaching sessions, team reports, people activity timeline, dashboard KPIs + charts
- [x] Customer portal extended — coaching multi-step booking wizard
- [x] Mobile app extended — coaching booking wizard, teams tab with fixtures and availability responses
- [x] competition-service built — competitions, divisions, entries, draws, matches, results, standings (port 4009)
- [x] Rankings system built — ELO + Points Table ranking configs, ranking entries, match events, leaderboard reports
- [x] Team Sport Website Pages — customer portal teams grid, team detail (squad/coaches/fixtures/results), sponsor carousel; venue-service sponsors module; `hasTeams` org flag; `fixturesUrl` + `isPublic` on teams; `role` + `photoUrl` on roster members; public unauthenticated API endpoints
- [x] Admin portal extended — three competition report pages (overview, entries, results), revenue report enhanced with competition entry fee revenue stream, fee collection report enhanced, Save PDF button on all reports
- [x] Customer portal extended — competition list, detail, and entry flow
- [x] Mobile app extended — Competitions tab with live competition list
- [x] 563 integration tests passing across 10 services (34 spec files); 84 Playwright e2e tests passing (647 total)
- [x] integration-service built — API key issuance (scoped, HMAC-hashed, `cs_` prefix plaintext shown once), webhook subscriptions (per-tenant HMAC signing secret), delivery worker (30s cron, 5-attempt exponential retry: 30s→2m→10m→1h→4h), inbound event fan-out endpoint; 31 integration tests (3 spec files)
- [x] booking-service: group sessions with capacity management, join/cancel/complete lifecycle, per-session participants
- [x] booking-service: pricing rules engine — scoped rules (org/venue/resource), rate per hour, time windows, days of week, lighting surcharge, member discount, priority
- [x] booking-service: refund policies — percentage refund schedules keyed to hours before start; CRUD API
- [x] booking-service: booking participants — named attendees attached to individual bookings
- [x] people-service: segments — static (hand-curated member lists) and dynamic (condition-evaluated with rebuild endpoint)
- [x] comms-service: system templates with per-tenant custom footer/reply-to overrides; 404 guard on unknown keys
- [x] competition-service: match submissions (scorecard submit → acknowledge/reject flow)
- [x] competition-service: work cards (per-person per-sport upsert, list, delete)
- [x] competition-service: discipline cases (OPEN/CLOSED/APPEALED) with action log (WARNING, MATCH_BAN, etc.)
- [x] competition-service: competition-scoped messages
- [x] Create Venue page — full form, POST /venues endpoint, organisationId FK-safe create
- [x] Edit Resource page — pre-populated form, PATCH /resources/:id
- [x] Edit Resource Group page — pre-populated form, PATCH /resource-groups/:id
- [x] Edit Bookable Unit page — pre-populated form with human-readable venue/resource names, PATCH /bookable-units/:id
- [x] Parent-child unit conflict auto-sync — conflict rows auto-created/cleared in venue.unit_conflicts when parentUnitId set or changed
- [x] Facilities explorer — ID fields replaced with human-readable names; unit parent shown by name not UUID
- [x] Availability page — dynamic venue picker (no hardcoded ID); NOW line hydration-safe (client-only render)
- [x] Support chat widget — admin portal and customer portal; tenant-header auth for read ops, bearer for bookings

### Current database schemas

```
-- booking schema
booking.bookings                — core booking records (series_id, booking_subject_type/id, pricing, approval fields)
booking.booking_add_ons         — add-ons linked to bookings
booking.booking_series          — recurring series (iCal RRULE, slot time, season dates)
booking.booking_rules           — access/pricing rules (belongs in booking module, not membership)
booking.booking_participants    — named participants attached to a booking
booking.sessions                — group bookable sessions (open/full/cancelled/completed, capacity, price per participant)
booking.session_participants    — individuals registered for a session
booking.pricing_rules           — scoped pricing rules (rate per hour, days/times, surcharges, member discounts)
booking.refund_policies         — refund percentage schedules based on hours before start

-- venue schema
venue.venues
venue.resources
venue.bookable_units        — includes isOptionalExtra flag
venue.unit_conflicts
venue.add_ons               — product add-ons (persisted)
venue.availability_configs
venue.blackout_dates
venue.resource_groups
venue.organisations         — incl. has_teams flag
venue.affiliations
venue.news_posts
venue.sponsors              — club sponsors (logo, website URL, display order)

-- people schema (was customer)
people.persons              — core person records (renamed from customers)
people.households           — parent/child, guardian relationships
people.household_members    — household membership links
people.person_roles         — roles within an org (with context, date range, status)
people.person_tags          — segmentation tag assignments
people.tags                 — tag definitions
people.lifecycle_history    — status transition log
people.person_relationships — arbitrary named relationships between persons
people.segments             — audience segments (static hand-curated or dynamic condition-based)
people.segment_members      — members of a segment (explicit for static; rebuilt automatically for dynamic)

-- membership schema
membership.membership_schemes
membership.membership_plans
membership.memberships
membership.entitlement_policies
membership.membership_plan_entitlements

-- coaching schema
coaching.coaches
coaching.lesson_types
coaching.coach_lesson_types — many-to-many: coach ↔ lesson type
coaching.lesson_sessions    — individual session records (status, payment, notes, cancellation)

-- team schema
team.teams                  — incl. fixtures_url (external link), is_public flag
team.team_members           — roster with role (player/coach/manager), photo_url, shirt number, position, junior/guest, guardian
team.fixtures               — matches with opponent, venue, kickoff, lifecycle status
team.availability_responses — per-fixture player availability responses
team.selections             — published squad (starters + substitutes) per fixture
team.charge_runs            — fee collection runs per fixture
team.charges                — individual charges per squad member per run

-- competitions schema
competitions.competitions      — competitions with sport, format, entry type, status, entry fee, date windows
competitions.divisions         — one or more divisions per competition (can override parent format)
competitions.entries           — competitor registrations: personId or teamId, displayName, status, payment status
competitions.matches           — drawn fixtures: home/away entry, round, scheduled time, venue
competitions.match_results     — score records with result status (SUBMITTED → VERIFIED / DISPUTED)
competitions.standings         — auto-recalculated: wins, losses, draws, points, goal difference
competitions.messages          — competition-scoped announcements/messages
competitions.match_submissions — submitted match scorecards pending acknowledgement or rejection
competitions.work_cards        — per-person, per-sport work/volunteer card records (upsert by person+sport)
competitions.discipline_cases  — disciplinary cases with status (OPEN/CLOSED/APPEALED) and action log

-- comms schema
comms.templates     — system email/SMS templates (isSystem=true, tenantId=null) with per-tenant overrides
comms.campaigns     — bulk send jobs (channel, audience, status, scheduled/sent times)
comms.message_log   — individual send records per recipient per campaign

-- admin schema
admin.admin_users

-- payment schema
payment.provider_configs    — per-tenant gateway config (Stripe, GoCardless)
payment.payments            — payment records with status and provider reference

-- integration schema
integration.api_keys            — long-lived credentials (hashed, never plaintext); scopes: bookings:read, members:read, competitions:read, teams:read, webhooks:manage
integration.api_key_usage       — per-request audit log (endpoint, response code, timestamp)
integration.webhook_subscriptions — subscriber endpoints per tenant with per-subscription HMAC signing secret
integration.webhook_deliveries  — delivery queue with status (pending/delivered/failed/dead), attempt counter, retry schedule
integration.oauth_connections   — Xero/QuickBooks OAuth 2.0 tokens (AES-256-GCM encrypted at rest), provider tenant ID, expiry; auto-refresh within 5 min of expiry
integration.accounting_settings — per-tenant config: provider, revenue account code, tax rate, invoice mode (DRAFT/AUTHORISED), currency
integration.accounting_sync_log — audit trail of all accounting sync attempts: event type, source ID, provider reference, status (pending/synced/failed/dead), retry schedule
```

---

## 3. Technology Stack Decisions

### Backend services — NestJS

**Decision:** Migrate all services to **NestJS** with the **Fastify adapter**.

**Rationale:**
- Development team has strong .NET experience — NestJS maps directly to ASP.NET Core patterns (controllers, services, DI, guards, interceptors, pipes)
- Enforces consistent architecture across all services (currently inconsistent)
- TypeScript-first — eliminates the current JS/TS inconsistency
- Fastify adapter delivers 3x HTTP throughput vs Express
- `@nestjs/microservices` provides swappable transport (Redis locally → Azure Service Bus in production)
- `@nestjs/swagger` generates OpenAPI docs automatically
- Built-in DI makes services testable in isolation

**ASP.NET Core → NestJS mapping:**

| ASP.NET Core | NestJS |
|---|---|
| Controller | `@Controller()` |
| `[HttpGet]`, `[HttpPost]` | `@Get()`, `@Post()` |
| Constructor injection | Constructor injection |
| `IService` in DI | `@Injectable()` Service |
| Action filter | Interceptor |
| Middleware / Auth policy | Guard |
| Data annotations / FluentValidation | `class-validator` + `class-transformer` |
| Swashbuckle / OpenAPI | `@nestjs/swagger` |
| `IConfiguration` | `@nestjs/config` |

### Database — PostgreSQL (Supabase → Azure)

**Decision:** PostgreSQL via Supabase for pilot; migrate to Azure Database for PostgreSQL Flexible Server for production.

**Rationale over SQL Server:**
- No per-core licensing costs — significant at SaaS scale
- Superior JSONB support (used for pricing rule configs, access rule configs)
- Excellent partitioning (required for bookings table at scale)
- Row Level Security is a first-class feature
- Works on any cloud provider

### ORM / query layer — Prisma + raw SQL

**Decision:** Prisma for migrations and standard CRUD. Raw SQL via `prisma.$queryRaw` for hot paths.

**Rationale:**
- Prisma provides a typed migration system (solves the "no migrations" problem)
- Prisma's generated client is safe and typed for standard operations
- Hot paths (availability check, booking creation, reporting queries) require fine-grained SQL control — window functions, CTEs, atomic INSERT with conflict check, partitioned table queries

### Caching — Redis

**Decision:** Redis for application caching and pub/sub event bus locally; Azure Cache for Redis in production.

**Cache targets:**
- Venue / resource / bookable unit data (TTL: 5 minutes, invalidate on update)
- Pricing rules (TTL: 1 minute, invalidate on rule change)
- Access rules (TTL: 1 minute, invalidate on rule change)
- Customer active memberships (TTL: 30 seconds per customer)
- Availability slots (TTL: 10 seconds, invalidate on booking.created / booking.cancelled)

### Event bus — Redis pub/sub → Azure Service Bus

**Decision:** NestJS microservices transport. Redis pub/sub locally, Azure Service Bus in production.

**Events:**
- `booking.created` → confirmation email, inventory decrement, cache invalidation, stats refresh
- `booking.cancelled` → slot release notification, refund initiation, cache invalidation
- `membership.activated` → access rules cache invalidation
- `membership.expired` → access rules cache invalidation

### Frontend — Next.js 16

**Decision:** Keep Next.js 16 with the App Router. No changes to frontend framework.

### Infrastructure target — Azure

See [Section 8](#8-infrastructure--supabase--azure) for full details.

---

## 4. Target Architecture

```
                    ┌─────────────────────────────┐
                    │      Azure Front Door        │
                    │   (CDN + WAF + TLS + LB)     │
                    └──────────┬──────────────────┘
                               │
              ┌────────────────┴──────────────────┐
              │                                   │
   ┌──────────▼──────────┐           ┌────────────▼────────────┐
   │  Azure Static Web   │           │  Azure API Management   │
   │  Apps (Next.js)     │           │  (rate limiting,        │
   │  admin portal       │           │   versioning, auth)     │
   └─────────────────────┘           └────────────┬────────────┘
                                                  │
   ┌──────────────────────────────────────────────▼────────────────────────┐
   │                  Azure Container Apps Environment                      │
   │                        (Private VNet)                                  │
   │                                                                        │
   │   booking-service    venue-service      people-service                 │
   │   coaching-service   team-service       competition-service             │
   │   membership-service comms-service      payment-service                 │
   │   admin-service      template-service                                   │
   │   [access-rules-service — Phase 4, not started]                        │
   └──────┬──────────────────────┬──────────────────────┬──────────────────┘
          │                      │                      │
┌─────────▼───────────┐ ┌───────▼──────────┐ ┌────────▼──────────────┐
│  Azure Database for  │ │  Azure Cache for │ │  Azure Service Bus    │
│  PostgreSQL          │ │  Redis           │ │  (event bus)          │
│  Flexible Server     │ │  (caching)       │ │                       │
│  + read replica      │ └──────────────────┘ └───────────────────────┘
└─────────────────────┘

Azure Container Registry  — Docker images
Azure Key Vault           — all secrets, connection strings
Azure Monitor             — metrics, alerting
Application Insights      — distributed tracing, APM (familiar from .NET)
Azure DevOps              — CI/CD pipelines (familiar from .NET)
```

### Service responsibilities

| Service | Responsibility | Status |
|---|---|---|
| **template-service** | Portal template system (Bold top-nav / Club sidebar-nav) | ✅ Built |
| **venue-service** | Venues, resources, bookable units, add-on catalogue, availability configs, blackout dates, resource groups, organisations (incl. `hasTeams` flag), affiliations, sponsors | ✅ Built |
| **people-service** | Persons, households, roles, tags, lifecycle history, relationships, segments (static + dynamic with condition-based rebuild) | ✅ Built |
| **booking-service** | Bookings, series, add-ons, availability checking, booking rules, approvals, stats, auto-expiry, group sessions, booking participants, pricing rules engine, refund policies | ✅ Built |
| **admin-service** | Admin users, RBAC | ✅ Built |
| **membership-service** | Membership schemes, plans, memberships, entitlement policies, renewal automation | ✅ Built |
| **coaching-service** | Coaches, lesson types, coach availability, lesson sessions | ✅ Built |
| **team-service** | Teams (incl. `fixturesUrl`, `isPublic`), rosters (incl. `role`, `photoUrl`), fixtures, player availability, squad selection, charge runs, public read API for customer portal | ✅ Built |
| **competition-service** | Competitions, divisions, entries, draw generation, matches, results, standings, rankings (ELO + points table), match submissions, work cards, discipline cases | ✅ Built |
| **payment-service** | Gateway-agnostic payment processing — Stripe live, GoCardless ready | ✅ Built |
| **comms-service** | Campaigns (bulk email/SMS sends), message log, system templates with per-tenant customisation (footer, reply-to) | ✅ Built |
| **pricing-service** | Price calculation at booking time — applies pricing rules, surcharges, discounts | Superseded — pricing rules now live in booking-service |
| **access-rules-service** | Who can book what, when, advance windows, booking limits — independent of membership | Phase 4 — not started |
| **admin-portal** | Next.js admin interface — all domains | ✅ Built |
| **customer-portal** | Multi-tenant Next.js customer-facing portal | ✅ Built |
| **mobile-app** | Expo React Native app | ✅ Built |

---

## 5. Domain Model

### Add-on taxonomy

Three distinct types — previously conflated into one model:

| Type | Example | Availability check? | Inventory |
|---|---|---|---|
| `linked_resource` | Changing room, ball machine | Yes — time-slot locked, conflict detection required | Capacity of the linked bookable unit |
| `service` | Coaching, ball boy, towel hire | Soft — may have limited availability | Staff/capacity count |
| `product` | Tube of balls, grip tape, merchandise | No | Stock level (decrement on booking) |

### Lighting / floodlights

**Not a bookable add-on.** Lighting is a **computed pricing attribute**:
- Resource has `has_floodlights: true` flag
- A pricing rule defines: *"apply £X surcharge when booking this resource after 16:00 between October and March"*
- The customer never selects it — the pricing engine evaluates conditions at booking time and includes it in the price breakdown
- Handled by the **pricing rules engine** in `venue-service` / `pricing-service`

### Booking subjects

A booking has a subject — the entity the booking is for:

| `booking_subject_type` | `booking_subject_id` points to | Example |
|---|---|---|
| `individual` | `customer.customers.id` | Member booking a court |
| `team` | `customer.teams.id` | Team captain booking a pitch |
| `league` | (future) league fixture ID | League fixture allocation |

### Recurring / series bookings

Series bookings are first-class:
- `booking.booking_series` stores the recurrence rule (iCal RRULE format), season dates, slot time
- Individual `booking.bookings` records are generated for each occurrence, linked to the series
- Cancel a single occurrence vs cancel the series are distinct operations
- Rescheduling within a season modifies specific occurrences only

### Resource configurations

A physical space can be configured multiple ways:
- Full pitch (exclusive, 1 booking at a time)
- Two half-pitches (concurrent, each half independently bookable)
- Training layout (different markings, different capacity)

`venue.resource_configurations` defines the available layouts. `venue.configuration_units` maps which bookable units belong to each configuration and which are mutually exclusive.

### Access rules — independent of membership

Booking access rules are owned by the **access-rules-service**, not the membership service. Rules apply to:
- Membership plan holders
- Users with specific roles (coach, committee member, team captain, junior, public)
- Team types
- Customer groups

This means a club using booking without membership can still configure rules. A rule "coaches can book 28 days ahead, members 14 days, public 3 days" is expressed entirely within the access-rules-service regardless of which modules are active.

---

## 6. Target Database Schemas

### people schema (live)

> `customer-service` renamed to `people-service`. Schema uses `people.*` namespace. Persons, households, roles, tags, lifecycle history, segments, and relationships are all live.

```sql
people.persons              — core person records (firstName, lastName, email, phone, lifecycleState)
people.households           — parent/child, guardian relationships
people.household_members    — household membership links
people.person_roles         — roles within an org (context, date range, status)
people.person_tags          — tag assignments
people.tags                 — tag definitions (name, colour, tenantId)
people.lifecycle_history    — state transition log (active/inactive/suspended/deceased)
people.person_relationships — arbitrary named relationships between persons
people.segments             — audience segments: static (hand-curated) or dynamic (condition-evaluated)
people.segment_members      — static: explicit; dynamic: rebuilt via POST /segments/:id/rebuild

-- Indexes (live)
CREATE INDEX persons_tenant_email_idx ON people.persons (tenant_id, lower(email));
CREATE INDEX persons_tenant_name_idx ON people.persons (tenant_id, last_name, first_name);
CREATE INDEX persons_lifecycle_idx ON people.persons (tenant_id, lifecycle_state);
```

> **Teams schema note:** Teams are implemented in the separate `team.*` schema via team-service (live, port 4008), not in `people.*`. The Phase 1 plan in this section previously described a `people.clubs/people.teams` model — that approach has been superseded by the dedicated team-service. Phase 1 now means wiring team bookings into the booking system (see Phase 1 below).

### venue schema (extended)

```sql
-- Existing — no changes
venue.venues, venue.resources, venue.bookable_units, venue.unit_conflicts

-- Fix: persist add-ons (currently in-memory — data loss on restart)
venue.add_ons (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  organisation_id uuid not null,
  venue_id uuid,
  name text not null,
  code text not null,
  description text,
  category text not null,            -- 'equipment' | 'facility' | 'service' | 'product'
  type text not null,                -- 'linked_resource' | 'service' | 'product'
  linked_bookable_unit_id uuid references venue.bookable_units(id),
  status text not null default 'active',
  pricing_type text not null default 'fixed',  -- 'included' | 'fixed'
  price numeric(10,2) not null default 0,
  currency text not null default 'GBP',
  inventory_mode text not null default 'unlimited', -- 'unlimited' | 'shared_pool' | 'tracked'
  total_inventory integer,
  sport text[],                      -- null = all sports
  requires_primary_booking boolean not null default true,
  is_time_bound boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)

-- New: resource configurations (how a physical space can be divided)
venue.resource_configurations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  resource_id uuid not null references venue.resources(id),
  name text not null,                -- 'Full pitch', 'North half', '5-a-side layout'
  configuration_type text not null,  -- 'full' | 'split' | 'training'
  is_default boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz default now()
)

-- New: which bookable units belong to which configuration
venue.configuration_units (
  configuration_id uuid not null references venue.resource_configurations(id),
  bookable_unit_id uuid not null references venue.bookable_units(id),
  primary key (configuration_id, bookable_unit_id)
)

-- New: pricing rules
venue.pricing_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  organisation_id uuid not null,
  name text not null,
  applies_to text not null,          -- 'venue' | 'resource' | 'resource_type' | 'bookable_unit'
  applies_to_id uuid,                -- null = all of that type
  sport text,                        -- null = all sports
  rule_type text not null,           -- 'base_rate' | 'surcharge' | 'discount'
  trigger_type text not null,        -- 'time_window' | 'day_of_week' | 'date_range' | 'attribute'
  trigger_config jsonb not null,
  -- Examples:
  -- time_window:  {"from": "16:00", "to": "22:00"}
  -- day_of_week:  {"days": ["saturday", "sunday"]}
  -- date_range:   {"from": "2024-10-01", "to": "2025-03-31"}
  -- attribute:    {"attribute": "has_floodlights"}
  modifier_type text not null,       -- 'fixed' | 'percentage' | 'replace'
  modifier_value numeric(10,2) not null,
  currency text not null default 'GBP',
  priority integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)

-- Indexes
CREATE INDEX add_ons_tenant_idx ON venue.add_ons (tenant_id, status) WHERE status = 'active';
CREATE INDEX pricing_rules_tenant_idx ON venue.pricing_rules (tenant_id, applies_to, applies_to_id) WHERE is_active = true;
CREATE INDEX pricing_rules_config_idx ON venue.pricing_rules USING GIN (trigger_config);
```

### booking schema (extended)

```sql
-- New: booking series (recurring bookings)
booking.booking_series (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  organisation_id uuid not null,
  venue_id uuid not null,
  resource_id uuid not null,
  bookable_unit_id uuid not null,
  booking_subject_type text not null default 'individual',
  booking_subject_id uuid,
  recurrence_rule text not null,     -- iCal RRULE: 'FREQ=WEEKLY;BYDAY=TU'
  starts_on date not null,
  ends_on date,                      -- null = open-ended
  slot_start_time time not null,     -- e.g. 19:00
  slot_duration_minutes integer not null,
  status text not null default 'active',
  booking_source text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)

-- Modified: booking (extended to support teams + series + pricing)
booking.bookings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  organisation_id uuid not null,
  venue_id uuid not null,
  resource_id uuid not null,
  bookable_unit_id uuid not null,

  -- Booking subject
  booking_subject_type text not null default 'individual',
  booking_subject_id uuid,           -- customer_id OR team_id
  customer_id uuid,                  -- kept for backwards compat + direct individual bookings

  -- Series link
  series_id uuid references booking.booking_series(id),

  booking_source text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'active',
  booking_reference text not null,

  -- Pricing
  base_price numeric(10,2),
  total_price numeric(10,2),
  currency text not null default 'GBP',
  price_breakdown jsonb,             -- array of applied pricing rules for transparency

  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  cancelled_at timestamptz
)

-- Existing: booking add-ons (no changes to structure)
booking.booking_add_ons (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references booking.bookings(id),
  add_on_id uuid not null,
  quantity integer not null default 1,
  price numeric(10,2) not null default 0,
  currency text not null default 'GBP',
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)

-- Critical indexes — define before any data goes in
CREATE INDEX bookings_availability_idx
  ON booking.bookings (tenant_id, bookable_unit_id, starts_at, ends_at)
  WHERE status <> 'cancelled';

CREATE INDEX bookings_calendar_idx
  ON booking.bookings (tenant_id, venue_id, starts_at, ends_at)
  WHERE status <> 'cancelled';

CREATE INDEX bookings_subject_idx
  ON booking.bookings (tenant_id, booking_subject_type, booking_subject_id)
  WHERE status <> 'cancelled';

CREATE INDEX bookings_series_idx
  ON booking.bookings (series_id)
  WHERE series_id IS NOT NULL;

-- Partition by month (declare now, data grows into it correctly)
-- Implement as range partition on starts_at
```

### rules schema (new service)

```sql
rules.access_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  organisation_id uuid not null,
  name text not null,
  description text,

  -- Subject: who this rule applies to
  subject_type text not null,
  -- 'membership_plan' | 'role' | 'team_type' | 'customer_group' | 'public'
  subject_id uuid,                   -- plan_id, role id etc. null = all of that type

  -- Object: what can be booked
  object_type text not null,
  -- 'venue' | 'resource' | 'resource_type' | 'bookable_unit' | 'sport'
  object_id uuid,                    -- null = all of that type
  sport text,                        -- null = all sports

  -- The rule
  rule_type text not null,
  -- 'advance_booking_days'    — how far ahead they can book
  -- 'max_duration_minutes'    — longest single booking allowed
  -- 'max_bookings_per_period' — e.g. 3 per week
  -- 'allowed_time_window'     — e.g. only 06:00–22:00
  -- 'restricted_time_window'  — e.g. no bookings 07:00–09:00
  -- 'can_book'                — explicit allow / deny

  rule_config jsonb not null,
  -- {"days": 14}
  -- {"from": "06:00", "to": "22:00"}
  -- {"count": 3, "period": "week"}
  -- {"allowed": true}

  priority integer not null default 0,  -- higher wins on conflict
  is_active boolean not null default true,
  effective_from date,
  effective_to date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)

CREATE INDEX access_rules_subject_idx
  ON rules.access_rules (tenant_id, subject_type, subject_id)
  WHERE is_active = true;

CREATE INDEX access_rules_object_idx
  ON rules.access_rules (tenant_id, object_type, object_id)
  WHERE is_active = true;

CREATE INDEX access_rules_config_idx ON rules.access_rules USING GIN (rule_config);
```

---

## 7. Performance Strategy

### Critical: atomic booking creation (no race condition)

The current check-availability → create-booking two-step has a TOCTOU race condition — two concurrent requests can both pass the availability check before either inserts. Fix: single atomic INSERT with a built-in conflict check:

```sql
WITH conflict_check AS (
  SELECT COUNT(*) as conflicts
  FROM booking.bookings
  WHERE tenant_id = $1
    AND bookable_unit_id = ANY($2)   -- includes all conflicting unit IDs
    AND status <> 'cancelled'
    AND starts_at < $4               -- endsAt
    AND ends_at > $3                 -- startsAt
)
INSERT INTO booking.bookings (
  tenant_id, organisation_id, venue_id, resource_id, bookable_unit_id,
  booking_subject_type, booking_subject_id, starts_at, ends_at,
  status, booking_reference, ...
)
SELECT $1, $2, ...
FROM conflict_check
WHERE conflicts = 0
RETURNING *
```

Zero rows returned = conflict. No lock held between read and write. No double booking possible.

Add a partial unique index as database-level safety net:

```sql
CREATE UNIQUE INDEX bookings_no_overlap_idx
  ON booking.bookings (bookable_unit_id, starts_at, ends_at)
  WHERE status <> 'cancelled';
```

### Fix N+1 in availability service (exists today)

Current code calls `getConflictingUnits(unit.id)` in a loop — one HTTP call per unit. 10 courts = 10 HTTP calls per calendar view. Fix: load all conflicts for all units in one query:

```sql
SELECT
  unit_id,
  ARRAY_AGG(conflicting_unit_id) as conflicting_unit_ids
FROM venue.unit_conflicts
WHERE unit_id = ANY($1)       -- all unit IDs for the venue
   OR conflicting_unit_id = ANY($1)
GROUP BY unit_id
```

### Caching targets

| Data | Cache key pattern | TTL | Invalidation trigger |
|---|---|---|---|
| Venue / resource / unit | `venue:{tenantId}:{venueId}` | 5 min | Admin update |
| Pricing rules | `pricing:{tenantId}` | 1 min | Rule change |
| Access rules | `rules:{tenantId}` | 1 min | Rule change |
| Customer memberships | `memberships:{customerId}` | 30 sec | membership.activated/expired |
| Availability slots | `avail:{tenantId}:{venueId}:{date}` | 10 sec | booking.created/cancelled |

### Materialized views for reporting

Dashboard stats must never run `COUNT(*)` on live booking data:

```sql
CREATE MATERIALIZED VIEW reporting.booking_stats AS
SELECT
  tenant_id,
  DATE_TRUNC('day', starts_at) as day,
  COUNT(*) as total_bookings,
  COUNT(*) FILTER (WHERE status = 'active') as active_bookings,
  SUM(total_price) as total_revenue
FROM booking.bookings
GROUP BY tenant_id, DATE_TRUNC('day', starts_at);

REFRESH MATERIALIZED VIEW CONCURRENTLY reporting.booking_stats;
-- Refresh triggered by booking.created / booking.cancelled events
```

### Connection pooling

Use Supabase Supavisor (built-in) during pilot. Azure: PgBouncer built into PostgreSQL Flexible Server. Services connect via pooler endpoint, not directly to PostgreSQL.

### Row Level Security

Tenant isolation as defence in depth — wrong tenant_id in application code returns zero rows rather than wrong data:

```sql
ALTER TABLE booking.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON booking.bookings
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

### Fastify adapter (mandatory)

All NestJS services must use the Fastify adapter — 3x throughput vs Express default:

```typescript
const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter({ logger: true })
)
```

### Observability (required before production)

```
OpenTelemetry   → distributed traces across all services
Application Insights → APM, same tool as existing .NET platform
pg_stat_statements   → identify slow queries
Prometheus + Grafana → metrics dashboards (or Azure Monitor)
```

Key metrics to track: p50/p95/p99 response times, cache hit rate (target >90%), DB pool utilisation (alert >80%), availability check duration (target <50ms p99), booking creation duration (target <200ms p99).

---

## 8. Infrastructure — Supabase → Azure

### Migration strategy

The migration from Supabase to Azure is a **configuration change, not a code change**, provided these rules are followed during development:

1. Never import or use the Supabase client SDK in service code — connect via Prisma/pg only
2. All connection strings and secrets via environment variables
3. Dockerize every service from day one
4. Use standard Redis client (`ioredis`) — works identically against Azure Cache for Redis
5. Use NestJS microservices with swappable transport
6. Never use Supabase-specific PostgreSQL extensions not available on Azure

### Service mapping

| Component | Pilot (Supabase phase) | Production (Azure) |
|---|---|---|
| PostgreSQL | Supabase Pro | Azure Database for PostgreSQL Flexible Server |
| Connection pooling | Supavisor (built-in) | PgBouncer (built-in Flexible Server) |
| Read replica | Supabase Pro replica | Flexible Server read replica |
| Redis | Local / Redis Cloud | Azure Cache for Redis |
| Event bus | Redis pub/sub | Azure Service Bus |
| Container hosting | Docker locally / Render | Azure Container Apps |
| Admin portal | Vercel / local | Azure Static Web Apps |
| CDN + load balancer | — | Azure Front Door |
| API gateway | — | Azure API Management |
| Secrets | `.env` files | Azure Key Vault |
| Observability | Console logs | Azure Monitor + Application Insights |
| Container registry | Local | Azure Container Registry |
| CI/CD | Manual | Azure DevOps |

### Azure migration steps (when ready)

```bash
# 1. Export from Supabase
pg_dump $SUPABASE_URL --no-owner > clubspark_$(date +%Y%m%d).dump

# 2. Restore to Azure PostgreSQL Flexible Server
pg_restore --no-owner -d $AZURE_POSTGRES_URL clubspark_$(date +%Y%m%d).dump

# 3. Update environment variables in Azure Container Apps / Key Vault
# 4. Swap DNS / update Azure Front Door origins
# 5. Verify health checks pass
# 6. Decommission Supabase
```

---

## 9. Phased Implementation Plan

### Phase 0 — Foundation (do first, unblocks everything)

> Fix live risks and establish the correct foundation before any new features are built.

#### 0.1 — Development tooling and standards ✅

- [x] Add ESLint + Prettier config enforced across all services
- [x] Add shared `tsconfig.base.json` for consistent TypeScript settings
- [x] Create NestJS service template (Dockerfile, health check, config module, Prisma setup, Fastify adapter)
- [x] Set up Prisma with initial migrations for all existing schemas

#### 0.2 — Fix venue-service ✅

- [x] Migrate add-ons from in-memory to `venue.add_ons` database table
- [x] Remove `availabilityService.js` from venue-service (it queries `booking.bookings` directly — wrong)
- [x] Rewrite venue-service as NestJS with Fastify adapter (port 4003)
- [x] Add all venue schema indexes
- [x] Update admin portal to send `x-tenant-id` header to venue-service calls

> **Note:** NestJS Fastify services require `@fastify/static` as a dependency for Swagger UI static file serving.

#### 0.3 — Rewrite booking-service (NestJS + fix race condition) ✅

- [x] Rewrite booking-service in NestJS + TypeScript (port 4005)
- [x] Atomic booking creation: SERIALIZABLE transaction + btree_gist exclusion constraint (`no_overlapping_active_bookings`) — eliminates TOCTOU race condition at DB level
- [x] Fix N+1 in availability: single `venue.unit_conflicts` query for all units (`getConflictMapForUnits`)
- [x] Fix booking reference: `BK-${randomBytes(5).hex().toUpperCase()}` (was `BK-${Date.now()}`)
- [x] Add all booking schema indexes
- [x] Add `organisation_id` to bookings (was missing)

#### 0.4 — People platform (was: migrate customer-service to NestJS) ✅

- [x] Rewrite customer-service as `people-service` in NestJS (port 4004)
- [x] Extend model: households, roles, tags, lifecycle
- [x] Admin portal: people list, detail, create, import pages
- [x] Add `admin-service` (port 4006) with admin-users and RBAC
- [x] Add `template-service` (port 4000) with Bold/Club two-template system

#### 0.5 — Infrastructure (deferred — pilot must prove value first)

- [ ] Add Redis (local Docker for development)
- [ ] Add `docker-compose.yml` for local development environment
- [ ] Add Dockerfile to every service
- [ ] Configure Supabase connection through Supavisor endpoint (not direct)
- [ ] Implement RLS policies on all tables
- [ ] Add `pg_stat_statements` extension in Supabase

#### 0.6 — Admin portal ✅

- [x] Admin portal fully built: operations, membership, venue setup, reports, website, settings sections
- [x] Customer portal built (multi-tenant `/[slug]`): home, book, account, memberships, coaching, competitions, events, news
- [x] Mobile app built (Expo): auth, home, book, account, booking flow
- [x] Supabase auth integrated across admin portal
- [x] Integration tests across all services (with graceful DB-skip)
- [x] Playwright e2e suite: 5 test files

#### 0.7 — Coaching service ✅

- [x] coaching-service built (NestJS, port 4007) with Prisma + `coaching` schema
- [x] Coaches: profiles, specialties, active status, lesson type associations
- [x] Lesson types: sport, duration, pricing, max participants
- [x] Coach availability: slot-level query by date and duration
- [x] Lesson sessions: full CRUD with status and payment lifecycle
- [x] Admin portal: coaches list/detail/create, lesson types, sessions list/detail/create
- [x] Customer portal: multi-step coaching booking wizard (coach → lesson type → date → slot → confirm)
- [x] Mobile app: coaching tab with identical booking wizard
- [x] 45 integration tests passing (coaches, lesson types, sessions — 3 spec files)

#### 0.8 — Team service ✅

- [x] team-service built (NestJS, port 4008) with Prisma + `team` schema
- [x] Teams with sport, season, age group, gender, and fee schedules
- [x] Roster management with person-linking, shirt numbers, positions, junior/guest flags
- [x] Fixtures with full lifecycle (draft → scheduled → squad selected → fees requested → completed)
- [x] Player availability responses (available / maybe / unavailable) with bulk-request
- [x] Squad selection (starters + substitutes) with publish action
- [x] Charge runs with per-player fee application, waive, and manual payment
- [x] Admin portal: teams, roster, fixtures, availability, squad selection, charge runs
- [x] Mobile app: teams tab with fixture list and inline availability response
- [x] Reports: Teams Overview, Match Results, Fee Collection, Player Availability, Player Participation, Fixtures Summary
- [x] 38 integration tests passing (teams, roster, fixtures-availability, selection-charges — 4 spec files)

#### 0.9 — Payment service ✅

- [x] payment-service built — gateway-agnostic payment processing
- [x] Stripe integration live: checkout, payment intent, webhook handling
- [x] GoCardless provider config ready (not yet wired)
- [x] Idempotent payment creation with per-tenant provider routing
- [x] 27 integration tests passing (payments, provider-configs — 2 spec files)

#### 0.10 — People platform extended ✅

- [x] Households, roles, tags, lifecycle history fully built
- [x] Activity timeline: aggregated events from bookings, memberships, and lifecycle
- [x] Financial profile: active memberships, revenue, last-30-days revenue, total bookings
- [x] Admin portal: full person detail with timeline and financial profile

#### 0.11 — Membership renewals ✅

- [x] Renewal automation endpoint: `POST /memberships/process-renewals?withinDays=N`
- [x] Admin portal: process renewals button on renewals report

#### 0.12 — Integration layer ✅

- [x] `integration-service` scaffolded (port 4013, NestJS + Fastify, Prisma `integration` schema)
- [x] `integration.api_keys` — long-lived credentials with HMAC-SHA256 hash storage; `cs_` prefixed plaintext shown once on create; scopes: `bookings:read`, `members:read`, `competitions:read`, `teams:read`, `webhooks:manage`
- [x] `integration.api_key_usage` — per-request audit log written by `ApiKeyUsageInterceptor`
- [x] `integration.webhook_subscriptions` — per-tenant subscriber endpoints with HMAC signing secret (secret hash stored, plaintext shown once)
- [x] `integration.webhook_deliveries` — delivery queue with `pending/delivered/failed/dead` status; 30-second cron worker; 5-attempt exponential retry (30s → 2m → 10m → 1h → 4h)
- [x] `POST /v1/events/inbound` — event fan-out: creates delivery rows for all matching active subscriptions; signed posts with `X-ClubSpark-Signature: sha256=<hmac>`
- [x] EventBusService updated in booking-service, membership-service, payment-service to forward events to integration-service
- [x] Admin portal: API Keys and Webhooks pages under Settings; proxy route at `/api/proxy/integration/[...path]`
- [x] 31 integration tests (api-keys, webhook-subscriptions, webhook-deliveries — 3 spec files)
- [x] `integration.oauth_connections` — Xero/QuickBooks OAuth 2.0 tokens encrypted at rest (AES-256-GCM); auto-refresh within 5 min of expiry; upsert on re-connect; soft-disconnect via `disconnected_at`
- [x] `integration.accounting_settings` — per-tenant config: provider, revenue account code, tax rate ID, invoice mode (DRAFT/AUTHORISED), currency code
- [x] `integration.accounting_sync_log` — audit trail with `pending/synced/failed/dead` status, retry schedule, provider reference (Xero invoice ID / QBO invoice ID)
- [x] `XeroClientService` — contact upsert, ACCREC invoice creation, credit note creation, account codes + tax rates lookup
- [x] `QuickBooksClientService` — customer upsert, invoice creation, credit memo creation, income accounts + tax codes lookup (sandbox + production URLs)
- [x] `AccountingSyncService` — real-time handlers for `payment.succeeded` → invoice, `payment.refund_issued` → credit note, `membership.activated` → invoice; nightly `@Cron(EVERY_DAY_AT_2AM)` batch reconciliation for `pending/failed` log rows
- [x] `OAuthConnectionsService` — Xero and QuickBooks authorisation redirect, callback token exchange, token refresh, disconnect
- [x] `POST /v1/events/inbound` updated to fire accounting sync alongside webhook dispatch (fire-and-forget)
- [x] Admin portal: Accounting page under Settings (provider connection cards, settings form, sync log table with pagination)
- [x] 16 accounting integration tests (oauth-connections, accounting-settings, sync-log — 1 spec file)
- [x] Total integration tests: 47 (4 spec files)

#### 0.13 — AI analytics layer ✅

- [x] `analytics-service` scaffolded (port 4014, NestJS + Fastify, Prisma `analytics` schema)
- [x] `analytics.member_scores` — per-tenant, per-person score record; unique on `(tenant_id, person_id)`
- [x] **Churn risk** — 0–100 score (band: low/medium/high); factors: booking recency, booking trend, membership status, auto-renew off, renewal imminence, email engagement; computed via cross-schema raw SQL aggregation
- [x] **LTV score** — estimated annual value in pence; booking + membership + coaching revenue × retention multiplier (0.7–1.5 by tenure)
- [x] **Payment default risk** — 0–100 score; factors: failed payment history, no-show rate, membership tenure, recent successful payment
- [x] **Optimal send hour** — histogram of email-open hours; returns mode + confidence; null if <3 data points
- [x] `ScoringRepository.fetchPersonData` — single cross-schema raw SQL query spanning booking, membership, payment, comms, coaching, people schemas
- [x] `@Cron('30 1 * * *')` nightly batch scoring for all active tenants
- [x] REST API: `GET /v1/scores`, `GET /v1/scores/:personId`, `POST /v1/scores/bulk`, `POST /v1/scores/compute`
- [x] Admin portal: AI Insights panel on person detail page (churn risk, LTV, payment default, optimal send hour; client-side recompute)
- [x] Admin portal: Churn risk badges on people list (medium/high only; fetched via bulk scores endpoint)
- [x] Admin portal: proxy route at `/api/proxy/analytics/[...path]`
- [x] **ELO draw seeding** in competition-service: `POST /competitions/:id/divisions/:divisionId/draw/seed` — ranks confirmed entries by `RankingEntry.eloRating` desc, falls back to alphabetical; admin portal "Seed by ELO" button on draw panel
- [x] **Anomaly detection** — `analytics.anomaly_flags` table; 4 rules: `dormant_spike` (60d inactive → 5+ bookings/24h, alert), `payment_failure_spike` (3+ failures/24h, alert), `court_hoarding` (7+ same-unit bookings/7d, warning), `booking_duration_extreme` (>6h, warning); idempotent upsert (skips re-flagging within 24h); `@Cron('0 3 * * *')` nightly; REST: `GET /v1/anomalies`, `POST /v1/anomalies/detect`, `PATCH /v1/anomalies/:id/resolve`; admin portal: Anomaly Flags report page with severity filter, one-click resolve and rules legend
- [x] **Utilisation forecasting** — `analytics.forecast_slots` table; rolling 4-week average occupancy by (unit, day-of-week, hour); dead slot = predicted <30% and ≥3 days ahead; `@Cron('0 2 * * *')` nightly; REST: `GET /v1/forecasts`, `GET /v1/forecasts/dead-slots`, `GET /v1/forecasts/dead-slots/:unitId/bookers`, `POST /v1/forecasts/compute`; admin portal: Utilisation Forecast report page with per-unit dead slot cards, compute button and previous-bookers lookup
- [x] **Player matching** — cross-schema SQL joins `people.customers + competitions.ranking_configs + competitions.ranking_entries + booking.bookings`; ELO proximity score (0–60) within ±200 window + activity bonus (0–40, last-60d bookings); graceful fallback to activity-only when no ELO config; returns top 15; REST: `GET /v1/match/:personId?sport=`; admin portal: Player Matching panel on every person detail page
- [x] 85 analytics tests total (12 forecasting algorithm + 6 anomaly rule unit + 9 forecasting API + 10 anomaly API + 9 matching API = 46 new + 39 prior = 85 analytics service tests; 6 draw seeding tests in competition-service)

---

### Phase 1 — Identity: teams, clubs, and roles

> **Status:** Team management is live (0.8 above). Club-level grouping and team bookings remain.

- [ ] Add `people.clubs` table and migration
- [ ] Extend booking to support `booking_subject_type = 'team'` and `booking_subject_id`
- [ ] Admin UI: club management pages
- [ ] Admin UI: create booking on behalf of a team

---

### Phase 2 — Pricing rules engine (partially live)

- [x] `booking.pricing_rules` table and migration (in booking-service, not venue-service)
- [x] Pricing rule CRUD API — scoped rules by organisation / venue / resource group / resource / bookable unit
- [x] Rules support: days of week, time windows, rate per hour, lighting surcharge, member discount override, priority
- [x] `booking.refund_policies` table with CRUD API — percentage refund schedules keyed to hours before start
- [ ] Integrate pricing evaluation into booking creation flow (calculate `base_price`, `total_price`, `price_breakdown`)
- [ ] Handle lighting / floodlight surcharges as pricing rules (remove from add-ons model)
- [ ] Add Redis caching for pricing rules
- [ ] Admin UI: pricing rules management (create, edit, prioritise rules)
- [ ] Admin UI: refund policy management
- [ ] Admin UI: booking confirmation shows price breakdown

---

### Phase 3 — Series / recurring bookings (partially complete)

- [x] Add `booking.booking_series` table and migration
- [x] Implement series creation (basic — generates individual booking records per occurrence)
- [ ] Implement series cancellation (cancel all future occurrences)
- [ ] Implement single-occurrence cancellation within a series
- [ ] Implement series amendment (change time / unit from a given date)
- [ ] Admin UI: series booking creation flow (reports page has series view; creation flow not yet full)
- [ ] Admin UI: series management (view occurrences, cancel, amend)

---

### Phase 4 — Access rules service

- [ ] Create new `access-rules-service` (NestJS)
- [ ] Add `rules.access_rules` table and migration
- [ ] Implement rules evaluation engine (returns allowed/denied + any pricing modifications for a subject + object combination)
- [ ] Integrate rules check into booking creation flow (before availability check)
- [ ] Add Redis caching for access rules (invalidate on rule change)
- [ ] Migrate existing membership entitlements to access rules (or bridge the two)
- [ ] Admin UI: centralised rules management page (all rules for a facility in one place)
- [ ] Admin UI: rules apply to membership plans AND roles AND team types

---

### Phase 5 — Resource configurations

- [ ] Add `venue.resource_configurations` table and migration
- [ ] Add `venue.configuration_units` table and migration
- [ ] Update availability checking to use configurations (understand which units are mutually exclusive per configuration)
- [ ] Admin UI: resource configuration management

---

### Phase 6 — Coaching ✅ (live as of March 2026)

> Implemented as a dedicated coaching-service rather than extending the booking model. Coaches, lesson types, and sessions are first-class entities in the `coaching` schema.

- [x] coaching-service with coaches, lesson types, and lesson sessions
- [x] Coach availability slot queries
- [x] Full session lifecycle: scheduled → confirmed → completed / cancelled / no_show
- [x] Payment tracking per session: unpaid / paid / waived
- [x] Admin portal: complete coaching management UI
- [x] Customer portal: coaching booking wizard
- [x] Mobile app: coaching booking wizard
- [ ] **Wire coaching sessions into venue availability check** — currently `coaching.lesson_sessions` are invisible to `booking.bookings` conflict detection; a coaching session does not block a court booking for the same slot (Gap #1 in risks table)
- [ ] Group capacity + waitlisting (future)
- [ ] Programme / course model — series of sessions with registration (future)

---

## 10. Coding Standards & Conventions

### Service structure (all NestJS services)

```
src/
  app.module.ts
  main.ts
  config/
    configuration.ts          — typed config from env vars
  modules/
    [domain]/
      [domain].module.ts
      [domain].controller.ts
      [domain].service.ts
      [domain].repository.ts  — all SQL here, never in service or controller
      dto/
        create-[domain].dto.ts
        update-[domain].dto.ts
      entities/
        [domain].entity.ts
  common/
    guards/
      tenant-context.guard.ts
    interceptors/
      logging.interceptor.ts
    filters/
      http-exception.filter.ts
    decorators/
      tenant-context.decorator.ts
prisma/
  schema.prisma
  migrations/
```

### Tenant context

Every service extracts tenant context in a Guard (equivalent to ASP.NET Auth filter):

```typescript
@Injectable()
export class TenantContextGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const tenantId = request.headers['x-tenant-id']
    const organisationId = request.headers['x-organisation-id']
    if (!tenantId) throw new BadRequestException('Missing x-tenant-id')
    if (!organisationId) throw new BadRequestException('Missing x-organisation-id')
    request.tenantContext = { tenantId, organisationId }
    return true
  }
}
```

### Repository pattern

All SQL lives in the repository. Services contain business logic only. Controllers contain HTTP concerns only:

```typescript
// repository: SQL only
async findActiveByVenue(tenantId: string, venueId: string): Promise<Booking[]>

// service: business logic only
async getCalendar(ctx: TenantContext, venueId: string, date: string): Promise<DayAvailability>

// controller: HTTP only
@Get('availability/day')
async getDayAvailability(@TenantCtx() ctx, @Query() query: DayAvailabilityDto)
```

### Response envelope

All API responses follow this shape:

```typescript
// List responses
{ data: T[], pagination: { total, page, limit, totalPages } }

// Single item responses
{ data: T }

// Error responses
{ error: string, code: string, statusCode: number }
```

### Environment variables (all services)

```bash
DATABASE_URL=           # Supabase / Azure PostgreSQL connection string (via pooler)
DATABASE_READ_URL=      # Read replica connection string
REDIS_URL=              # Redis / Azure Cache for Redis
SERVICE_BUS_URL=        # Azure Service Bus (production only)
PORT=                   # Service port
NODE_ENV=               # development | production
```

### Docker (every service must have)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 4000
HEALTHCHECK CMD curl -f http://localhost:4000/health || exit 1
CMD ["node", "dist/main.js"]
```

---

*Document maintained alongside development. Update the relevant phase checklist as tasks are completed.*
