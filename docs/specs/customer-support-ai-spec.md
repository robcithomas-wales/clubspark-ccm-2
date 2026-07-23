# Technical Specification: Customer Support AI Agent

**Document status:** Draft
**Version:** 1.0
**Date:** 2026-03-23

---

## Table of Contents

1. [Purpose and Scope](#1-purpose-and-scope)
2. [Current State and Gap](#2-current-state-and-gap)
3. [Vision](#3-vision)
4. [Architecture Overview](#4-architecture-overview)
5. [The AI Agent](#5-the-ai-agent)
6. [Support Context Service](#6-support-context-service)
7. [Knowledge Base](#7-knowledge-base)
8. [Routing Logic](#8-routing-logic)
9. [Zendesk Integration](#9-zendesk-integration)
10. [Error-Triage Bridge](#10-error-triage-bridge)
11. [Team Structure and Responsibilities](#11-team-structure-and-responsibilities)
12. [Data Models](#12-data-models)
13. [API Contracts](#13-api-contracts)
14. [Delivery Phases](#14-delivery-phases)
15. [Open Questions](#15-open-questions)

---

## 1. Purpose and Scope

### 1.1 Purpose

This document specifies an AI-first customer support and success system that sits between the customer and the human support team. The system uses the platform's own APIs to deeply understand each customer's account context before any human interaction occurs — enabling the AI to resolve issues autonomously, route accurately, and equip human agents with a complete picture before they read a single word of the customer's message.

### 1.2 What makes this different

Most AI support tools are generic — they work from a knowledge base and have no understanding of the specific customer's account. This system is different because the platform already owns the authoritative data:

- Every booking this customer has made, including failed attempts
- Their current membership status, plan, and entitlements
- Their lifecycle state, engagement score, and recent activity
- Their roles (coach, junior, committee member, parent/guardian)
- Any platform errors that occurred on their account in the last 48 hours

The AI uses all of this before deciding how to respond. The result is support interactions that feel personally informed rather than generic.

### 1.3 Scope

**In scope:**
- AI triage agent (Claude API with tool use)
- Support context service (aggregates platform APIs)
- Knowledge base (articles, FAQs, troubleshooting guides)
- Zendesk ticket creation and enrichment
- Routing to Customer Support (technical) vs Customer Success (guidance)
- Bridge to error-triage-service for known platform issues
- Intake via email; extensible to in-app widget and web chat

**Out of scope (initial release):**
- Outbound proactive communications (automation-service, Phase 4 of people platform)
- Phone / voice support
- Multi-language support
- Customer-facing status page automation
- Full Zendesk workflow automation beyond ticket creation and routing

---

## 2. Current State and Gap

### 2.1 Current support model

```
Customer → Email → Zendesk (manual triage) → Team member responds
                                            ↓
                              Technical issues → PSN to Platform team
                              (unstructured, no account context)
```

**Team:** 1 Head of CS, 2 Team Managers, 2 Support Analysts.

**Pain points:**
- Every ticket is triaged manually by a non-technical person
- No account context at point of triage — agent is working blind
- Anything technical becomes a manual escalation to the platform team (PSN)
- No separation between "the product is broken" and "I don't know how to use it"
- No systematic use of knowledge articles — resolution depends on individual memory
- Platform team receives unstructured bug reports with no diagnostic context

### 2.2 The opportunity

The platform has rich customer data across bookings, memberships, people records and error logs. Currently none of this is surfaced at the point of a support interaction. An AI agent with access to these APIs could:

- Resolve 40–60% of tier-1 enquiries autonomously (knowledge base + account status)
- Provide human agents with a fully briefed, structured ticket rather than a raw email
- Distinguish technical failures from usage questions before a human reads the ticket
- Detect known platform issues and inform customers proactively, without human involvement

---

## 3. Vision

### 3.1 Target model

```
Customer (email / widget / chat)
        │
        ▼
┌───────────────────────────┐
│     AI Triage Agent        │  ← Claude API (tool use)
│                           │
│  1. Identify customer      │  ← people-service
│  2. Load account context   │  ← support-context-service
│  3. Check known issues     │  ← error-triage-service
│  4. Search knowledge base  │  ← knowledge base
│  5. Decide and act         │
└───────────────────────────┘
        │
   ─────┼────────────────────────────────────────────────
   │         │              │                │
   ▼         ▼              ▼                ▼
Resolve   Known issue    Support queue   Success queue
& close   → inform       (technical)     (guidance)
          customer       Zendesk +       Zendesk +
          & close        full context    full context
                              │               │
                              ▼               ▼
                       Support Analyst    CSM / Success Lead
                              │
                              ▼ (if platform bug confirmed)
                         Jira ticket
                     (via error-triage-service)
```

### 3.2 Example interaction

**Customer email:** *"Hi, I tried to book Court 3 on Saturday morning but it didn't work. I'm a member so I should be able to book it."*

**AI agent (internal process):**
1. Identifies customer by email address → Sarah Jones
2. Calls `GET /support/context?email=sarah@example.com`:
   - Active Club Membership, valid until December 2026
   - Last booking attempt: Saturday 10:00, Court 3, status: `BOOKING_CONFLICT`
   - Last successful booking: Wednesday, Court 1
   - No known platform errors on this tenant in the last 48 hours
3. Searches knowledge base for "booking conflict"
   → Finds: "Court 3 is only bookable up to 7 days in advance for members"
4. Determines: auto-resolvable — the slot was genuinely taken, not a platform error

**AI response to customer:**
> *Hi Sarah — I can see your booking attempt for Court 3 on Saturday at 10am wasn't successful because that slot had already been taken. Courts 1 and 2 still have availability on Saturday morning — would you like me to check specific times for you? Your Club Membership gives you full access to both. Let me know and I'll help you get booked in.*

**Ticket: closed without human involvement.**

---

**Alternative — platform issue detected:**

**Customer email:** *"I keep getting an error when I try to pay for my membership renewal."*

**AI agent (internal process):**
1. Identifies customer → Tom Bradley
2. Calls `GET /support/context?email=tom@example.com`:
   - Membership expired 2 days ago, renewal attempted twice, both failed
3. Queries error-triage-service: known issue found — payment gateway timeout affecting renewals, Jira ticket ENG-2847 raised 4 hours ago, engineering investigating

**AI response:**
> *Hi Tom — our engineering team identified an issue with membership renewals earlier today and are actively working on a fix. Your membership won't lapse during this time. We'll send you a confirmation as soon as it's resolved — usually within a few hours. Sorry for the inconvenience.*

**Ticket: closed. No human involved. Customer informed. Engineering already knows.**

---

## 4. Architecture Overview

### 4.1 System components

| Component | Technology | Responsibility |
|---|---|---|
| **AI Triage Agent** | NestJS service + Claude API (claude-sonnet-4-6) | Orchestrates the triage flow using tool use |
| **Support Context Service** | New module in `people-service` or standalone | Aggregates account data from all platform APIs |
| **Knowledge Base** | Supabase (pgvector for semantic search) | Articles, FAQs, troubleshooting guides |
| **Zendesk** | Zendesk REST API | Ticket creation, queue routing, SLA tracking |
| **Error-Triage Bridge** | HTTP call to `error-triage-service` | Known issue lookup by tenant and timeframe |
| **Intake handler** | Email webhook (Zendesk inbound) or custom | Receives customer messages, triggers agent |

### 4.2 Technology decisions

**Claude API (claude-sonnet-4-6) with tool use:**
The agent does not simply generate text. It executes a structured decision process using tool calls — each tool is an API call to the platform. Claude decides which tools to call, in what order, and what to do with the results. This is the correct pattern for an agent that needs to look up account data before it can respond intelligently.

**Tool use vs RAG:**
Standard RAG (retrieval-augmented generation) retrieves documents and generates a response. This agent additionally calls live APIs — the customer's actual account state at the time of the enquiry. The combination of live account data + knowledge base retrieval is what makes the responses feel genuinely informed rather than generic.

**Supabase pgvector for knowledge base:**
The existing Supabase instance supports the `pgvector` extension. Knowledge base articles are stored with vector embeddings so the agent can find semantically relevant content even when the customer's wording doesn't match article keywords exactly.

---

## 5. The AI Agent

### 5.1 Agent service

A new NestJS service (`support-agent-service`) or a module within an existing service. Receives an intake event, runs the triage loop, and produces one of four outcomes.

### 5.2 Tool definitions

The agent has access to the following tools:

```typescript
tools: [
  {
    name: 'get_customer_context',
    description: 'Look up a customer by email and return their full account context including recent bookings, membership status, lifecycle state, roles and last activity.',
    input_schema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Customer email address' }
      },
      required: ['email']
    }
  },
  {
    name: 'search_knowledge_base',
    description: 'Search the knowledge base for articles relevant to the customer\'s issue. Returns ranked articles with titles and summaries.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The customer\'s issue described in their own words' },
        limit: { type: 'number', description: 'Number of articles to return (default 3)' }
      },
      required: ['query']
    }
  },
  {
    name: 'get_known_issues',
    description: 'Check whether there are any known platform issues affecting this customer\'s tenant in the last 48 hours.',
    input_schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string', description: 'The tenant ID from the customer context' },
        since: { type: 'string', description: 'ISO 8601 datetime — how far back to look (default: 48 hours ago)' }
      },
      required: ['tenantId']
    }
  },
  {
    name: 'send_direct_response',
    description: 'Send a direct response to the customer and mark the ticket as resolved without human involvement.',
    input_schema: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        subject: { type: 'string' },
        body: { type: 'string', description: 'The response to send. Should be warm, specific to their account, and actionable.' },
        resolution_summary: { type: 'string', description: 'Internal summary of how the issue was resolved (stored for reporting)' }
      },
      required: ['email', 'subject', 'body', 'resolution_summary']
    }
  },
  {
    name: 'create_support_ticket',
    description: 'Create a ticket in Zendesk for the human support team. Used when the issue cannot be auto-resolved.',
    input_schema: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        subject: { type: 'string' },
        queue: { type: 'string', enum: ['support', 'success'], description: 'support = technical/broken; success = guidance/how-to/relationship' },
        priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
        category: { type: 'string', description: 'Short category label e.g. booking-failure, membership-renewal, access-issue' },
        customer_context: { type: 'object', description: 'The full context object from get_customer_context' },
        ai_assessment: { type: 'string', description: 'Claude\'s assessment of the likely cause and suggested first action for the human agent' },
        known_issue_ref: { type: 'string', description: 'Jira ticket reference if a known issue was found, otherwise null' }
      },
      required: ['email', 'subject', 'queue', 'priority', 'category', 'customer_context', 'ai_assessment']
    }
  }
]
```

### 5.3 System prompt

```
You are the first point of contact for customer support at a sports facility management platform.
Your job is to understand the customer's issue, look up their account context, and either:
  a) Resolve it directly with a warm, specific, helpful response, or
  b) Route it to the right human team with a fully enriched ticket.

Always start by looking up the customer's context. Never respond generically when you have
account-specific information available.

When routing to a human:
- 'support' queue: the platform is broken, something isn't working as expected
- 'success' queue: the customer needs guidance, training, or has a relationship question

Be warm, specific, and brief. Refer to the customer by first name. Reference their actual
account data (membership status, specific booking dates) to show you understand their situation.
Do not invent information. If you are unsure, route to a human rather than guessing.
```

### 5.4 Triage decision tree

```
Intake received
      │
      ▼
get_customer_context(email)
      │
      ├─ Customer not found → ask for clarification or create unlinked ticket
      │
      ▼
get_known_issues(tenantId)
      │
      ├─ Known issue matches → send_direct_response (inform + reference Jira)
      │
      ▼
search_knowledge_base(issue description)
      │
      ├─ High confidence match + account context confirms no platform error
      │         → send_direct_response (resolve autonomously)
      │
      ├─ Issue is guidance / how-to
      │         → create_support_ticket(queue: 'success')
      │
      ├─ Issue is technical / something is broken
      │         → create_support_ticket(queue: 'support')
      │
      └─ Ambiguous
                → create_support_ticket(queue: 'support', priority: 'normal')
```

---

## 6. Support Context Service

### 6.1 Purpose

A single endpoint that aggregates all relevant account data for a customer, called by the AI agent as its first action on every inbound ticket. Prevents the agent from making 4–5 separate API calls and assembles the context in a shape optimised for the AI prompt.

### 6.2 Endpoint

```
GET /support/context?email={email}
    x-tenant-id: {tenantId}   (from intake handler — resolved from inbound email domain or explicit header)
```

### 6.3 Response shape

```typescript
interface SupportContext {
  found: boolean

  person: {
    id: string
    name: string
    email: string
    phone: string | null
    lifecycleState: string       // active | inactive | lapsed | churned
    engagementBand: string | null // high | medium | low | dormant
    lastActivityAt: string | null
    memberSince: string
    roles: string[]              // ['member', 'coach', 'junior', ...]
    tags: string[]               // ['at-risk', 'vip', 'lapsed-member', ...]
  }

  membership: {
    active: boolean
    planName: string | null
    status: string | null        // active | expired | cancelled | pending
    expiresAt: string | null
    autoRenew: boolean
  } | null

  recentBookings: Array<{
    date: string
    unitName: string
    venueName: string
    status: string               // active | cancelled | no-show
    bookingReference: string
  }>                             // last 10 bookings, most recent first

  lastFailedBooking: {
    date: string
    unitName: string
    errorCode: string            // BOOKING_CONFLICT | BOOKING_UNIT_INACTIVE | etc.
  } | null

  outstandingBalance: number | null

  tenantId: string
}
```

### 6.4 Implementation

This module makes internal service-to-service calls (not external HTTP — internal within the platform). It can live as a new module in `people-service` or as a standalone lightweight service. The calls it makes:

- `people-service` — person record, roles, tags, engagement
- `booking-service` — recent bookings, last failed booking
- `membership-service` — active membership, plan, status

All calls are made in parallel (`Promise.allSettled`) so the response time is bounded by the slowest single service call, not the sum.

---

## 7. Knowledge Base

### 7.1 Structure

Articles stored in a `support.knowledge_articles` table in Supabase:

```sql
CREATE TABLE support.knowledge_articles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID,                    -- null = platform-wide article
  title        TEXT NOT NULL,
  slug         TEXT NOT NULL,
  category     TEXT NOT NULL,
    -- 'booking' | 'membership' | 'payment' | 'account' | 'technical' | 'general'
  content      TEXT NOT NULL,           -- markdown
  embedding    vector(1536),            -- pgvector embedding for semantic search
  is_published BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON support.knowledge_articles USING ivfflat (embedding vector_cosine_ops);
```

### 7.2 Semantic search

Embeddings generated using the Anthropic embeddings API (or OpenAI text-embedding-3-small). On each search query, the query is embedded and cosine similarity used to find the closest articles:

```sql
SELECT title, content, 1 - (embedding <=> $1) AS similarity
FROM support.knowledge_articles
WHERE is_published = true
  AND (tenant_id = $2 OR tenant_id IS NULL)
ORDER BY similarity DESC
LIMIT $3
```

### 7.3 Initial article set

Minimum viable knowledge base for launch:

| Category | Articles |
|---|---|
| Booking | How to make a booking, How to cancel a booking, Understanding booking conflicts, Advance booking windows by membership type |
| Membership | How to renew, How to upgrade a plan, Member benefits by plan, What happens when membership expires |
| Account | How to reset your password, How to update contact details, How to add a family member |
| Technical | What to do if the app won't load, Clearing cache and cookies, Browser compatibility |
| Payments | How to update payment details, Understanding invoices, Refund policy |

---

## 8. Routing Logic

### 8.1 Queue assignment

| Signal | Queue | Rationale |
|---|---|---|
| Known platform error detected | Auto-resolve | Engineering already aware — inform and close |
| Last booking failed with error code | `support` | Technical failure — needs investigation |
| Membership payment failed | `support` | Payment/technical — needs investigation |
| "How do I" language + no error codes | `success` | Guidance query |
| Onboarding / new member (< 30 days) | `success` | Success team owns onboarding |
| Billing dispute / refund request | `support` | Financial — needs analyst |
| Coach-related queries | `success` | Relationship question |
| Access denied / permissions issue | `support` | Technical — entitlements configuration |
| Ambiguous | `support` | Default to technical; success team can reassign |

### 8.2 Priority assignment

| Signal | Priority |
|---|---|
| Affects multiple bookings / whole facility | `urgent` |
| Active membership + payment failure | `high` |
| Engagement band = `high` or `vip` tag | `high` |
| Single booking failure | `normal` |
| Guidance / how-to | `low` |
| Lapsed or churned customer | `low` |

---

## 9. Zendesk Integration

### 9.1 Ticket payload

When the AI creates a Zendesk ticket, it includes a structured internal note alongside the customer-facing description — giving the human agent everything they need before they start:

```
TICKET SUBJECT: Booking failure — Court 3 Saturday [AUTO-TRIAGED]

CUSTOMER MESSAGE:
"Hi, I tried to book Court 3 on Saturday but it didn't work..."

─── AI TRIAGE SUMMARY ────────────────────────────────
Customer:       Sarah Jones (sarah@example.com)
Member since:   January 2026
Membership:     Club Plan — Active (expires Dec 2026)
Engagement:     High

Last booking:   Wednesday, Court 1 — successful
Failed attempt: Saturday 10:00, Court 3 — BOOKING_CONFLICT

AI assessment:  Likely genuine conflict (slot taken). No platform
                errors detected on this tenant. Customer may have
                misunderstood availability board — Court 3 showed
                available in UI but was taken by the time they submitted.
                Recommend: confirm with customer, check if availability
                board caching issue (see ENG-2801 — similar report last week).

Suggested first response:
  Apologise for confusion, confirm slot was taken, offer alternative
  times on Courts 1/2 this weekend.

Known issues:   None active on this tenant.
─────────────────────────────────────────────────────
```

### 9.2 Queue mapping

| AI queue | Zendesk group |
|---|---|
| `support` | Customer Support — Analysts |
| `success` | Customer Success — CSMs |

### 9.3 Zendesk inbound email as intake

Zendesk can be configured to forward inbound emails to a webhook before creating a ticket. This webhook is the intake point for the AI agent. The agent processes the email, then either:
- Responds directly (no Zendesk ticket created), or
- Creates a Zendesk ticket via the API with the enriched payload

This means Zendesk remains the system of record for all human-handled interactions, while autonomous resolutions are logged separately for reporting.

---

## 10. Error-Triage Bridge

### 10.1 Query

When the AI agent calls `get_known_issues(tenantId, since)`, it queries the error-triage-service:

```
GET /errors/known-issues?tenantId={id}&since={iso8601}

Response:
[
  {
    jiraRef: "ENG-2847",
    title: "Payment gateway timeouts on membership renewal",
    severity: "high",
    status: "investigating",
    affectedSince: "2026-03-23T09:15:00Z",
    estimatedResolution: "2026-03-23T14:00:00Z"
  }
]
```

### 10.2 Proactive resolution

When a known issue is found that matches the customer's complaint, the AI:
1. Sends a direct response acknowledging the issue and referencing the status
2. Does **not** create a Zendesk ticket (the engineering team already has the Jira ticket)
3. Logs the interaction for reporting (how many customers were affected and informed)

### 10.3 Reverse bridge

When the error-triage-service creates a new high-severity Jira ticket, it can optionally notify the support-agent-service. This enables proactive outreach — contacting affected customers before they raise a ticket. (Phase 3 capability — requires the comms-service from the people platform spec.)

---

## 11. Team Structure and Responsibilities

### 11.1 Proposed team

```
Head of Customer Services
      │
      ├── Customer Support Team Lead (hands-on)
      │         └── Customer Support Analyst (×1)
      │
      └── Customer Success Team Lead (hands-on)
                └── Customer Success Manager (×1–2)
```

### 11.2 Role clarity

**AI Agent** — tier-1 (40–60% of all inbound volume). Resolves knowledge-base queries, known-issue notifications, simple account status questions. No human involvement.

**Customer Support Analyst** — tier-2. Technical failures, billing issues, anything the AI couldn't resolve that needs investigation. Works from enriched Zendesk tickets — never starts from a raw email.

**Customer Success Manager** — proactive, not primarily reactive. Owns onboarding for new venues, health checks, renewal conversations, at-risk account outreach. May receive routed tickets for relationship or guidance issues but this is not their primary mode. The People Platform's engagement scoring and lifecycle states feed their proactive work.

**Customer Support Team Lead** — handles escalations from the Support Analyst, manages the AI agent's knowledge base (adding and updating articles), reviews autonomous resolution quality weekly.

**Customer Success Team Lead** — owns the CSM portfolio, identifies churn signals from platform data, escalates relationship issues to Head of CS.

### 11.3 Escalation path

```
Customer
    → AI Agent (auto-resolve or route)
    → Support Analyst / CSM
    → Team Lead
    → Head of CS
    → Platform team (Jira) ← only for confirmed platform bugs
```

The goal is to make the "blind PSN to platform team" nearly obsolete. Confirmed platform bugs are detected by the error-triage-service before customers raise them, or identified by the Support Analyst from the AI's enriched assessment.

---

## 12. Data Models

### 12.1 Support interactions log

```sql
CREATE TABLE support.interactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  person_id         UUID,                    -- null if customer not identified
  customer_email    TEXT NOT NULL,
  received_at       TIMESTAMPTZ NOT NULL,
  channel           TEXT NOT NULL,           -- 'email' | 'widget' | 'chat'
  raw_message       TEXT NOT NULL,

  -- AI processing
  ai_model          TEXT NOT NULL,           -- 'claude-sonnet-4-6'
  ai_latency_ms     INTEGER,
  context_loaded    BOOLEAN DEFAULT false,
  known_issue_ref   TEXT,                    -- Jira ref if found

  -- Outcome
  outcome           TEXT NOT NULL,
    -- 'auto_resolved' | 'routed_support' | 'routed_success' | 'known_issue_informed'
  zendesk_ticket_id TEXT,                    -- if routed
  resolution_note   TEXT,                    -- AI's summary if auto-resolved

  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON support.interactions (tenant_id, received_at DESC);
CREATE INDEX ON support.interactions (person_id) WHERE person_id IS NOT NULL;
CREATE INDEX ON support.interactions (outcome, received_at DESC);
```

### 12.2 Knowledge base (see Section 7.1)

---

## 13. API Contracts

### 13.1 Support context

```
GET  /support/context?email={email}
     x-tenant-id: {tenantId}
→    SupportContext
```

### 13.2 Knowledge base

```
GET  /support/kb/search?q={query}&limit={n}
     x-tenant-id: {tenantId}
→    Array<{ id, title, category, summary, similarity }>

GET  /support/kb/articles
POST /support/kb/articles
GET  /support/kb/articles/:id
PUT  /support/kb/articles/:id
DEL  /support/kb/articles/:id
```

### 13.3 Interactions log

```
GET  /support/interactions?page=1&limit=25&outcome={filter}
GET  /support/interactions/:id
```

### 13.4 Error-triage bridge (consumed, not owned)

```
GET  /errors/known-issues?tenantId={id}&since={iso8601}
```

---

## 14. Delivery Phases

### Phase 1 — Context + Routing (Weeks 1–2)

**Goal:** AI reads account context and routes correctly to Zendesk with enriched tickets. No autonomous resolution yet — every ticket still gets a human, but that human is fully briefed.

- [ ] Support context service (`GET /support/context`)
- [ ] Support agent service scaffold (NestJS + Claude API)
- [ ] Tool: `get_customer_context`
- [ ] Tool: `create_support_ticket` (Zendesk API integration)
- [ ] Intake handler (Zendesk inbound email webhook)
- [ ] Zendesk ticket enrichment with AI triage summary
- [ ] Support/success queue routing
- [ ] Interactions log
- [ ] Admin portal: basic interaction log view

**What this unlocks:** Human agents are never working blind. Every ticket arrives with customer profile, recent activity, AI assessment, and suggested first response.

---

### Phase 2 — Knowledge Base + Auto-Resolution (Weeks 3–4)

**Goal:** AI resolves tier-1 queries autonomously. Human ticket volume drops 40–60%.

- [ ] Knowledge base schema and pgvector setup
- [ ] Seed initial article set (20–30 articles)
- [ ] Article embedding pipeline (embed on create/update)
- [ ] Tool: `search_knowledge_base`
- [ ] Tool: `send_direct_response`
- [ ] Auto-resolution logic in triage agent
- [ ] Admin portal: knowledge base management (CRUD articles)
- [ ] Admin portal: auto-resolution rate reporting
- [ ] Weekly quality review process for the Team Lead

**What this unlocks:** The majority of "how do I?" queries never reach a human. Support team focuses on genuinely complex issues.

---

### Phase 3 — Error-Triage Bridge (Week 5)

**Goal:** AI is aware of known platform issues and informs customers proactively — before they raise a second ticket.

- [ ] Error-triage bridge endpoint in `error-triage-service`
- [ ] Tool: `get_known_issues`
- [ ] Known-issue auto-resolution flow
- [ ] Interaction log: track `known_issue_informed` outcome
- [ ] (Optional) Reverse bridge: error-triage notifies support-agent on new high-severity issues

**What this unlocks:** Customers affected by platform issues receive an informed, proactive response. The "platform team blind PSN" pattern is eliminated.

---

### Phase 4 — CSM Intelligence + Proactive Outreach (Weeks 6–8)

**Goal:** CSMs stop working from a ticket queue and start working from account intelligence.

- [ ] People platform engagement scoring feeds CSM dashboard
- [ ] At-risk accounts surfaced automatically (lifecycle = lapsed, engagement = dormant)
- [ ] Proactive outreach triggers (via comms-service, people platform Phase 3)
- [ ] CSM account portfolio view in admin portal
- [ ] Integration with people platform AI insights (Claude weekly at-risk report)

**What this unlocks:** Customer Success operates proactively. Churn is caught before it happens, not after the cancellation email arrives.

---

## 15. Open Questions

1. **Intake channel:** Should the AI agent intercept emails before they enter Zendesk (via webhook), or should it work from Zendesk triggers after ticket creation? Webhook gives more control; Zendesk triggers are simpler to set up.

2. **Customer identification:** Customers won't always email from their registered address. What's the fallback identification flow — ask for their email, booking reference, or postcode?

3. **Tenant identification:** How is the tenant determined from an inbound email? Options: email domain mapping, subdomain of support URL, explicit customer portal origin header.

4. **Knowledge base ownership:** Who writes and maintains articles — the Support Team Lead, or a shared responsibility? Needs a clear owner to avoid staleness.

5. **GDPR / data handling:** The AI prompt will contain personal data (name, booking history). Does this need to be reviewed by legal before the Claude API is used for this purpose? Anthropic's data processing agreement may need to be in place.

6. **Autonomous response tone:** Should auto-resolved responses be sent immediately, or queued for a brief review window (e.g. 15 minutes) before sending? A review window reduces the risk of a poor AI response reaching a customer.
