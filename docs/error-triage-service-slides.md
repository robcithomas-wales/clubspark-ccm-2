# Error Handling & AI Triage Service — Presentation Summary

> **For:** 2–3 slide deck
> **Audience:** Leadership / stakeholders
> **Date:** March 2026

---

## Slide 1 — The Problem

### Heading
**Every platform breaks. Right now, nobody knows until a customer tells us.**

### Current state

The platform runs across 6 backend services, 2 web portals, and a mobile app. When something goes wrong anywhere in that system today:

- Each service handles — or silently drops — its own errors independently
- There is no central view of what is failing, how often, or for which customers
- The engineering team finds out when a customer raises a ticket with the support team
- That ticket arrives as a plain-text email with no diagnostic information
- The support team escalates it as an unstructured note (PSN) to the platform team
- The platform team starts from zero — no stack trace, no affected tenant, no frequency data

**The result:** issues that could be resolved in minutes take hours. Customers are affected for longer than necessary. The engineering team spends time gathering information that the system already had.

### Key message
> *We are the last people to know when our own platform breaks. That needs to change.*

---

## Slide 2 — The Solution: Fully Automated Error Intelligence

### Heading
**From silent failure to structured, AI-triaged engineering tickets — automatically**

### How it works

Every service, portal, and mobile app sends errors to a single point the moment they occur. From there, everything is automated — no human touches the process until a diagnosed, structured ticket lands in Jira.

```
Any error, anywhere on the platform
              │
              ▼
    Single ingestion endpoint
    (captures: error, stack trace,
     affected tenant, severity,
     which service, what the user
     was doing when it happened)
              │
              ▼
         Error store
    (90-day history, fully queryable,
     deduplicated by fingerprint)
              │
              ▼
       AI Triage Agent
    ┌──────────────────────────────────────┐
    │  1. Is this a duplicate?             │
    │     → If yes: increment count,       │
    │       don't create another ticket    │
    │                                      │
    │  2. Which team owns this?            │
    │     → Route by service / component   │
    │                                      │
    │  3. How urgent is it?                │
    │     → Severity: critical / high /    │
    │       medium / low                   │
    │                                      │
    │  4. Write the ticket                 │
    │     → Title, description, steps to   │
    │       reproduce, affected tenants,   │
    │       frequency, suggested fix       │
    └──────────────────────────────────────┘
              │                    │
              ▼                    ▼
         Jira ticket           Slack alert
    (correct board, priority,  (right channel,
     SLA deadline set,          right team,
     ready to action)           immediate)
```

### What the engineering team sees

Instead of: *"Hi, the booking thing isn't working for one of our customers"*

They get a Jira ticket that already contains:
- Which service failed, which endpoint, which line
- How many times this has happened in the last hour
- Which tenants (customers) are affected
- The full stack trace
- A severity level and SLA deadline
- The AI's assessment of likely cause and suggested investigation steps

**Time from error occurring to actionable Jira ticket: under 60 seconds. Zero human involvement.**

---

## Slide 3 — What This Enables

### Heading
**Proactive, not reactive. The platform team knows before the customer does.**

### The outcomes

| Before | After |
|---|---|
| Engineering finds out from a customer email | Engineering finds out the moment the error occurs |
| Unstructured PSN with no context | Structured Jira ticket with full diagnostic context |
| Duplicate reports pile up on the same issue | AI deduplicates — one ticket, one owner, one fix |
| No SLA on platform issues | Every ticket has an SLA deadline, tracked automatically |
| Support team acts as a relay | Support team directly sees known issues — can inform customers proactively |

### The bridge to customer support

When a platform error is known, the Customer Support AI Agent (separate system) can cross-reference it in real time. If a customer raises a ticket about the same issue, the AI already knows engineering is on it — and tells the customer immediately, without routing to a human at all.

**The two systems together mean:** customers get informed responses about platform issues before the support team even reads the email.

### SLA policy

| Severity | What it means | Response SLA | Resolution SLA |
|---|---|---|---|
| Critical | Platform down / data loss risk | 15 minutes | 4 hours |
| High | Major feature broken for multiple tenants | 1 hour | 8 hours |
| Medium | Degraded experience, workaround exists | 4 hours | 48 hours |
| Low | Minor / cosmetic, single tenant | 24 hours | 1 week |

### Key message
> *This is not a monitoring dashboard someone has to watch. It is an automated pipeline that does the triage, writes the ticket, and alerts the right person — the moment something goes wrong, every time.*
