# Pilot hierarchy and membership build

**Purpose:** CPO prototype review aid requested in responses 15 and 16.
**Evidence:** Current Prisma schemas and portal capability inventory.
**Date:** 24 August 2026.

This is an implementation description, not a proposed final vocabulary. It shows what the pilot can
represent today, where it differs from the CCM 2.0 product model, and the questions product should
test in the prototype.

## 1. Scope and governing hierarchy

### Product direction

The CPO has confirmed that **tenant means NGB** in product language. An organisation must be able to
associate with multiple tenants/NGBs.

### What the pilot implements

```text
tenant_id (current isolation key; effectively organisation scope)
└── Organisation (exactly one per tenant_id)
    ├── Affiliation ──> governing_tenant_id (many rows allowed)
    └── Venue (zero to many)
```

`venue.organisations.tenant_id` is unique. The row carries `tenant_type` (`enterprise`, `operator`
or `club`), public slug/domain, branding and lightweight website content. `venue.affiliations`
allows an organisation to reference several governing tenant IDs and includes status, effective
dates and a policy-pack reference, but nothing currently enforces NGB-specific visibility or policy.

The affiliation shape is a useful starting point for multi-NGB association, but it does **not** by
itself resolve the product decision because the same `tenant_id` is also used on roughly every
tenant-scoped operational row and request guard.

### Product validation questions

1. Is an organisation always independently operated, even when governed by several NGBs?
2. Can one organisation's data be visible to two NGBs, and is visibility capability/data-type
   specific?
3. Which NGB supplies policy, templates, accreditation status and competition structures when
   several apply?
4. Can an organisation or NGB cross legal data regions? If so, what belongs in the global control
   plane versus the regional silo?
5. Should `operator` be a grouping above organisations rather than an organisation type?

## 2. Place and bookable-capacity hierarchy

### Current pilot shape

```text
Organisation
└── Venue
    ├── ResourceGroup (optional grouping)
    │   └── Resource
    └── Resource (may exist without a group)
        └── BookableUnit
            ├── parentUnitId (optional hierarchy)
            └── UnitConflict <──> other BookableUnit
```

| Pilot level | Meaning | Important behaviour |
|---|---|---|
| Organisation | Operating club/provider record | Owns branding, portal slug and venues in the pilot. |
| Venue | Physical site | Timezone, city and country; availability/settings scope. |
| ResourceGroup | Optional grouping within a venue | Groups resources for navigation/configuration, e.g. “Clay Courts”. |
| Resource | Physical asset/type, e.g. court, pitch, lane or studio | Holds sport, surface, indoor/lighting and public attributes. |
| BookableUnit | Exact reservable capacity/configuration | Supports full/half/split layouts, capacity, parent relationship and optional extras. |
| UnitConflict | Bidirectional capacity-conflict edge | Booking one unit blocks incompatible units such as two halves versus a full court. |

Availability is modelled separately through `AvailabilityConfig`, `SeasonalSchedule`, blackout
dates and booking rules. Those concepts can apply at different scopes and are not extra physical
levels.

### Comparison with product terminology

| Product term | Closest pilot term | Assessment |
|---|---|---|
| Location | Venue | Likely rename, subject to language review. |
| Facility | ResourceGroup or Resource | Not a clean one-to-one mapping; prototype review required. |
| Resource | Resource or BookableUnit depending use | Ambiguous until “thing described” and “capacity reserved” are separated in product language. |
| No direct equivalent | BookableUnit | Pilot capability that should remain explicit if split/composite capacity is required. |
| Ruleset / TimingRule / Schedule | BookingRule / AvailabilityConfig / SeasonalSchedule | Overlapping concepts, not direct renames. |

### Scenarios to run in the prototype

- A venue containing two banks of courts with shared seasonal opening hours.
- A full pitch divisible into two halves where either halves or full pitch can be reserved.
- A resource with an optional changing room or equipment add-on.
- An operator with three sites needing shared reporting but local settings and permissions.
- One organisation affiliated to two NGBs with different rules/templates.

Record where the labels confuse the user separately from where the model cannot express the
scenario. A language problem should not automatically trigger a schema change.

## 3. Membership build

### Current pilot shape

```text
MembershipScheme
└── MembershipPlan
    ├── pricing / duration / eligibility configuration
    ├── MembershipPlanEntitlement ──> EntitlementPolicy
    └── Membership
        ├── ownerType + ownerId
        ├── customerId (optional compatibility link)
        ├── MembershipParticipant (one or many people)
        ├── MembershipLifecycleEvent
        └── MembershipAudit
```

### What each level means

| Pilot model | Purpose |
|---|---|
| MembershipScheme | Top-level grouping for related offerings. Organisation-scoped. |
| MembershipPlan | The purchasable/assignable offer: ownership type, duration, visibility, status, membership type, sport category, eligibility, public visibility and sort order. |
| Plan pricing | `pricingModel`, price, currency, billing interval and `instalmentCount`, plus a one-to-one pricing configuration table. |
| Plan duration | Duration type plus a one-to-one duration configuration. |
| EntitlementPolicy | Reusable benefit/access rule attached to a plan with optional scope. |
| Membership | The live relationship to an owner, with dates, renewal, lifecycle, payment status and reference/source. |
| MembershipParticipant | Supports individual/household/group membership and identifies the primary member. |
| Lifecycle/Audit | Records status movement and administrative activity. |

### User-visible pilot behaviour

Administrators can create schemes and plans, configure pricing/entitlements, assign memberships,
manage status transitions, process renewal workflows and see unpaid/renewal alerts. Customers can
browse public plans, join, see already-member/success states and view their current membership in
their account.

### Gaps against the product specification

1. **No CostPeriod entity.** `instalmentCount` is configuration only; there is no schedule of dated
   obligations, amounts, payment allocation or per-period status.
2. **Commerce is not authoritative.** Membership stores `paymentStatus`, `paymentMethod`,
   `paymentAmount` and `paymentReference`, and membership joining does not create the same Commerce
   order/ledger record as the wired booking/coaching/team journeys.
3. **No immutable transaction ledger, Invoice, Credit, GiftCard or first-class Discount.** These are
   Commerce gaps, not fields to add independently to Membership.
4. **Cross-organisation identity is absent.** A person holding memberships in several organisations
   has separate organisation-scoped records rather than one platform Person with several Contacts.
5. **Enrolment consistency is unresolved.** Membership owns joining, while Coaching and Competition
   own their own enrolment/entry lifecycles. Shared forms, waitlists, cancellations, refunds and
   participant rules may diverge.

### Scenarios to run in the prototype

- Individual rolling monthly membership with auto-renewal.
- Household annual membership with a primary payer and several participants.
- Fixed-season junior membership payable in three instalments.
- A membership purchased alongside another product in one basket/order.
- Mid-period cancellation, refund or credit with a clear audit trail.
- One person holding memberships at two organisations under one sign-in.
- A plan whose entitlement grants early booking at selected resources only.

### Decisions requested from prototype review

1. Does Scheme → Plan → Membership match product language, or should Package/Member terminology be
   retained?
2. Is CostPeriod-level obligation tracking needed for pilot, self-service launch or later?
3. Are household/group participants correctly represented beneath one Membership?
4. Which changes to enrolment must behave identically across Membership, Coaching, Competition and
   social Events?
5. Should multi-item checkout be a foundation requirement or a later Commerce capability?
6. Which membership payment fields should remain as read projections once Commerce is authoritative?

## 4. Interpretation rule

The hierarchy and membership models above are **what the pilot has**, not automatic product
approval. Prototype validation should produce one of three outcomes per difference:

- terminology change only;
- retained implementation with an explicit product exception; or
- target model/migration change with an ADR and delivery phase.
