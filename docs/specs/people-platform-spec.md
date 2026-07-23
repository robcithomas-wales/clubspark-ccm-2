# Technical Specification: People Platform (Contacts Evolution)

**Document status:** Draft
**Version:** 1.0
**Date:** 2026-03-20
**Trigger:** CFO Pilot Requirements — Contacts, March 2026

---

## Table of Contents

1. [Strategic Recommendation](#1-strategic-recommendation)
2. [Current State Assessment](#2-current-state-assessment)
3. [Build vs Buy Analysis](#3-build-vs-buy-analysis)
4. [Target Architecture](#4-target-architecture)
5. [Data Model](#5-data-model)
6. [Service Specifications](#6-service-specifications)
7. [Admin Portal Changes](#7-admin-portal-changes)
8. [Event-Driven Integration](#8-event-driven-integration)
9. [Capability Delivery Plan](#9-capability-delivery-plan)
10. [Pilot Scope (What Ships)](#10-pilot-scope-what-ships)
11. [Effort Estimates](#11-effort-estimates)
12. [Risks and Dependencies](#12-risks-and-dependencies)
13. [Open Questions for CFO / CPO](#13-open-questions)

---

## 1. Strategic Recommendation

### Build a Domain-Specific People Platform — Not a Generic CRM

The instinct to reach for a CRM (HubSpot, Salesforce) is understandable, but it is the wrong solution for this platform. Here is why, and what to do instead.

**The problem with a generic CRM:**

Sports facility and club management has domain concepts that no generic CRM models natively: court bookings, session attendance, coaching relationships, membership plan entitlements, series programmes, parent-child guardian relationships, per-session payment, and cross-org coach identities. Adapting HubSpot or Salesforce to understand these would require complex, fragile custom objects and bidirectional sync that immediately becomes a maintenance burden. The integration would be the product, not the CRM itself. You would spend more time managing the sync than delivering value.

More critically: the CFO's requirements are not about sales pipeline management (what CRMs excel at). They are about knowing your people deeply within the operational context of running a sports facility. That context lives in your booking, membership, payment and coaching data — data a generic CRM will never have natively.

**The recommendation:**

Build a **domain-specific People Platform** that owns the person model, lifecycle, segmentation, relationships and financial profile as first-class platform capabilities. Use commodity third-party services only for the delivery layer (email, SMS, WhatsApp) — things that are genuinely undifferentiated.

This gives you:
- A single, authoritative system of record with no sync overhead
- Deep cross-module integration (bookings, memberships, payments, coaching — all native)
- A people model that actually fits your domain
- The foundation to power operations, revenue, communication and retention natively

**What this is not:**

This is not a request to build Salesforce. The scope is scoped carefully across four delivery phases, with a meaningful pilot-ready capability in the first two. The remaining capabilities are structured so they deliver incremental value, not a big-bang rewrite.

---

## 2. Current State Assessment

### What exists today

The `customer-service` is a basic CRUD service with a six-field person record:

```
Customer {
  id, tenantId,
  firstName, lastName, email, phone,
  marketingConsent, consentRecordedAt,
  createdAt, updatedAt
}
```

The admin portal has a customer list, a detail view and a create form. There is a `rehome()` method that can merge duplicate records by cascading an ID change across bookings and memberships.

### Gap assessment against CFO requirements

| Capability | Current state | Gap |
|---|---|---|
| Unified person record | Built — extended model with lifecycle, address, DOB, avatar, engagement fields | Remaining: financial fields, gdpr_deleted_at, external_ids |
| Identity dedup | rehome() on create; merge UI/API not yet built | Moderate |
| Roles | Built — full CRUD, contextual roles, time-bound, admin UI | None (pilot scope) |
| Segmentation | Not built — no segments table, no rule engine, no UI | Major |
| Lifecycle management | Built — state machine, manual transitions, history, admin UI | Remaining: auto-transitions from events |
| Activity timeline | Not built — no person_activities table, no event subscribers | Major |
| Engagement scoring | Model fields exist (score, band); computation job not built | Moderate |
| Financial profile | Not built — lifetime_value/balance fields not on model, no job | Major |
| Communication | comms_preferences field on model; comms-service not built | Major |
| Automation / workflows | Not started | Major |
| Relationship model | Built — households, parent/child, guardian, relationships API + UI | None (pilot scope) |
| Reporting / insights | Not started | Major |
| Multi-org identity | Not built (is_coach, home_tenant_id fields not on model) | Low (Phase 4) |

### Root cause

The `customer-service` was built as supporting infrastructure — a lookup store for other services. The CFO requirements are asking it to become the operating core of the platform. That requires a fundamental rethink of what the service is responsible for, not a set of field additions.

---

## 3. Build vs Buy Analysis

### Capability-by-capability decision

| Capability area | Decision | Rationale |
|---|---|---|
| Person model, lifecycle, roles, relationships | **Build** | Domain-specific. No generic tool models coach/participant, parent/child, multi-org identity, or sports-specific lifecycle states |
| Segmentation engine | **Build** | Cross-module rules (booking + membership + payment + attendance) cannot be expressed in HubSpot without full bidirectional sync of all four systems |
| Activity timeline | **Build** | Aggregation of domain events from all internal services — only possible natively |
| Financial profile / LTV | **Build** | Derived directly from booking, membership and payment data — natively available, zero sync required |
| Email delivery | **Third-party: Brevo** | Commodity. Brevo handles SMTP, templates, deliverability, unsubscribes, GDPR compliance. Build the logic and orchestration; outsource the sending |
| SMS delivery | **Third-party: Twilio** | Commodity. Number management, carrier routing, delivery receipts |
| WhatsApp delivery | **Third-party: Twilio** | WhatsApp Business API via Twilio |
| Push notifications | **Third-party: Firebase Cloud Messaging** | Standard mobile push infrastructure |
| Workflow execution engine | **Third-party: Temporal** | Durable, fault-tolerant workflow execution with delays, retries and conditional branching. Open source, self-hostable on Azure |
| AI insights | **Build with Claude API** | Scheduled analysis jobs calling Claude with person/segment data. Surfaces at-risk users, high-value segments, suggested automations |
| External CRM sync (HubSpot) | **Optional integration, Phase 4** | Only if the CFO has existing HubSpot workflows. Build an outbound sync adapter, not a bidirectional dependency |
| Finance tool integration | **Phase 4** | Out of scope for pilot |

### The third-party stack

```
Email       →  Brevo (transactional + marketing)
SMS         →  Twilio
WhatsApp    →  Twilio WhatsApp Business API
Push        →  Firebase Cloud Messaging
Workflows   →  Temporal (self-hosted on Azure Container Apps)
AI insights →  Anthropic Claude API (claude-sonnet-4-6)
```

All of these are delivery mechanisms only. The platform owns the logic, scheduling, segmentation, template content and communication history. Third parties receive a message and confirm delivery. Nothing more.

---

## 4. Target Architecture

### Service topology

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Platform Services                            │
│  booking-service  │  membership-service  │  payment-service  │ etc. │
│         │                  │                      │                  │
│         └──────────────────┴──────────────────────┘                  │
│                            │  Domain Events                          │
│                    Azure Service Bus                                  │
│                            │                                         │
└────────────────────────────┼─────────────────────────────────────────┘
                             │
             ┌───────────────┼────────────────┐
             │               │                │
    ┌────────▼───────┐ ┌─────▼──────┐ ┌──────▼──────────┐
    │  people-service │ │  comms-    │ │ automation-     │
    │  (new core)     │ │  service   │ │ service         │
    │                 │ │            │ │ (Temporal)      │
    │  · Person model │ │  · Templates│ │                 │
    │  · Roles        │ │  · Routing  │ │  · Workflows    │
    │  · Lifecycle    │ │  · Delivery │ │  · Triggers     │
    │  · Segments     │ │  · History  │ │  · Scheduling   │
    │  · Tags         │ └─────┬──────┘ └──────┬──────────┘
    │  · Relationships│       │               │
    │  · Activity log │  ┌────▼────────┐      │
    │  · Fin. profile │  │  Providers  │      │
    └────────┬────────┘  │  Brevo      │      │
             │           │  Twilio     │      │
    ┌────────▼────────┐  │  Firebase   │      │
    │  insights-jobs  │  └────────────┘      │
    │  (Claude API)   │                       │
    │  · At-risk      ◄───────────────────────┘
    │  · High-value   │  reads people + segments
    │  · Suggestions  │
    └─────────────────┘
```

### Naming convention

The `customer-service` has been **renamed to `people-service`** (port 4004). All existing endpoints are preserved with backward-compatible additions. The service name and API routes now use `/people/*`.

> **Pending:** The PostgreSQL schema namespace is still `customer.*` (tables: `customer.customers`, `customer.tags`, etc.). The target is `people.*` (`people.persons`). This migration has not yet been applied — it requires a coordinated rename across Prisma schema, migrations, and any cross-schema SQL in other services (booking-service, membership-service reference `customer_id` columns).

---

## 5. Data Model

### 5.1 Core person record (people-service schema)

The existing `customers` table is migrated and extended. All additions are nullable to preserve backward compatibility with existing data.

```sql
-- people.persons (evolution of customer.customers)
CREATE TABLE people.persons (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL,

  -- Core identity
  first_name            TEXT,
  last_name             TEXT,
  email                 TEXT,
  phone                 TEXT,
  date_of_birth         DATE,
  address               JSONB,               -- { line1, line2, city, postcode, country }
  avatar_url            TEXT,

  -- Lifecycle
  lifecycle_state       TEXT NOT NULL DEFAULT 'active',
                        -- prospect | active | inactive | lapsed | churned
  lifecycle_changed_at  TIMESTAMPTZ,
  lifecycle_changed_by  TEXT,                -- userId or 'system'

  -- Consent & preferences
  marketing_consent     BOOLEAN NOT NULL DEFAULT false,
  consent_recorded_at   TIMESTAMPTZ,
  comms_preferences     JSONB NOT NULL DEFAULT '{}',
                        -- { email: true, sms: false, whatsapp: false, push: true }
  gdpr_deleted_at       TIMESTAMPTZ,         -- soft-delete for GDPR erasure

  -- Engagement (computed, updated by background jobs)
  engagement_score      SMALLINT,            -- 0–100
  engagement_band       TEXT,                -- high | medium | low | dormant
  last_activity_at      TIMESTAMPTZ,
  first_activity_at     TIMESTAMPTZ,

  -- Financial summary (computed, updated by background jobs)
  lifetime_value        DECIMAL(10,2),
  outstanding_balance   DECIMAL(10,2),
  last_payment_at       TIMESTAMPTZ,

  -- Source / attribution
  source                TEXT,                -- 'import', 'self-register', 'admin', 'booking'
  external_ids          JSONB NOT NULL DEFAULT '{}',
                        -- { hubspot_id, stripe_customer_id, ... }

  -- Multi-org
  is_coach              BOOLEAN NOT NULL DEFAULT false,
  home_tenant_id        UUID,                -- for coaches spanning multiple orgs

  -- Dedup
  merged_into_id        UUID REFERENCES people.persons(id),
  is_primary            BOOLEAN NOT NULL DEFAULT true,

  -- Meta
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_persons_tenant_email ON people.persons (tenant_id, email)
  WHERE email IS NOT NULL AND gdpr_deleted_at IS NULL;
CREATE INDEX idx_persons_tenant            ON people.persons (tenant_id);
CREATE INDEX idx_persons_lifecycle         ON people.persons (tenant_id, lifecycle_state);
CREATE INDEX idx_persons_engagement        ON people.persons (tenant_id, engagement_band);
CREATE INDEX idx_persons_last_activity     ON people.persons (tenant_id, last_activity_at DESC);
```

### 5.2 Roles

```sql
CREATE TABLE people.person_roles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id       UUID NOT NULL REFERENCES people.persons(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL,

  role_type       TEXT NOT NULL,
    -- member | coach | admin | parent | guardian | committee | team_captain
    -- team_manager | volunteer | staff | player | junior

  context_type    TEXT,                -- 'organisation' | 'team' | 'group' | 'activity'
  context_id      UUID,                -- ID of the team/group/activity if contextual

  permissions     JSONB NOT NULL DEFAULT '{}',
    -- { booking_admin: true, membership_admin: false, ... }

  -- Time-bound
  valid_from      DATE,
  valid_until     DATE,

  status          TEXT NOT NULL DEFAULT 'active',  -- active | inactive | expired

  assigned_by     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_roles_person   ON people.person_roles (person_id);
CREATE INDEX idx_roles_tenant   ON people.person_roles (tenant_id, role_type);
CREATE INDEX idx_roles_context  ON people.person_roles (context_type, context_id);
```

### 5.3 Relationships

```sql
CREATE TABLE people.person_relationships (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,

  person_a_id     UUID NOT NULL REFERENCES people.persons(id),
  person_b_id     UUID NOT NULL REFERENCES people.persons(id),

  relationship    TEXT NOT NULL,
    -- parent_of | guardian_of | household_member | coach_of | emergency_contact

  -- Inverse is derived (parent_of implies child_of on the other side)

  is_primary      BOOLEAN NOT NULL DEFAULT false,  -- primary guardian etc.
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT no_self_relationship CHECK (person_a_id != person_b_id),
  UNIQUE (tenant_id, person_a_id, person_b_id, relationship)
);
```

### 5.4 Tags

```sql
CREATE TABLE people.tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL,
  name        TEXT NOT NULL,
  colour      TEXT,                 -- hex colour for UI display
  source      TEXT NOT NULL DEFAULT 'manual',  -- manual | membership | booking | system
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

CREATE TABLE people.person_tags (
  person_id   UUID NOT NULL REFERENCES people.persons(id) ON DELETE CASCADE,
  tag_id      UUID NOT NULL REFERENCES people.tags(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL,
  applied_by  TEXT,                 -- userId or source system
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ,          -- for automatic removal (e.g. when membership ends)
  PRIMARY KEY (person_id, tag_id)
);
```

### 5.5 Segments

```sql
CREATE TABLE people.segments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,

  segment_type    TEXT NOT NULL DEFAULT 'dynamic',  -- static | dynamic

  -- Dynamic segment rule (JSON filter tree)
  rules           JSONB,
  -- Example:
  -- { "operator": "AND", "conditions": [
  --     { "field": "lifecycle_state", "op": "eq", "value": "active" },
  --     { "field": "membership.status", "op": "eq", "value": "active" },
  --     { "field": "last_activity_at", "op": "gt", "value": "-30d" }
  --   ]}

  -- Computed state
  member_count    INTEGER NOT NULL DEFAULT 0,
  last_evaluated  TIMESTAMPTZ,

  created_by      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Static segment membership
CREATE TABLE people.segment_members (
  segment_id  UUID NOT NULL REFERENCES people.segments(id) ON DELETE CASCADE,
  person_id   UUID NOT NULL REFERENCES people.persons(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (segment_id, person_id)
);
```

### 5.6 Activity timeline

```sql
CREATE TABLE people.person_activities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id       UUID NOT NULL REFERENCES people.persons(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL,

  occurred_at     TIMESTAMPTZ NOT NULL,

  activity_type   TEXT NOT NULL,
    -- booking_created | booking_attended | booking_cancelled
    -- membership_started | membership_renewed | membership_cancelled
    -- payment_made | payment_failed
    -- lesson_attended | event_attended | programme_enrolled
    -- message_sent | message_opened
    -- lifecycle_changed | role_assigned | tag_applied

  source_service  TEXT NOT NULL,             -- 'booking-service', 'membership-service', etc.
  source_id       UUID,                      -- ID of the booking/membership/payment record
  source_ref      TEXT,                      -- human-readable reference

  metadata        JSONB NOT NULL DEFAULT '{}',

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activities_person     ON people.person_activities (person_id, occurred_at DESC);
CREATE INDEX idx_activities_tenant     ON people.person_activities (tenant_id, occurred_at DESC);
CREATE INDEX idx_activities_type       ON people.person_activities (tenant_id, activity_type, occurred_at DESC);
```

### 5.7 Lifecycle history

```sql
CREATE TABLE people.lifecycle_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id       UUID NOT NULL REFERENCES people.persons(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL,
  from_state      TEXT,
  to_state        TEXT NOT NULL,
  reason          TEXT,
  changed_by      TEXT,                      -- userId or 'system'
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 6. Service Specifications

### 6.1 people-service

**Evolution of:** `customer-service`
**Technology:** NestJS + Fastify + PostgreSQL + Prisma
**Renamed from:** `customer-service` → `people-service`

**Modules:**

| Module | Responsibility | Status |
|--------|---------------|--------|
| `CustomersModule` | Extended person CRUD — lifecycle, engagement fields | ✅ Built |
| `LifecycleModule` | State machine, manual transitions, history | ✅ Built |
| `RolesModule` | Role assignment, contextual roles, time-bound | ✅ Built |
| `HouseholdsModule` | Household groups, members, relationships | ✅ Built |
| `TagsModule` | Tag catalogue management, person tag apply/remove/expiry | ✅ Built |
| `SegmentsModule` | Segment definitions, rule evaluation engine, member counts | Not built |
| `ActivityModule` | Activity event subscriber, timeline queries | Not built |
| `InsightsModule` | Computed metrics — engagement score, LTV, at-risk signals | Not built |
| `ActivitySubscriberModule` | Azure Service Bus subscriber for domain events | Not built |

**Key API additions:**

```
# Person lifecycle
PATCH  /persons/:id/lifecycle         Transition lifecycle state

# Roles
GET    /persons/:id/roles
POST   /persons/:id/roles
PATCH  /persons/:id/roles/:roleId
DELETE /persons/:id/roles/:roleId

# Relationships
GET    /persons/:id/relationships
POST   /persons/:id/relationships

# Tags
GET    /persons/:id/tags
POST   /persons/:id/tags
DELETE /persons/:id/tags/:tagId

# Segments
GET    /segments
POST   /segments
GET    /segments/:id
PATCH  /segments/:id
DELETE /segments/:id
GET    /segments/:id/members
POST   /segments/:id/evaluate          Trigger immediate re-evaluation

# Activity timeline
GET    /persons/:id/activity

# Financial profile
GET    /persons/:id/financial

# Search / segment query
POST   /persons/search                 Advanced filtered search (used by segment evaluation)

# Merge / dedup
POST   /persons/:id/merge              Merge person B into person A (primary)

# Bulk
POST   /persons/import                 CSV bulk import
GET    /persons/export                 CSV export with filters
PATCH  /persons/bulk                   Bulk update (lifecycle, tags, etc.)
```

**Segment rule evaluation engine:**

The rules JSON is a composable filter tree. The evaluation engine translates it to a SQL query across `people.persons` joined to `membership.memberships`, `booking.bookings` and `payment.payments` via cross-schema queries (all on the same PostgreSQL cluster).

```typescript
// Example rule tree → SQL
{
  operator: 'AND',
  conditions: [
    { field: 'lifecycle_state',       op: 'eq',  value: 'active' },
    { field: 'membership.status',     op: 'eq',  value: 'active' },
    { field: 'last_activity_at',      op: 'gt',  value: '-30d' },
    { field: 'engagement_band',       op: 'in',  value: ['low', 'dormant'] },
  ]
}

// Generates:
SELECT p.id FROM people.persons p
LEFT JOIN membership.memberships m ON m.customer_id = p.id AND m.tenant_id = p.tenant_id
WHERE p.tenant_id = $1
  AND p.lifecycle_state = 'active'
  AND m.status = 'active'
  AND p.last_activity_at > now() - INTERVAL '30 days'
  AND p.engagement_band IN ('low', 'dormant')
```

Supported rule fields (initial set):
- `lifecycle_state`, `engagement_band`, `engagement_score`, `last_activity_at`, `first_activity_at`
- `membership.status`, `membership.plan_name`, `membership.type`
- `booking.count` (in last N days), `booking.last_at`
- `payment.outstanding_balance`, `payment.last_at`, `payment.status`
- `tags` (has / does not have tag)
- `roles` (has role type)
- `created_at` (registered before/after date)

**Engagement scoring:**

A background job runs every hour and computes an engagement score (0–100) for each person based on:

| Signal | Weight |
|--------|--------|
| Booking in last 7 days | +25 |
| Booking in last 30 days | +15 |
| Active membership | +20 |
| Attended > 4 sessions in last 30 days | +20 |
| Last activity > 60 days ago | -20 |
| Last activity > 90 days ago | -40 |
| Outstanding unpaid balance | -15 |
| Opened last comms | +5 |

Scores are banded: 70–100 = `high`, 40–69 = `medium`, 15–39 = `low`, 0–14 = `dormant`.

**Financial profile computation:**

A background job runs daily and updates `lifetime_value`, `outstanding_balance` and `last_payment_at` on each person record by aggregating across:
- `booking.bookings` (paid bookings)
- `membership.memberships` (active membership prices)
- `payment.payments` (direct payment records)

### 6.2 comms-service (new service)

**Technology:** NestJS + Fastify + PostgreSQL
**Responsibility:** Owns all outbound communication — template management, scheduling, delivery routing and communication history

**Modules:**

| Module | Responsibility |
|--------|---------------|
| `TemplatesModule` | Template CRUD, variable substitution, versioning |
| `CampaignModule` | Bulk sends to segments or static lists |
| `TriggeredCommsModule` | Event-triggered sends (booking reminder, payment reminder) |
| `DeliveryModule` | Provider routing — Brevo (email), Twilio (SMS/WhatsApp), FCM (push) |
| `HistoryModule` | Per-person communication history, open/click tracking |
| `ConsentModule` | Preference management, opt-out handling, GDPR suppression list |

**Schema:**

```sql
-- comms.templates
id, tenant_id, name, channel, subject, body_html, body_text,
variables (JSONB), created_at, updated_at

-- comms.campaigns
id, tenant_id, name, template_id, segment_id,
scheduled_at, sent_at, status, recipient_count, created_at

-- comms.messages
id, tenant_id, person_id, campaign_id, channel,
status, provider_message_id, sent_at, opened_at, clicked_at,
failed_at, failure_reason, created_at

-- comms.suppression_list
tenant_id, person_id, channel, suppressed_at, reason
```

**Provider abstraction:**

All delivery goes through a `ChannelProvider` interface:

```typescript
interface ChannelProvider {
  send(message: OutboundMessage): Promise<ProviderResponse>
}
// Implementations: BrevoEmailProvider, TwilioSmsProvider,
//                  TwilioWhatsAppProvider, FcmPushProvider
```

This means switching providers (e.g. from Brevo to SendGrid) requires only replacing the implementation, not changing the business logic.

### 6.3 automation-service (new service)

**Technology:** NestJS + Fastify + Temporal
**Responsibility:** Workflow definitions, triggers, scheduling and execution

**Temporal** provides durable workflow execution — workflows survive service restarts, handle delays natively (e.g. "wait 3 days, then send a follow-up") and support conditional branching without manual state management.

**Workflow types:**

```typescript
// Lifecycle automations
OnboardingWorkflow         // New member → welcome email → 7d check-in → 30d review
InactivityWorkflow         // No activity in 30d → re-engagement email series
ChurnPreventionWorkflow    // Engagement drops to dormant → sequence of nudges
RenewalWorkflow            // Membership expiring in 30d → reminder sequence

// Operational automations
BookingReminderWorkflow    // 24h/1h before booking → reminder notification
PaymentReminderWorkflow    // Unpaid invoice 7d/14d/30d → escalating reminders
AttendanceWorkflow         // Repeated non-attendance → flag for coach review

// Custom (admin-defined)
CustomWorkflow             // If/then builder, admin-created triggers and actions
```

**Trigger types:**

```typescript
type WorkflowTrigger =
  | { type: 'lifecycle_change';  to_state: string }
  | { type: 'segment_entry';     segment_id: string }
  | { type: 'segment_exit';      segment_id: string }
  | { type: 'activity_event';    activity_type: string }
  | { type: 'schedule';          cron: string }
  | { type: 'manual';            triggered_by: string }
```

---

## 7. Admin Portal Changes

### 7.1 Navigation restructure

The existing `/customers` section becomes `/people` — a unified hub:

```
/people
  /people                          Person list with segment filter, lifecycle filter
  /people/[id]                     Unified person profile (see §7.2)
  /people/[id]/activity            Full activity timeline
  /people/[id]/financial           Financial profile
  /people/[id]/comms               Communication history
  /people/new                      Create person

/segments
  /segments                        Segment list
  /segments/new                    Segment builder (rule editor or static list)
  /segments/[id]                   Segment detail — members, edit rules

/communications
  /communications                  Campaign list
  /communications/new              Compose and schedule campaign
  /communications/templates        Template library
  /communications/templates/new    Template builder

/automations
  /automations                     Workflow list
  /automations/new                 Workflow builder
  /automations/[id]                Workflow detail — runs, performance
```

### 7.2 Unified person profile

The current customer detail page (`/customers/[id]`) is replaced with a comprehensive profile view structured in tabs:

**Overview tab:**
- Identity card (name, email, phone, avatar, lifecycle badge)
- Role badges (member, coach, admin, parent — contextual)
- Tags
- Quick stats: bookings this year, active membership, lifetime value, engagement score (visualised as a bar)
- Recent activity (last 5 events)
- Linked relationships (children, parents, household)

**Activity tab:**
- Full chronological activity timeline
- Filter by type (bookings, payments, memberships, comms, etc.)
- Each entry links to the source record (e.g. booking detail)

**Financial tab:**
- Lifetime value, spend by category (membership / bookings / events / programmes)
- Outstanding balance
- Payment history table

**Memberships tab:**
- All memberships (active, expired, cancelled)
- Plan details, entitlements, renewal status

**Bookings tab:**
- Booking history with attendance status

**Communications tab:**
- All messages sent to this person
- Open/click status per message
- Opt-out management

**Roles & Access tab:**
- All roles (with context, dates, permissions)
- Add / edit / expire roles

### 7.3 Segment builder

A rule-based UI that composes the segment rules JSON without the admin needing to understand the schema:

```
Add condition:
  [ Lifecycle state ]  [ is ]  [ Active         ▼ ]   [×]
  [ Membership      ]  [ is ]  [ Active         ▼ ]   [×]
  [ Last activity   ]  [ is within ] [ 30 days    ]   [×]
  [ Engagement band ]  [ is one of ] [ Low, Dormant ▼] [×]

Match: ● All conditions  ○ Any condition

Estimated audience: 47 people  [Preview members]

[Save segment]  [Save and create campaign]
```

---

## 8. Event-Driven Integration

### 8.1 Domain events published by each service

For the activity timeline and engagement scoring to work, every platform service must publish structured events when things happen. These go to an Azure Service Bus topic: `domain-events`.

| Event type | Publisher | When |
|-----------|---------|------|
| `booking.created` | booking-service | Booking confirmed |
| `booking.cancelled` | booking-service | Booking cancelled |
| `booking.attended` | booking-service | Attendance marked |
| `booking.no_show` | booking-service | No-show recorded |
| `membership.started` | membership-service | New membership activated |
| `membership.renewed` | membership-service | Membership renewed |
| `membership.cancelled` | membership-service | Membership cancelled |
| `membership.expired` | membership-service | Membership lapsed |
| `membership.payment_recorded` | membership-service | Payment recorded against membership |
| `payment.succeeded` | (future payment-service) | Payment taken |
| `payment.failed` | (future payment-service) | Payment attempt failed |

**Event envelope:**

```typescript
interface DomainEvent {
  id:          string       // UUID
  type:        string       // 'booking.created'
  occurredAt:  string       // ISO 8601
  tenantId:    string
  personId:    string       // resolved customer ID
  sourceId:    string       // booking/membership/payment ID
  sourceRef?:  string       // human-readable reference
  payload:     Record<string, unknown>  // type-specific detail
}
```

### 8.2 people-service as event subscriber

The `ActivitySubscriberModule` in `people-service` subscribes to `domain-events` and:

1. Writes a record to `people.person_activities`
2. Updates `last_activity_at` on the person record
3. Enqueues an engagement score recalculation for this person (debounced — max once per 15 minutes per person)
4. If the event is a lifecycle signal (membership cancelled, 90 days no activity), triggers a lifecycle evaluation

### 8.3 Tag auto-apply rules

When `membership.started` arrives:
- Apply any tags associated with that membership plan to the person
- Set `expires_at` on the person_tag to match the membership end date

When `membership.cancelled` / `membership.expired` arrives:
- Remove tags where `source = 'membership'` and the source_id matches

This makes the tagging system live — tags reflect current state automatically.

---

## 9. Capability Delivery Plan

### Phase 1 — Extended Person Model + Activity Timeline (Weeks 1–3)

**Goal:** A real system of record. Every person has lifecycle state, engagement signals and a complete activity history. The basics of a unified profile exist in the admin portal.

**Deliverables:**
- [x] Rename `customer-service` → `people-service` (service renamed; DB schema still `customer.*` — see note below)
- [ ] Migrate `customer.customers` → `people.persons` DB schema rename (still on `customer.*`)
- [x] Add lifecycle state machine with manual transitions
- [x] Add lifecycle history table and API (`GET /people/:id/lifecycle/history`)
- [ ] Domain event publisher pattern in `booking-service` and `membership-service`
- [ ] `ActivitySubscriberModule` in `people-service`
- [ ] `person_activities` table and timeline API
- [ ] Background job: engagement score computation (fields exist on model; job not yet built)
- [ ] Background job: financial profile computation — `lifetime_value`, `outstanding_balance`, `last_payment_at` (fields not yet on model)
- [x] Tag management (manual tags — API and admin UI)
- [x] Updated person profile page (overview tab with lifecycle, tags, roles — engagement score display not yet wired)
- [ ] Activity timeline tab on person detail
- [ ] Financial tab on person detail
- [x] Admin portal: `/people` replacing `/customers`

> **Note on DB schema rename:** The service is named `people-service` but the Prisma schema still maps to `@@schema("customer")` / `customers` table. The spec target of `people.persons` is a pending migration.

**What this unlocks:** For the first time, every person has a meaningful profile. You can see who is engaged, who is drifting, who owes money, and what they've done on the platform. This is the system-of-record foundation.

---

### Phase 2 — Roles, Relationships and Segmentation (Weeks 4–6)

**Goal:** Know who each person is, who they are connected to, and be able to group them intelligently.

**Deliverables:**
- [x] Roles model and API (assign, update status, remove — `GET/POST/PATCH/DELETE /people/:id/roles`)
- [x] Roles UI on person detail (PersonRolesPanel)
- [x] Relationships model and API (parent/child, household, coach/participant)
- [x] Relationships UI on person profile (PersonRelationshipsPanel)
- [x] Households model and API (`POST /households`, `POST /households/:id/members`)
- [ ] Static segments (manual lists) — API and admin UI
- [ ] Dynamic segments — rule engine, up to 10 supported rule fields initially
- [ ] Segment builder UI (`/segments` section not built)
- [ ] Segment evaluation job
- [ ] Tag auto-apply on membership events (membership plan → tags → person)
- [x] Import — CSV bulk import (`POST /people/import`, admin portal `/people/import`)
- [ ] Export — CSV export (`GET /people/export` not yet built)
- [ ] Bulk operations: lifecycle update, tag apply, segment assign (`PATCH /people/bulk` not yet built)
- [x] Advanced search with lifecycle filter and name/email search
- [ ] Role and segment filters in search (not yet built)

**What this unlocks:** You can ask questions like "show me all active members with the Junior role whose last booking was over 30 days ago" and get an answer in seconds. Segments become the unit of targeting for everything that follows.

---

### Phase 3 — Communication Engine (Weeks 7–9)

**Goal:** Send the right message to the right person at the right time, through the right channel.

**Deliverables:**
- [ ] `comms-service` scaffold and schema (not started)
- [ ] Template management (email, SMS) — API and admin UI
- [ ] Brevo email provider integration
- [ ] Twilio SMS provider integration
- [ ] Send to individual person (from person profile)
- [ ] Send to segment / static group (campaign)
- [ ] Communication history per person (admin UI tab)
- [ ] Consent management — per-channel preferences (comms_preferences field exists on model; UI not built)
- [ ] GDPR suppression list (gdpr_deleted_at field not yet on model)
- [ ] Event-triggered sends: booking reminder (24h before), payment reminder (7d overdue)
- [ ] Campaign list and detail view in admin portal (`/communications` section not built)
- [ ] Basic open/delivery tracking

WhatsApp and push notifications are Phase 4.

**What this unlocks:** The "relying on WhatsApp spreadsheets" problem begins to be resolved. You can reach segments with templated, tracked messages. The system knows who to message and what their preferences are.

---

### Phase 4 — Automation, AI Insights and Extended Integrations (Weeks 10–14)

**Goal:** The system acts on what it knows — automatically. And it surfaces intelligence the team couldn't derive manually.

**Deliverables:**
- [ ] `automation-service` with Temporal
- [ ] Built-in workflows: onboarding, inactivity, churn prevention, renewal reminder, booking reminder
- [ ] Custom workflow builder (admin UI — trigger + action + condition)
- [ ] WhatsApp delivery via Twilio
- [ ] Firebase push notifications
- [ ] AI insights job (Claude API): weekly at-risk report, high-value segment identification, suggested automation rules
- [ ] Insights surface in admin portal
- [ ] Deduplication tooling (UI-assisted merge of duplicate person records)
- [ ] Multi-org coach identity (coach spanning multiple tenants)
- [ ] HubSpot outbound sync (optional — if CFO has existing HubSpot usage)
- [ ] Advanced reporting: retention cohorts, lifecycle funnel, LTV by segment

---

## 10. Pilot Scope (What Ships)

Given this is a pilot environment, the following is the recommended cut for what constitutes a complete, coherent people capability at pilot launch:

### Ships in pilot (Phase 1 + Phase 2):

| Capability | Included in pilot |
|---|---|
| Unified person record with lifecycle | Yes |
| Activity timeline | Yes |
| Engagement scoring | Yes |
| Financial profile (LTV, balance) | Yes |
| Roles (basic: member, coach, admin, parent) | Yes |
| Parent/child and household relationships | Yes |
| Manual tags | Yes |
| Auto-tags from membership | Yes |
| Static segments | Yes |
| Dynamic segments (rule builder, 10 fields) | Yes |
| Advanced search with filters | Yes |
| Import / export | Yes |
| Bulk operations | Yes |
| Updated admin portal people hub | Yes |

### Deferred to post-pilot:

| Capability | Reason |
|---|---|
| Email communication | Requires Brevo account setup, template design — Phase 3 |
| SMS / WhatsApp | Phase 3/4 |
| Automation workflows | Phase 4 — pilot doesn't need automation yet |
| AI insights | Phase 4 |
| Multi-org coach identity | Complex, low pilot priority |
| HubSpot integration | Only if CFO has existing HubSpot workflows |

This means the pilot delivers a system that the CFO will recognise as genuinely transformative — a real person profile, segmentation, lifecycle visibility, financial view — without the risk of over-scoping and under-delivering.

---

## 11. Effort Estimates

| Phase | Scope | Estimate |
|---|---|---|
| Phase 1 — Person model + activity | Schema migration, event pipeline, background jobs, profile UI | 3 weeks |
| Phase 2 — Roles, relationships, segments | New models, rule engine, segment builder UI, bulk ops | 3 weeks |
| Phase 3 — Communication engine | New service, provider integrations, campaign UI | 3 weeks |
| Phase 4 — Automation + AI | Temporal, workflow builder, AI insights, extended integrations | 4–5 weeks |
| **Total** | | **13–14 weeks** |

Phase 1 and 2 (the pilot scope) = **6 weeks**.

---

## 12. Risks and Dependencies

| Risk | Impact | Mitigation |
|---|---|---|
| Schema migration on customer-service is breaking | High | Additive-only changes, feature flag new fields, keep backward-compatible endpoints |
| Domain event publishing requires changes to booking-service and membership-service simultaneously | Medium | Ship event publishers early in Phase 1 with a subscriber that just logs — don't block on it |
| Segment rule engine complexity grows faster than anticipated | Medium | Ship with 10 supported rule fields in Phase 2, expand incrementally |
| Temporal infrastructure complexity | Medium | Use Temporal Cloud (managed) for pilot rather than self-hosting |
| Brevo / Twilio account provisioning and GDPR compliance setup | Medium | Start procurement in parallel with Phase 1 development |
| Data quality in existing customer records | High | Dedup tooling and import validation are included in Phase 2 — but expect some manual cleanup |

---

## 13. Open Questions for CFO / CPO

| # | Question | Needed for |
|---|---|---|
| 1 | Is there existing HubSpot or CRM usage that this must integrate with, or replace? | Phase 4 planning |
| 2 | Which communication channels are highest priority — email first, or is SMS/WhatsApp urgent for pilot? | Phase 3 scope |
| 3 | Are there existing lifecycle state definitions or should we propose them? | Phase 1 |
| 4 | Who owns the GDPR consent and suppression list policy — legal team involvement needed? | Phase 3 |
| 5 | Is multi-org coach identity (coaches spanning multiple clubs) required for the pilot? | Phase 1/2 scope |
| 6 | Should dynamic segments be visible to coaches (not just admins) in the portal? | Phase 2 UI design |
| 7 | Are there existing engagement/retention benchmarks we should use to calibrate the scoring model? | Phase 1 |
| 8 | Should automated lifecycle transitions (e.g. active → inactive after 90 days) be opt-in per tenant or platform defaults? | Phase 2 |
| 9 | Is there existing email template branding / content from the current setup? | Phase 3 |
| 10 | What is the expected volume of contacts per tenant (10s, 100s, 1000s, 10000s)? | Infrastructure sizing |

---

*End of specification*
