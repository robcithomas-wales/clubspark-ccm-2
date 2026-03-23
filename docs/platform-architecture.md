# ClubSpark Platform — Architecture & Implementation Plan

> **Document purpose:** Records all architectural decisions, the target platform design, and the phased implementation plan. Used as the reference for all development work.
>
> **Last updated:** March 2026
> **Status:** Active — Phase 0 complete. Phase 1+ in progress.

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
**Coaching module:** coming soon — architecture must be coaching-ready from the start
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
| venue-service | 4003 | NestJS / TypeScript / Fastify | ✅ Live |
| people-service | 4004 | NestJS / TypeScript / Fastify | ✅ Live (renamed from customer-service) |
| booking-service | 4005 | NestJS / TypeScript / Fastify | ✅ Live |
| admin-service | 4006 | NestJS / TypeScript / Fastify | ✅ Live — admin users, RBAC |
| membership-service | 4010 | NestJS / TypeScript / Fastify | ✅ Live |
| admin-portal | 3000 | Next.js / React | ✅ Live |
| customer-portal | — | Next.js / React | ✅ Live — multi-tenant via `/[slug]` |
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

### Current database schemas

```
-- booking schema
booking.bookings            — core booking records (with series_id, booking_subject_type/id, pricing fields)
booking.booking_add_ons     — add-ons linked to bookings
booking.booking_series      — recurring series (iCal RRULE, slot time, season dates)
booking.booking_rules       — access/pricing rules (belongs in booking module, not membership)

-- venue schema
venue.venues
venue.resources
venue.bookable_units        — includes isOptionalExtra flag
venue.unit_conflicts
venue.add_ons               — product add-ons (persisted)
venue.availability_configs
venue.blackout_dates
venue.resource_groups
venue.organisations
venue.affiliations
venue.news_posts

-- people schema (was customer)
people.customers
people.households           — parent/child, guardian relationships
people.roles                — person roles within an org
people.tags                 — segmentation tags
people.lifecycle            — membership lifecycle tracking

-- membership schema
membership.membership_schemes
membership.membership_plans
membership.memberships
membership.entitlement_policies
membership.membership_plan_entitlements

-- admin schema
admin.admin_users
```

---

## 2. Technology Stack Decisions

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
   │   booking-service    venue-service      pricing-service                │
   │   access-rules-service                 identity-service                │
   │   membership-service                                                   │
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
| **venue-service** | Venues, resources, bookable units, add-on catalogue, availability configs, blackout dates, resource groups, organisations, affiliations | ✅ Built |
| **people-service** | People (customers), households, roles, tags, lifecycle | ✅ Built |
| **booking-service** | Bookings, series, booking add-ons, availability checking, booking rules | ✅ Built |
| **admin-service** | Admin users, RBAC | ✅ Built |
| **membership-service** | Membership schemes, plans, memberships, entitlement policies | ✅ Built |
| **pricing-service** | Price calculation at booking time — applies pricing rules, surcharges, discounts | Phase 2 — not started |
| **access-rules-service** | Who can book what, when, advance windows, booking limits — independent of membership | Phase 4 — not started |
| **admin-portal** | Next.js admin interface | ✅ Built |
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

### people schema (extended — was: customer schema)

> Note: `customer-service` has been renamed to `people-service`. Schema uses `people.*` namespace going forward. The models below represent the target; households/roles/tags/lifecycle are built; clubs/teams are Phase 1.

```sql
-- Existing
people.customers (
  id uuid primary key,
  tenant_id uuid not null,
  first_name text,
  last_name text,
  email text,
  phone text,
  created_at timestamptz default now()
)

-- Phase 1: clubs
people.clubs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  organisation_id uuid not null,
  name text not null,
  sport text,                        -- null = multi-sport club
  status text not null default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)

-- Phase 1: teams
people.teams (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  organisation_id uuid not null,
  club_id uuid references customer.clubs(id),
  name text not null,
  sport text not null,
  age_group text,                    -- 'senior', 'u18', 'u16', 'u14' etc.
  status text not null default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)

-- Phase 1: team membership roster
people.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references people.teams(id),
  customer_id uuid not null references people.customers(id),
  role text not null,                -- 'captain' | 'manager' | 'player' | 'coach'
  joined_at timestamptz default now(),
  left_at timestamptz,
  unique (team_id, customer_id)
)

-- Indexes
CREATE INDEX customers_tenant_email_idx ON people.customers (tenant_id, lower(email));
CREATE INDEX customers_tenant_name_idx ON people.customers (tenant_id, last_name, first_name);
CREATE INDEX teams_tenant_idx ON people.teams (tenant_id, organisation_id);
CREATE INDEX team_members_team_idx ON people.team_members (team_id, customer_id) WHERE left_at IS NULL;
CREATE INDEX team_members_customer_idx ON people.team_members (customer_id);
```

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

---

### Phase 1 — Identity: teams, clubs, and roles

- [ ] Add `people.clubs` table and migration
- [ ] Add `people.teams` table and migration
- [ ] Add `people.team_members` table and migration
- [ ] Extend booking to support `booking_subject_type = 'team'` and `booking_subject_id`
- [ ] Admin UI: club management pages
- [ ] Admin UI: team management pages (create team, add/remove members, assign captain)
- [ ] Admin UI: create booking on behalf of a team

---

### Phase 2 — Pricing rules engine

- [ ] Add `venue.pricing_rules` table and migration
- [ ] Implement pricing evaluation service in NestJS
- [ ] Integrate pricing into booking creation flow (calculate `base_price`, `total_price`, `price_breakdown`)
- [ ] Handle lighting / floodlight surcharges as pricing rules (remove from add-ons model)
- [ ] Add Redis caching for pricing rules
- [ ] Admin UI: pricing rules management (create, edit, prioritise rules)
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

### Phase 6 — Coaching (future)

> Architecture is designed to support this without redesign. Coach = a resource with qualifications. Coaching session = a booking linking a coach resource + a court/pitch + participants. Programme = a series booking with registration and capacity.

- [ ] Add coach qualifications / attributes to resource model
- [ ] Add group capacity + waitlisting to booking model
- [ ] Implement programme / course model (series booking with registration)
- [ ] Admin UI: coaching management

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
