# Technical Specification: Error Handling, Triage and AI Agent Service

**Document status:** Draft
**Version:** 1.0
**Date:** 2026-03-20
**Author:** Engineering

---

## Table of Contents

1. [Purpose and Scope](#1-purpose-and-scope)
2. [System Context](#2-system-context)
3. [Architecture Overview](#3-architecture-overview)
4. [Component Specifications](#4-component-specifications)
   - 4.1 Error Ingestion API
   - 4.2 Error Store
   - 4.3 Event Bus
   - 4.4 Error Triage Service
   - 4.5 AI Triage Agent
5. [Data Models](#5-data-models)
6. [API Contracts](#6-api-contracts)
7. [Surface Integration Guide](#7-surface-integration-guide)
8. [AI Agent Specification](#8-ai-agent-specification)
9. [Jira Integration](#9-jira-integration)
10. [Slack Integration](#10-slack-integration)
11. [SLA Policy](#11-sla-policy)
12. [Non-Functional Requirements](#12-non-functional-requirements)
13. [Security and Compliance](#13-security-and-compliance)
14. [Delivery Phases](#14-delivery-phases)
15. [Dependencies and Prerequisites](#15-dependencies-and-prerequisites)
16. [Open Questions](#16-open-questions)

---

## 1. Purpose and Scope

### 1.1 Purpose

This document specifies the design and implementation of a platform-wide error handling, storage and AI-assisted triage system. The system provides:

- A single, structured ingestion point for errors from all platform surfaces
- Durable, queryable error storage with tenant and severity context
- An event-driven processing pipeline that triggers automatically on error ingestion
- An AI agent capable of deduplicating, summarising and triaging errors without manual intervention
- Automated Jira ticket creation with correct board routing, priority and SLA tracking
- Slack production support notifications routed by severity and component

### 1.2 Scope

**In scope:**
- NestJS backend services (booking, membership, customer, venue, template)
- Next.js Admin Portal
- Next.js Customer Portal
- React Native Mobile App
- A new standalone `error-triage-service`
- Jira Cloud integration
- Slack integration
- SLA deadline tracking and escalation

**Out of scope (initial release):**
- Error replay or retry orchestration
- Customer-facing status page automation
- Automated rollback or circuit-breaker triggering
- Real-time error streaming dashboard (may be addressed in a later phase)

---

## 2. System Context

The platform spans multiple surfaces and services all operating under a multi-tenant model. Errors occurring anywhere in the system must be:

- **Captured** with sufficient context to reproduce and diagnose
- **Attributed** to a tenant so customer impact can be assessed
- **Routed** to the correct engineering team without manual triage
- **Tracked** against an SLA so nothing is silently dropped

Currently there is no centralised error handling. Each service handles (or drops) errors independently. This specification addresses that gap.

### 2.1 Surfaces and Owners

| Surface | Technology | Primary Team |
|---------|-----------|-------------|
| booking-service | NestJS + Fastify | Platform |
| membership-service | NestJS + Fastify | Platform |
| customer-service | NestJS + Fastify | Platform |
| venue-service | NestJS + Fastify | Platform |
| template-service | NestJS + Fastify | Platform |
| admin-portal | Next.js 15 App Router | Frontend |
| customer-portal | Next.js 15 App Router | Frontend |
| mobile-app | React Native | Mobile |

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Platform Surfaces                            │
│  NestJS Services  │  Admin Portal  │  Customer Portal  │  Mobile   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │  POST /errors/ingest
                              ▼
                   ┌─────────────────────┐
                   │  Error Ingestion     │
                   │  API (error-triage-  │
                   │  service)            │
                   └──────────┬──────────┘
                              │
               ┌──────────────┴──────────────┐
               │                             │
               ▼                             ▼
    ┌──────────────────┐         ┌──────────────────────┐
    │  Error Store      │         │  Azure Service Bus    │
    │  (PostgreSQL)     │         │  Topic: errors        │
    └──────────────────┘         └──────────┬───────────┘
                                            │
                                 ┌──────────▼──────────┐
                                 │  Triage Subscriber   │
                                 │  (error-triage-      │
                                 │   service)           │
                                 └──────────┬──────────┘
                                            │
                                 ┌──────────▼──────────┐
                                 │   AI Triage Agent    │
                                 │   (Claude via        │
                                 │    Anthropic SDK)    │
                                 └──┬──────────────┬───┘
                                    │              │
                          ┌─────────▼──┐    ┌──────▼──────┐
                          │ Jira Cloud  │    │  Slack API  │
                          │ (ticket +   │    │  (channel   │
                          │  SLA)       │    │   notify)   │
                          └────────────┘    └─────────────┘
```

### 3.1 Key Design Decisions

**Single ingestion endpoint.** All surfaces post to one internal REST endpoint. This ensures the error envelope is validated and normalised in one place regardless of origin.

**Dual write — store then publish.** The ingestion service writes to the database first, then publishes to the event bus. If the event bus is unavailable, errors are not lost; a background job can replay unprocessed events from the store.

**AI agent, not a rules engine.** Routing, deduplication and ticket writing are delegated to an AI agent rather than a branching rules engine. This handles novel errors gracefully and avoids the maintenance burden of enumerating every routing rule.

**Error triage is off the hot path.** The ingestion API returns `202 Accepted` immediately. Triage is asynchronous. No calling service waits for Jira or Slack.

---

## 4. Component Specifications

### 4.1 Error Ingestion API

**Technology:** NestJS module within `error-triage-service`
**Protocol:** HTTP REST
**Location:** Internal network only — not exposed to the public internet

**Responsibilities:**
- Validate the incoming error envelope
- Assign a UUID if not provided by the caller
- Enrich with server-side timestamp
- Write to the error store
- Publish an event to the Service Bus topic
- Return `202 Accepted`

**Resilience:**
- If the database write fails, return `500` — the caller should retry
- If the Service Bus publish fails after a successful DB write, log the DB record ID; a background sweeper job retries unprocessed records every 60 seconds

### 4.2 Error Store

**Technology:** PostgreSQL (shared cluster, dedicated `errors` schema)
**Retention:** 90 days rolling (configurable per severity — see §11)

**Schema:** See §5.1

**Indexes:**
- `(tenantId, createdAt DESC)` — tenant error history
- `(fingerprint, createdAt DESC)` — deduplication queries
- `(severity, processedAt NULLS FIRST)` — sweeper job query
- `(surface, code, createdAt DESC)` — service-level pattern queries

**Fingerprinting:**
On ingestion, a `fingerprint` hash is computed from `surface + code + normalised_stack_top_frame`. This allows the deduplication query to find recent identical errors without string matching. Normalisation strips line numbers and memory addresses from the top stack frame before hashing.

### 4.3 Event Bus

**Technology:** Azure Service Bus
**Resource:** Topic `errors` with the following subscriptions:

| Subscription | Filter | Consumer |
|---|---|---|
| `triage-critical` | `severity = 'critical'` | Triage service — immediate processing |
| `triage-high` | `severity = 'high'` | Triage service — immediate processing |
| `triage-standard` | `severity IN ('medium','low')` | Triage service — batched processing |
| `analytics` | no filter | Analytics store (future) |

**Message properties:** The full `ErrorEvent` payload is the message body (JSON). `severity`, `surface` and `tenantId` are also set as Service Bus message properties to enable server-side subscription filtering without deserialising the body.

**Delivery:** At-least-once. The triage service uses idempotency checks (via `error_id`) before creating Jira tickets to handle duplicate deliveries.

### 4.4 Error Triage Service

**Technology:** NestJS application, Fastify transport
**Deployment:** Azure Container Apps (separate container from the platform services)
**Scaling:** Min 1 replica, max 3 — scales on Service Bus message depth

**Modules:**

| Module | Responsibility |
|--------|---------------|
| `IngestionModule` | HTTP controller for `POST /errors/ingest` |
| `StoreModule` | Prisma repository for the error store |
| `BusModule` | Service Bus publisher and subscriber setup |
| `TriageModule` | Orchestrates deduplication check and agent invocation |
| `AgentModule` | Wraps the Claude API and tool implementations |
| `JiraModule` | Jira Cloud REST API client |
| `SlackModule` | Slack Web API client |
| `SweepModule` | Background job for unprocessed event replay |

**Triage flow (per message):**

```
1. Deserialise message
2. Check idempotency — has this error_id already been processed?
   └── Yes → acknowledge message, exit
3. Load error record from store (for full detail)
4. Check deduplication:
   a. Query errors with same fingerprint in last 30 minutes
   b. Check for open Jira tickets with same fingerprint label
5. Invoke AI agent with error detail + dedup context
6. Agent returns TriageResult (see §8.3)
7. If duplicate open ticket exists:
   a. Add comment to existing Jira ticket
   b. Post Slack update only if occurrence count crosses a threshold (10x, 50x, 100x)
8. If new issue:
   a. Create Jira ticket
   b. Record SLA deadline in error_sla table
   c. Post Slack notification
9. Mark error record as processed (processedAt = now)
10. Acknowledge Service Bus message
```

### 4.5 AI Triage Agent

Specified in detail in §8.

---

## 5. Data Models

### 5.1 error_events table

```sql
CREATE TABLE errors.error_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at    TIMESTAMPTZ,

  -- Source
  surface         TEXT NOT NULL,         -- 'booking-service', 'admin-portal', etc.
  service_version TEXT,                  -- git SHA or semver tag

  -- Tenant / user context
  tenant_id       TEXT NOT NULL,
  user_id         TEXT,
  session_id      TEXT,
  request_id      TEXT,                  -- distributed trace ID

  -- Error detail
  severity        TEXT NOT NULL,         -- critical | high | medium | low
  code            TEXT,                  -- e.g. 'PAYMENT_FAILED', 'DB_TIMEOUT'
  message         TEXT NOT NULL,
  stack           TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',

  -- Deduplication
  fingerprint     TEXT NOT NULL,         -- hash(surface + code + normalised_stack_top)

  -- Triage outcome
  jira_ticket_id  TEXT,
  slack_message_ts TEXT,
  triage_notes    TEXT                   -- agent summary, stored for audit
);

CREATE INDEX idx_errors_tenant       ON errors.error_events (tenant_id, created_at DESC);
CREATE INDEX idx_errors_fingerprint  ON errors.error_events (fingerprint, created_at DESC);
CREATE INDEX idx_errors_unprocessed  ON errors.error_events (severity, processed_at) WHERE processed_at IS NULL;
CREATE INDEX idx_errors_surface      ON errors.error_events (surface, code, created_at DESC);
```

### 5.2 error_sla table

```sql
CREATE TABLE errors.error_sla (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_id         UUID NOT NULL REFERENCES errors.error_events(id),
  jira_ticket_id   TEXT NOT NULL,
  priority         TEXT NOT NULL,        -- P1 | P2 | P3 | P4

  -- SLA windows
  acknowledge_by   TIMESTAMPTZ NOT NULL,
  resolve_by       TIMESTAMPTZ NOT NULL,

  -- Tracking
  acknowledged_at  TIMESTAMPTZ,
  resolved_at      TIMESTAMPTZ,
  escalated        BOOLEAN NOT NULL DEFAULT false,
  escalated_at     TIMESTAMPTZ,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 5.3 ErrorEvent TypeScript interface

```typescript
// Shared package: @clubandcoach/error-types

export type ErrorSeverity = 'critical' | 'high' | 'medium' | 'low'

export type ErrorSurface =
  | 'booking-service'
  | 'membership-service'
  | 'customer-service'
  | 'venue-service'
  | 'template-service'
  | 'admin-portal'
  | 'customer-portal'
  | 'mobile-app'

export interface ErrorEvent {
  // Optional — server assigns if absent
  id?: string

  // Required by all surfaces
  surface: ErrorSurface
  tenantId: string
  severity: ErrorSeverity
  message: string

  // Strongly recommended
  code?: string           // short machine-readable code
  stack?: string
  requestId?: string      // trace ID from incoming request headers

  // Optional context
  userId?: string
  sessionId?: string
  serviceVersion?: string
  metadata?: Record<string, unknown>
}
```

### 5.4 TriageResult TypeScript interface

```typescript
export interface TriageResult {
  // Deduplication decision
  isDuplicate: boolean
  existingJiraTicketId?: string
  occurrenceCount?: number

  // Ticket fields (populated when isDuplicate = false)
  jiraProject?: string       // e.g. 'INFRA', 'BOOKING', 'MOBILE'
  jiraPriority?: string      // P1 | P2 | P3 | P4
  jiraSummary?: string
  jiraDescription?: string   // Markdown — full context, likely cause, suggested steps
  jiraLabels?: string[]

  // Slack fields
  slackChannel?: string      // e.g. '#prod-critical', '#prod-support'
  slackMessage?: string      // Formatted notification text
  shouldNotifySlack: boolean

  // Reasoning (stored for audit, not sent to Jira/Slack)
  agentReasoning?: string
}
```

---

## 6. API Contracts

### 6.1 POST /errors/ingest

Accepts a structured error event from any platform surface.

**Authentication:** Internal service token (Bearer). Not exposed externally.

**Request body:** `ErrorEvent` (§5.3)

**Responses:**

| Status | Meaning |
|--------|---------|
| `202 Accepted` | Error received, stored, queued for triage |
| `400 Bad Request` | Validation failure — body contains field errors |
| `401 Unauthorized` | Missing or invalid service token |
| `500 Internal Server Error` | Database write failed — caller should retry |

**Example request:**
```json
{
  "surface": "booking-service",
  "tenantId": "tenant_abc123",
  "severity": "high",
  "code": "DB_CONNECTION_POOL_EXHAUSTED",
  "message": "Connection pool exhausted after 30s timeout",
  "stack": "Error: Connection pool exhausted\n    at PostgresAdapter.query (src/db/adapter.ts:142)\n    at BookingRepository.findAvailable (src/booking/booking.repository.ts:67)",
  "requestId": "req_01hx9yz...",
  "userId": "user_xyz",
  "serviceVersion": "a1b2c3d",
  "metadata": {
    "poolSize": 10,
    "activeConnections": 10,
    "waitingRequests": 47,
    "route": "GET /bookings/available"
  }
}
```

**Example response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "accepted": true
}
```

### 6.2 GET /errors (internal, admin use)

Query the error store directly. Used by the sweeper job and for manual investigation.

**Query params:** `tenantId`, `surface`, `severity`, `from`, `to`, `fingerprint`, `processed` (boolean), `limit`, `offset`

---

## 7. Surface Integration Guide

### 7.1 NestJS Services

Add an `ErrorReporterModule` (shared library) to each service. The module provides:

- `ErrorReporterService` — wraps the HTTP call to the ingestion endpoint, automatically appending `surface`, `serviceVersion` and `requestId` from the async context
- `GlobalExceptionFilter` — catches all unhandled NestJS exceptions and calls `ErrorReporterService`
- `tenantId` is extracted from the JWT payload stored in the Fastify request context

```typescript
// In any NestJS service — app.module.ts
@Module({
  imports: [
    ErrorReporterModule.forRoot({
      surface: 'booking-service',
      ingestUrl: process.env.ERROR_INGEST_URL,
      serviceToken: process.env.ERROR_SERVICE_TOKEN,
    }),
  ],
})
export class AppModule {}

// The global filter is registered automatically by ErrorReporterModule.
// For manual reporting:
@Injectable()
export class BookingService {
  constructor(private readonly errors: ErrorReporterService) {}

  async processPayment(tenantId: string) {
    try {
      // ...
    } catch (err) {
      await this.errors.report({
        tenantId,
        severity: 'high',
        code: 'PAYMENT_PROCESSING_FAILED',
        error: err,
        metadata: { provider: 'stripe', amount: 2500 },
      })
      throw err  // re-throw so the controller returns the correct HTTP status
    }
  }
}
```

**What the global filter captures automatically:**
- All unhandled exceptions including NestJS `HttpException` subclasses
- Assigns severity based on HTTP status: 5xx = `high`, 4xx validation errors = `low`, 4xx auth errors = `medium`
- Skips `404` on public routes (too noisy)
- Attaches the route, method and request body (sanitised — strips passwords, card numbers)

### 7.2 Next.js Portals (Admin + Customer)

Two capture points:

**Server-side (App Router):**

```typescript
// app/global-error.tsx
'use client'
import { reportError } from '@/lib/error-reporter'
import { useEffect } from 'react'

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    reportError({
      surface: 'admin-portal',  // or 'customer-portal'
      severity: 'high',
      message: error.message,
      stack: error.stack,
      metadata: { digest: error.digest },
    })
  }, [error])

  return (
    <html>
      <body>
        <h2>Something went wrong</h2>
      </body>
    </html>
  )
}
```

**Client-side unhandled errors:**

```typescript
// lib/error-reporter.ts — loaded in root layout
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    reportError({
      surface: 'admin-portal',
      severity: 'medium',
      message: event.reason?.message ?? String(event.reason),
      stack: event.reason?.stack,
      metadata: { url: window.location.href },
    })
  })
}
```

**API route errors** (middleware wrapping all route handlers):

```typescript
// lib/with-error-handling.ts
export function withErrorHandling(handler: NextApiHandler): NextApiHandler {
  return async (req, res) => {
    try {
      await handler(req, res)
    } catch (err: any) {
      await reportError({
        surface: 'admin-portal',
        severity: 'high',
        message: err.message,
        stack: err.stack,
        metadata: { route: req.url, method: req.method },
      })
      res.status(500).json({ error: 'Internal server error' })
    }
  }
}
```

**`tenantId` resolution in portals:** Read from the session token (the same `tenantId` field present throughout the app). If no session, use `'unauthenticated'`.

### 7.3 React Native Mobile App

Wrap the root component in an error boundary and install a global JS error handler:

```typescript
// App.tsx
import { ErrorBoundary } from './components/ErrorBoundary'
import { setupErrorReporter } from './lib/errorReporter'

setupErrorReporter({
  surface: 'mobile-app',
  ingestUrl: Config.ERROR_INGEST_URL,
  serviceToken: Config.ERROR_SERVICE_TOKEN,
})

export default function App() {
  return (
    <ErrorBoundary>
      <RootNavigator />
    </ErrorBoundary>
  )
}

// lib/errorReporter.ts
ErrorUtils.setGlobalHandler((error, isFatal) => {
  reportError({
    severity: isFatal ? 'critical' : 'high',
    message: error.message,
    stack: error.stack,
    metadata: {
      isFatal,
      platform: Platform.OS,
      version: DeviceInfo.getVersion(),
    },
  })
})
```

**Mobile-specific metadata to include:**
- `platform` (ios | android)
- `appVersion`
- `osVersion`
- `deviceModel`
- `networkType` (wifi | cellular | none)

**Offline buffering:** If the device is offline, errors are queued in AsyncStorage and flushed when connectivity is restored (up to 50 buffered events, oldest-first eviction).

---

## 8. AI Agent Specification

### 8.1 Model

**Provider:** Anthropic
**Model:** `claude-sonnet-4-6` (default) — upgrade to `claude-opus-4-6` for P1/P2 critical path if response quality requires it
**SDK:** `@anthropic-ai/sdk`

### 8.2 System Prompt

```
You are a production support triage agent for a multi-tenant SaaS platform.
Your role is to analyse incoming error events, determine whether they are new issues
or duplicates of known problems, and produce structured triage outputs that are used
to create Jira tickets and Slack notifications.

Platform surfaces: booking-service, membership-service, customer-service,
venue-service, template-service, admin-portal, customer-portal, mobile-app.

Jira boards and their ownership:
- INFRA: Infrastructure, databases, cloud resources, connection pools, deployments
- BOOKING: Booking service application logic, availability, pricing
- MEMBERSHIP: Membership service application logic, renewals, entitlements
- PLATFORM: Cross-cutting platform concerns, auth, API gateway, shared libraries
- FRONTEND: Admin portal, customer portal UI issues
- MOBILE: React Native mobile app

Severity to Jira priority mapping (starting point — use your judgement):
- critical → P1 (production down, data loss risk, all tenants affected)
- high     → P2 (significant functionality broken, some tenants affected)
- medium   → P3 (degraded functionality, workaround exists)
- low      → P4 (minor issue, cosmetic, single tenant edge case)

You may escalate priority if: the error is occurring at high frequency, multiple
tenants are affected, or the metadata suggests data integrity risk.
You may de-escalate priority if: the error appears to be a client-side mistake
(bad input, expired token) rather than a server-side failure.

Always use the available tools before making a decision. Do not fabricate Jira
ticket IDs or assume the state of the system without querying first.

Return your analysis as a structured JSON object matching the TriageResult schema.
```

### 8.3 Tools

```typescript
const tools: Tool[] = [
  {
    name: 'search_recent_errors',
    description: 'Search the error store for recent errors with the same fingerprint or error code. Use this to determine if this is a new issue or part of an ongoing pattern.',
    input_schema: {
      type: 'object',
      properties: {
        fingerprint: { type: 'string', description: 'Error fingerprint hash' },
        windowMinutes: { type: 'number', description: 'How far back to search, in minutes' },
        tenantId: { type: 'string', description: 'Optional — restrict to a single tenant' },
      },
      required: ['fingerprint', 'windowMinutes'],
    },
  },
  {
    name: 'get_open_jira_tickets',
    description: 'Fetch open Jira tickets that match a given fingerprint label or error code. Use this to check whether a ticket already exists before creating a new one.',
    input_schema: {
      type: 'object',
      properties: {
        fingerprint: { type: 'string' },
        errorCode: { type: 'string' },
        project: { type: 'string', description: 'Optional Jira project key to restrict search' },
      },
      required: [],
    },
  },
  {
    name: 'create_jira_ticket',
    description: 'Create a new Jira ticket for this error.',
    input_schema: {
      type: 'object',
      properties: {
        project:     { type: 'string', description: 'Jira project key, e.g. BOOKING' },
        priority:    { type: 'string', enum: ['P1', 'P2', 'P3', 'P4'] },
        summary:     { type: 'string', description: 'Clear, actionable one-line summary' },
        description: { type: 'string', description: 'Full markdown description — include likely cause, context, stack trace and suggested investigation steps' },
        labels:      { type: 'array', items: { type: 'string' } },
        tenantId:    { type: 'string' },
        errorCode:   { type: 'string' },
        fingerprint: { type: 'string' },
      },
      required: ['project', 'priority', 'summary', 'description'],
    },
  },
  {
    name: 'add_jira_comment',
    description: 'Add a comment to an existing Jira ticket, typically to note additional occurrences of a duplicate error.',
    input_schema: {
      type: 'object',
      properties: {
        ticketId:  { type: 'string' },
        comment:   { type: 'string', description: 'Markdown comment body' },
      },
      required: ['ticketId', 'comment'],
    },
  },
  {
    name: 'post_slack_message',
    description: 'Post a production support notification to a Slack channel.',
    input_schema: {
      type: 'object',
      properties: {
        channel: { type: 'string', description: 'e.g. #prod-critical, #prod-support, #prod-log' },
        message: { type: 'string', description: 'Formatted Slack message — plain text with Slack markdown' },
      },
      required: ['channel', 'message'],
    },
  },
  {
    name: 'get_sla_policy',
    description: 'Retrieve the SLA policy for a given priority level — returns acknowledgement and resolution deadlines.',
    input_schema: {
      type: 'object',
      properties: {
        priority: { type: 'string', enum: ['P1', 'P2', 'P3', 'P4'] },
      },
      required: ['priority'],
    },
  },
]
```

### 8.4 User Prompt Template

```typescript
function buildTriagePrompt(error: ErrorEventRecord, dedupContext: DedupContext): string {
  return `
An error has been ingested from the platform. Triage it now.

## Error Details
- ID:          ${error.id}
- Timestamp:   ${error.createdAt.toISOString()}
- Surface:     ${error.surface}
- Severity:    ${error.severity}
- Code:        ${error.code ?? 'not provided'}
- Message:     ${error.message}
- Tenant ID:   ${error.tenantId}
- User ID:     ${error.userId ?? 'not provided'}
- Request ID:  ${error.requestId ?? 'not provided'}
- Version:     ${error.serviceVersion ?? 'not provided'}
- Fingerprint: ${error.fingerprint}

## Stack Trace
\`\`\`
${error.stack ?? 'not provided'}
\`\`\`

## Metadata
\`\`\`json
${JSON.stringify(error.metadata, null, 2)}
\`\`\`

## Deduplication Context
- Occurrences of this fingerprint in the last 30 minutes: ${dedupContext.recentCount}
- Distinct tenants affected: ${dedupContext.distinctTenants}
- Trend: ${dedupContext.trend}  // 'rising' | 'stable' | 'single'

## Instructions
1. Use search_recent_errors to confirm occurrence count and pattern
2. Use get_open_jira_tickets to check for an existing ticket
3. If duplicate: use add_jira_comment to record this occurrence, decide whether to notify Slack
4. If new: determine the correct Jira board and priority, write a clear ticket, post Slack notification
5. Apply appropriate SLA via get_sla_policy
6. Return a TriageResult JSON object

Be concise in Slack messages. Be thorough in Jira descriptions.
`.trim()
}
```

### 8.5 Agent Reasoning Examples

**Example 1 — High-frequency new error:**

> The error code is `DB_CONNECTION_POOL_EXHAUSTED` on `booking-service`. The dedup context shows 47 occurrences in 3 minutes across 2 tenants. `search_recent_errors` confirms this started 4 minutes ago and is rising. `get_open_jira_tickets` returns no match. This is a new cascading failure, not a one-off. Even though the severity is `high`, the frequency and tenant impact warrant P1. Routing to INFRA board (infrastructure failure). Jira description includes the connection pool metadata. Slack message goes to `#prod-critical` with @oncall mention.

**Example 2 — Known duplicate:**

> Fingerprint matches. `get_open_jira_tickets` returns `BOOKING-412` (open, P3). This is the 8th occurrence in 24 hours. `add_jira_comment` records the new occurrence and updated tenant count. `shouldNotifySlack = false` — occurrence count has not crossed a notification threshold. No new ticket created.

**Example 3 — Client error misclassified as high:**

> Error code `INVALID_TOKEN`, surface `customer-portal`, metadata shows a `401` response. The stack trace is from the auth middleware rejecting an expired token. This is user-initiated and expected behaviour — not a service failure. De-escalating from `high` to `low`. No Jira ticket needed. Routing to `#prod-log` with informational note only.

---

## 9. Jira Integration

### 9.1 Authentication

Jira Cloud REST API v3, authenticated via API token (stored in Azure Key Vault, injected as environment variable at runtime).

### 9.2 Custom Fields

The following custom fields are configured on the Jira project(s) and set by the triage service:

| Field | Purpose |
|-------|---------|
| `customfield_tenantId` | Tenant affected — enables JQL queries for customer impact |
| `customfield_errorCode` | Machine-readable error code |
| `customfield_errorFingerprint` | Fingerprint hash for duplicate linking |
| `customfield_surface` | Platform surface where error originated |
| `customfield_slaAcknowledgeBy` | SLA acknowledgement deadline |
| `customfield_slaResolveBy` | SLA resolution deadline |

### 9.3 Jira Ticket Structure

**Summary format:** `[{surface}] {short description} — {errorCode}`
Example: `[booking-service] Connection pool exhausted — DB_CONNECTION_POOL_EXHAUSTED`

**Description format (Markdown):**

```markdown
## Summary
{Agent-generated natural language summary — 2–3 sentences explaining the error and likely impact}

## Error Details
| Field | Value |
|-------|-------|
| Surface | booking-service |
| Severity | high |
| Code | DB_CONNECTION_POOL_EXHAUSTED |
| Tenant | tenant_abc123 |
| Timestamp | 2026-03-20T14:22:01Z |
| Request ID | req_01hx9yz |
| Occurrences (30 min) | 47 |

## Stack Trace
{code}
Error: Connection pool exhausted
    at PostgresAdapter.query (src/db/adapter.ts:142)
    ...
{code}

## Metadata
{code:json}
{
  "poolSize": 10,
  "activeConnections": 10,
  "waitingRequests": 47,
  "route": "GET /bookings/available"
}
{code}

## Likely Cause
{Agent-generated hypothesis}

## Suggested Investigation Steps
{Agent-generated numbered list}

## Links
- Error record: [Internal error dashboard link]
- Runbook: {if applicable}
```

### 9.4 SLA Labels

Each Jira ticket is labelled with `sla-p1`, `sla-p2`, `sla-p3` or `sla-p4` to enable SLA-based JQL filters and board swimlanes.

---

## 10. Slack Integration

### 10.1 Channel Routing

| Channel | Used for | Audience |
|---------|---------|---------|
| `#prod-critical` | P1 and P2 — immediate action required | On-call engineer, team leads |
| `#prod-support` | P3 — review during business hours | Support team, engineering |
| `#prod-log` | P4 and informational dedup updates | Engineering (low noise) |

The AI agent selects the channel. The default mapping is severity-based, but the agent can escalate (e.g. a `medium` error affecting 20 tenants goes to `#prod-critical`).

### 10.2 Notification Format

**P1/P2 — `#prod-critical`:**
```
🔴 *P1 INCIDENT* | booking-service | tenant_abc123
*Connection pool exhausted — all bookings failing*

Occurrences: 47 in 3 min | Tenants affected: 2
Jira: <https://jira.../INFRA-1847|INFRA-1847> | SLA: Acknowledge by 14:37 UTC

Likely cause: Connection leak or DB overload
Suggested: Check pg_stat_activity, review recent deployments
<!oncall> please acknowledge
```

**P3 — `#prod-support`:**
```
🟡 *P3* | membership-service | tenant_xyz
*Renewal notification email failed to send — EMAIL_DISPATCH_FAILED*

Jira: <https://jira.../MEMBERSHIP-203|MEMBERSHIP-203>
```

**Deduplication update (threshold crossed):**
```
ℹ️ *INFRA-1847* — 100 occurrences now recorded (was 10)
Error: DB_CONNECTION_POOL_EXHAUSTED | Still open | <!oncall>
```

---

## 11. SLA Policy

### 11.1 Definitions

| Priority | Criteria | Acknowledge by | Resolve by | Retention |
|----------|---------|---------------|-----------|-----------|
| P1 — Blocker | Production down, data loss risk, all/many tenants | 15 minutes | 2 hours | 1 year |
| P2 — Critical | Major feature broken, multiple tenants impacted | 1 hour | 8 hours | 1 year |
| P3 — Major | Degraded functionality, workaround available | 4 hours | 72 hours | 90 days |
| P4 — Minor | Minor issue, single tenant, cosmetic | 24 hours | Backlog | 90 days |

**Acknowledgement** = a comment or status change on the Jira ticket by an engineer.
**Resolution** = Jira ticket moved to Done.

### 11.2 SLA Escalation

A scheduled job (`SlaEscalationJob`) runs every 5 minutes and queries the `error_sla` table:

```
For each unacknowledged SLA record:
  If now > acknowledge_by AND acknowledged_at IS NULL:
    Post escalation to #prod-critical
    Set escalated = true
    Update Jira ticket priority upward (if not already P1)

For each unresolved SLA record:
  If now > resolve_by - 30min AND resolved_at IS NULL:
    Post 30-minute warning to #prod-critical or #prod-support
  If now > resolve_by AND resolved_at IS NULL:
    Post SLA breach notification
    Mention team lead in Slack
```

### 11.3 SLA Closure

When a Jira ticket is moved to Done, a Jira webhook fires and calls `POST /errors/sla/close` on the triage service, setting `resolved_at` on the matching `error_sla` record. Acknowledgement is tracked by polling the Jira comments API every 2 minutes for open P1/P2 tickets.

---

## 12. Non-Functional Requirements

### 12.1 Performance

| Metric | Target |
|--------|--------|
| Ingestion API p95 latency | < 100ms (write + publish) |
| P1/P2 Slack notification latency | < 60 seconds from error occurring |
| P3/P4 triage latency | < 5 minutes |
| AI agent response time | < 15 seconds per error (Sonnet) |

### 12.2 Reliability

- Ingestion API availability target: 99.9% — errors must not be lost due to triage service downtime
- The dual-write pattern (DB first, then Service Bus) ensures no errors are lost if the event bus is temporarily unavailable
- The sweeper job retries any unprocessed error records every 60 seconds
- Max 3 retry attempts per error event before it is moved to a dead-letter queue and alerted manually

### 12.3 Volume Estimates

| Estimate | Value |
|---------|-------|
| Normal error rate | ~100 errors/hour across all surfaces |
| Peak error rate (incident) | ~5,000 errors/hour |
| Triage service max throughput | 200 events/minute (limited by Claude API rate) |
| At peak, queue depth | ~25 minutes — acceptable given P1/P2 get priority subscription |

### 12.4 Cost Considerations

Claude API usage is per-token. At steady state (~100 errors/hour, average 1,500 tokens per triage):

- ~150,000 tokens/hour → ~$0.45/hour at Sonnet pricing
- Deduplication short-circuits agent invocation for repeat errors — in an incident (high repeat rate) actual cost is much lower
- A cost circuit-breaker is implemented: if triage cost exceeds £50/day, non-critical triage pauses and queues for manual review

---

## 13. Security and Compliance

### 13.1 Sensitive Data Scrubbing

Before any error payload is stored or sent to the AI agent, a scrubbing pass removes or masks:

- Payment card numbers (regex: PAN patterns)
- Passwords and secrets (keys matching: `password`, `secret`, `token`, `key`, `auth` in JSON metadata)
- Full email addresses in stack traces (replaced with `[email]`)
- NHS / national ID numbers (if present in metadata)

Scrubbing is applied at ingestion, before database write.

### 13.2 Tenant Data Isolation

Error records are scoped to `tenantId`. The triage service's deduplication queries always include `tenantId` as a filter when checking for cross-tenant patterns. Cross-tenant correlation (e.g. "this error is affecting 5 tenants") is permitted for triage purposes but individual tenant data is not exposed in another tenant's Jira ticket.

### 13.3 Credentials

| Credential | Storage | Rotation |
|-----------|---------|---------|
| `ERROR_SERVICE_TOKEN` (internal auth) | Azure Key Vault | 90 days |
| `ANTHROPIC_API_KEY` | Azure Key Vault | On rotation by Anthropic |
| `JIRA_API_TOKEN` | Azure Key Vault | 90 days |
| `SLACK_BOT_TOKEN` | Azure Key Vault | 90 days |

### 13.4 Audit Trail

Every AI triage decision is stored in `error_events.triage_notes` and `error_events.jira_ticket_id`. This provides a full audit trail of: what happened, what the agent decided, and what actions were taken.

---

## 14. Delivery Phases

### Phase 1 — Error Capture and Storage (Week 1–2)
**Goal:** Structured errors from all surfaces landing in one database. No AI yet.

- [ ] Create `error-triage-service` NestJS application scaffold
- [ ] Implement `POST /errors/ingest` with validation
- [ ] Create PostgreSQL schema (`errors.error_events`, `errors.error_sla`)
- [ ] Implement fingerprinting on ingestion
- [ ] Add `ErrorReporterModule` shared library
- [ ] Integrate global exception filters into all 5 NestJS services
- [ ] Add `global-error.tsx` and client error handler to admin-portal
- [ ] Add `global-error.tsx` and client error handler to customer-portal
- [ ] Add error boundary and global handler to mobile-app
- [ ] Basic `GET /errors` admin endpoint for querying the store

**Success criteria:** All surfaces are sending structured errors. Error store contains complete, queryable records with tenant context.

---

### Phase 2 — Event Bus and Rule-Based Triage (Week 3–4)
**Goal:** Errors trigger Jira tickets and Slack notifications automatically, using rules.

- [ ] Provision Azure Service Bus topic and subscriptions
- [ ] Implement Service Bus publisher in ingestion service
- [ ] Implement Service Bus subscriber and triage orchestrator
- [ ] Implement basic rule-based routing (severity → Jira project + Slack channel)
- [ ] Jira ticket creation (no AI — templated description)
- [ ] Slack notification posting
- [ ] `error_sla` records written on ticket creation
- [ ] Sweeper job for unprocessed events

**Success criteria:** An error ingested from any surface produces a Jira ticket and Slack message within 60 seconds. No errors dropped.

---

### Phase 3 — AI Agent (Week 5–6)
**Goal:** Replace rule-based routing with the Claude agent.

- [ ] Implement `AgentModule` with Claude SDK integration
- [ ] Implement all 6 agent tools
- [ ] Write and test system prompt and user prompt template
- [ ] Integrate agent into triage orchestrator (replacing rule engine)
- [ ] Store `triage_notes` and `agentReasoning` per decision
- [ ] Cost circuit-breaker implementation
- [ ] Test with real error samples from Phase 1/2 data

**Success criteria:** Agent correctly routes 90%+ of test error scenarios to the right Jira board, priority and Slack channel. Deduplication prevents duplicate tickets for the same ongoing issue.

---

### Phase 4 — SLA Tracking and Escalation (Week 7)
**Goal:** No P1/P2 goes unacknowledged. SLA breaches are surfaced proactively.

- [ ] `SlaEscalationJob` implementation
- [ ] Jira webhook for ticket closure → `resolved_at`
- [ ] Jira polling for P1/P2 acknowledgement
- [ ] Slack escalation messages with team lead mentions
- [ ] SLA breach dashboard query (for future reporting)

**Success criteria:** A P1 ticket that is not acknowledged within 15 minutes triggers an automatic escalation message in `#prod-critical`.

---

## 15. Dependencies and Prerequisites

| Dependency | Owner | Required for Phase |
|-----------|-------|-------------------|
| Azure Service Bus provisioned | Infra | 2 |
| Jira Cloud API token and project keys | Engineering lead | 2 |
| Slack workspace bot token and channel setup | Engineering lead | 2 |
| Anthropic API key | Engineering lead | 3 |
| Jira custom fields configured | Engineering lead | 2 |
| Azure Key Vault with all secrets | Infra | 1 |
| `@clubandcoach/error-types` shared package published | Platform team | 1 |

---

## 16. Open Questions

| # | Question | Owner | Status |
|---|---------|-------|--------|
| 1 | Which Jira projects/boards exist and what are the keys? | Engineering lead | Open |
| 2 | Who is the Slack `@oncall` user group and how is it maintained? | Engineering lead | Open |
| 3 | Should P4 errors create Jira tickets, or only go to `#prod-log`? | CPO / Engineering | Open |
| 4 | What is the SLA for mobile crashes specifically — same as high/critical? | Product | Open |
| 5 | Should the AI agent have access to runbooks (e.g. Confluence)? | Engineering | Open |
| 6 | Is there an existing distributed trace ID / correlation ID header across services? | Platform | Open |
| 7 | Should tenant-specific error rates trigger a separate customer success notification? | CPO | Open |

---

*End of specification*
