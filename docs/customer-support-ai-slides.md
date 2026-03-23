# Customer Support AI Agent — Presentation Summary

> **For:** 2–3 slide deck
> **Audience:** Leadership / stakeholders
> **Date:** March 2026

---

## Slide 1 — The Problem and the Opportunity

### Heading
**From reactive triage to AI-powered, account-aware support**

### Current state (left column / "before")
- Every inbound ticket is triaged manually
- Support agents work blind — no visibility of the customer's account when they open a ticket
- Technical issues escalated as unstructured notes to the platform team
- No distinction between "the product is broken" and "I don't know how to use it"
- Team capacity consumed by volume, not complexity

### The opportunity (right column / "after")
- The platform already knows everything about each customer: their bookings, membership, recent activity, engagement level, and any errors on their account
- An AI agent can read all of this the moment a ticket arrives — before any human is involved
- 40–60% of tier-1 queries can be resolved autonomously, with a response that references the customer's actual account
- Every ticket that does reach a human arrives fully briefed — not as a raw email

### Key message
> *Most AI support tools are generic because they don't know your customers. Ours does.*

---

## Slide 2 — How It Works

### Heading
**An AI agent that knows your customer before it says hello**

### The flow (as a visual sequence or numbered steps)

```
1.  Customer sends an email
       ↓
2.  AI agent identifies them by email address
       ↓
3.  Pulls their full account context in real time:
       • Active membership status and plan
       • Last 10 bookings — including any that failed and why
       • Engagement level, lifecycle state, roles (coach, junior, member)
       • Any known platform errors affecting their account in the last 48 hours
       ↓
4.  Searches the knowledge base for relevant articles
       ↓
5.  Makes a decision:

    ┌─────────────────────────────────────────────────────────┐
    │  Known platform issue? → Inform customer, close ticket  │
    │  Resolvable from KB?   → Respond directly, close ticket │
    │  Guidance question?    → Route to Customer Success      │
    │  Technical failure?    → Route to Support Analyst       │
    └─────────────────────────────────────────────────────────┘
```

### Example (call-out box)
> *Customer: "I tried to book Court 3 on Saturday but it didn't work."*
>
> *AI response (30 seconds later):*
> "Hi Sarah — I can see your attempt for Court 3 at 10am on Saturday wasn't successful as that slot had already been taken. Courts 1 and 2 still have availability this weekend — shall I check specific times for you? Your Club Membership gives you full access to both."
>
> **Resolved. No human involved.**

### When a human does get involved
They receive a structured, pre-filled ticket — not a raw email — including:
- Customer profile and membership status
- The specific booking or payment event that triggered the issue
- AI's assessment of the likely cause
- Suggested first response

---

## Slide 3 — The Team and What It Enables

### Heading
**A leaner, smarter team focused on what matters**

### Proposed team structure

```
Head of Customer Services
        │
        ├── Customer Support Team Lead
        │         └── Support Analyst
        │              (technical issues, platform failures)
        │
        └── Customer Success Team Lead
                  └── Customer Success Manager ×1–2
                       (onboarding, renewals, at-risk accounts)
```

### What changes for each role

| Role | Today | With AI agent |
|---|---|---|
| Support Analyst | Manually triages every email from scratch | Receives fully briefed tickets for genuine technical issues only |
| Customer Success Manager | Reactive — works from ticket queue | Proactive — works from account intelligence (at-risk alerts, engagement scores, renewal signals) |
| Team Lead | Managing ticket volume | Managing AI quality, knowledge base, and escalations |
| Platform team | Receives unstructured PSNs from CS | Receives structured Jira tickets with full diagnostic context — or is already aware before the customer raises a ticket |

### The numbers (targets)
- **40–60%** of inbound tickets resolved autonomously by AI
- **< 30 seconds** to first meaningful response for auto-resolved queries
- **0** tickets reaching a human without full account context attached
- **Proactive outreach** for at-risk accounts before they churn

### The bigger picture
> This is possible because we own our customer data. Every booking, every membership, every session — it all lives in our platform. The AI doesn't need a sync to Salesforce or a HubSpot integration. It reads our own APIs. That's the advantage of building this ourselves.
