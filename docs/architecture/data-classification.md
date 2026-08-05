# Data classification — global vs regional

> **Status:** Accepted · **Created:** 2026-08-05 · **Gate 1 item G1.4**
> **Question it answers:** for every entity on the platform, does it live in the global control
> plane or inside a regional silo?
> **Parent:** [`../roadmap/pilot-to-production.md`](../roadmap/pilot-to-production.md) ·
> **ADR:** [`scalability-and-multi-region.md`](scalability-and-multi-region.md)

Data residency is a **hard** requirement: an EU tenant's customer data must never leave the EU.
That makes this classification a legal boundary, not an engineering preference. Getting it wrong is
not a refactor — it is migrating live customer data across a jurisdiction.

Verified against all 15 `schema.prisma` files and the live database on 2026-08-05. **120 models:
89 directly tenant-scoped, 27 inheriting tenancy through a foreign-key chain, 4 genuinely global**
— plus 2 tenant-registry tables that are keyed by tenant but must nonetheless live in the control
plane. Counts are computed by resolving each model's relation chain, not by grepping for
`tenant_id`; the difference between the two is 27 tables.

## The rule

> **Regional by default. Global only by explicit exception, listed below.**

Default-deny, in the same spirit as the tenant guard. A new table is regional unless someone argues
it onto the global list in review. The failure mode of a wrong "regional" call is a duplicated
lookup table; the failure mode of a wrong "global" call is customer data in the wrong jurisdiction.

**The test for global:** the control plane must be able to answer it *before it knows which region
to route to*. That is a very short list — essentially "which region is this tenant in?" and "what is
this tenant allowed to do?". Everything else can wait until the request has landed in a region.

## Global — the control plane

Six models: the four-table plan catalogue, plus the tenant registry. Nothing here is tenant-owned
customer data.

The two registry tables are the awkward case. They *do* carry `tenant_id` — but as the key
identifying which tenant a row describes, not as a marker that the row lives inside that tenant's
data. A registry row is metadata *about* a tenant, held by the platform.

| Model | Table | Why global |
|---|---|---|
| `Organisation` (admin-service) | `admin.organisations` | **The tenant registry.** Routing reads it to find a tenant's home region, so it cannot live inside a region — that would be circular. Carries `tenant_id` as its key, not as a residency marker. |
| `Plan` (entitlement-service) | `entitlements.plans` | Platform plan catalogue. No `tenant_id`; identical in every region. |
| `Feature` | `entitlements.features` | As above. |
| `PlanFeature` | `entitlements.plan_features` | As above. |
| `AddOn` | `entitlements.add_ons` | As above. |
| `Organisation` (venue-service) | `venue.organisations` | ⚠️ **Contested — see below.** Currently a second tenant registry. |

Note that the *catalogue* is global but every *subscription to it* is not: `OrgSubscription`,
`OrgPlanOverride` and `OrgAddOn` all carry `tenant_id` and are regional. The catalogue says what a
plan is; the subscription says what a specific customer bought, which is commercial data about a
real organisation.

## Regional — everything else

The other 116 models, in two forms:

**Directly tenant-scoped (89 models)** — carry `tenant_id` and are filtered by the tenant guard on
every query.

**Tenancy inherited through a foreign key (27 models)** — no `tenant_id` column of their own; they
reach a tenant-scoped ancestor through a relation chain. `BookingAddOn`→`Booking`,
`Division`→`Competition`, `AvailabilityResponse`→`Fixture`, `UnitConflict`→`BookableUnit`,
`PaymentAttempt`→`Payment`, and 22 more.

> ⚠️ **These 27 are the ones that will catch you out.** They are regional, but you cannot select
> them by tenant without a join — and for some the chain is more than one hop. Any operation that
> reasons about a tenant's data as a set — a regional export, a GDPR erasure, moving a tenant
> between regions, or proving a region holds no data it shouldn't — has to traverse the parents. A
> query that filters `WHERE tenant_id = $1` across "every table" silently misses all 27.

Resolving tenancy transitively is what distinguishes these from the genuinely global four. A naive
"has no `tenant_id`" check finds 31 tables and would wrongly promote 27 tenant-owned tables into the
control plane — which, applied literally, means customer data in the wrong jurisdiction.

## Consequences

**1. The tenant registry is currently split in two, and both copies are regional.**
`admin.organisations` and `venue.organisations` are separate tables in separate schemas, each with
a `UNIQUE (tenant_id)`, each holding a different half of the truth — admin has plan/status/billing,
venue has branding, domain and portal config. Both live in the same database as customer data.

There is already a sync: venue-service upserts into `admin.organisations`, so venue is effectively
the write source for the shared fields and admin holds the platform metadata on top. That is a
usable basis — it means the split is a one-way flow rather than two independent writers — but the
direction has never been written down or enforced, and admin-service's upsert quietly accepts
whatever venue sends.

A control plane needs *one* registry, and it must sit outside every region, because resolving
"which region?" cannot itself require knowing the region. Before region two exists, that flow needs
declaring explicitly: admin authoritative for platform facts, venue for presentation, neither
silently overwriting the other.

`home_region` is already fenced off from it — the sync's `update` branch cannot touch the column,
because a branding sync must not be able to move where a tenant's data legally lives.

This is not urgent while there is one region and one row in each. It becomes a blocker the moment
there are two regions, and it is much cheaper to settle now than to reconcile two divergent
registries later.

**2. `admin.organisations.region` is not the residency field.** It exists, it is `String?`, it is
indexed, and it is NULL on the only row. It is used solely as an optional filter and free-text field
on the internal organisations CRUD — no semantics, no enforcement, no meaning. **Do not overload
it.** G1.3 adds `home_region` as a separate, non-null, enforced column; conflating a nullable
free-text filter with a legal boundary is precisely the kind of shortcut that produces a data
residency incident.

**3. Global data must be replicated read-only into regions, never written from them.** The plan
catalogue is read on hot paths (entitlement checks), so a cross-region call per check is not
viable. Regions get a read replica or a projection; writes go to the control plane. Two regions
writing the same catalogue row is a conflict with no correct resolution.

## Enforcement

Until there is a second region none of this can be verified by running the system, so it has to be
held in review:

- **New table with no `tenant_id`?** It is either a child of a tenant-scoped parent (fine — record
  which parent) or it is a claim to be global (needs an argument, and an entry in the table above).
- **New global entity?** It must be justified against the routing test: does the control plane need
  it before it knows the region?
- **Anything that enumerates "all of a tenant's data"** must handle the 27 inherited-tenancy models.
  The tenant guard does not help here — it filters queries, it does not enumerate tables.

`@architecture-reviewer` checks the first two on structural changes.

## What this does not cover

Where the *data* lives, not where *traffic* goes. Request routing, regional DNS, and the gateway are
Gate 3 ([`../roadmap/pilot-to-production.md`](../roadmap/pilot-to-production.md)). This document is
only the answer to "if we stood up region two tomorrow, what would have to be copied and what would
have to stay put?"
