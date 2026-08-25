# CPO product and architecture decisions — 24 August 2026

## Context

This record maps the CPO response to the 20 confirmation questions in **CCM 2.0 Product Docs vs
Pilot Build — Engineering Review**. It separates product intent from current implementation so a
confirmed target is not mistaken for functionality already delivered.

Status meanings:

- **Confirmed** — direction is settled; detailed design or sequencing may remain.
- **Open** — a further product/architecture decision is required.
- **Deferred** — direction is known but not required for pilot/initial phases.
- **Discovery** — evidence is required before deciding.

## Decisions and actions

| # | Status | CPO direction | Engineering implication / action |
|---|---|---|---|
| 1 | **Confirmed direction; blocking gap** | Tenant continues to mean NGB. The design must address an organisation associated with multiple tenants. | Current `tenant_id` is the organisation isolation key and `venue.organisations.tenant_id` is unique. Produce an ADR for NGB tenant, organisation association, request scope, migration and residency. Do not relabel the current key as the final product tenant. |
| 2 | **Confirmed direction; target architecture open** | A platform-level person is important. A person/user spanning organisations is essential and cross-tenant support is preferred. | Current `people.persons` is organisation-scoped and therefore Contact-equivalent. Define Platform Person, organisation Contact/Profile, auth identity links, deduplication, consent and cross-region rules. Not required for pilot, but no dependent feature should assume the current row is the final identity model. |
| 3 | **Confirmed** | CCM 2.0 must honour data residency and regional silos; capability map to be updated. | Keep residency as an explicit invariant. Cross-tenant Person, NGB aggregation and multi-org reporting require a global control plane and region-aware contracts. |
| 4 | **Confirmed** | Commerce is authoritative for all payment-related information. | Operational domains own charge reason/eligibility/fulfilment; Commerce owns Orders, monetary snapshots, Payments, Refunds and future ledger records. Close membership and competition order bypasses. Sequence Invoice, Transaction, Credit, GiftCard and Discount scope separately. |
| 5 | **Open — stress test required** | Domain-owned enrolment is not rejected, but duplicated implementations must be justified. | Compare a shared enrolment capability with domain-owned enrolment on lifecycle, participant rules, waitlists, forms, refunds, reporting, capacity and change cost. Do not promote the current split to an invariant yet. |
| 6 | **Open** | No CPO comment on Automation. | Retain as unconfirmed pilot scope. Its dependency role for onboarding/lifecycle journeys remains to be sequenced. |
| 7 | **Deferred; approach confirmed** | Initially consume safeguarding, DBS and qualification status from NGBs. Direct integrations may come later. NGB work itself is later in the plan. | Model verified external status/provenance when scheduled; do not build direct accreditation ownership for pilot or misrepresent playing-standard Work Cards as compliance. |
| 8 | **Open** | No CPO comment on Custom Forms. | Keep pilot timing and ownership open. Include forms in enrolment stress testing because several domains require equivalent gating behaviour. |
| 9 | **Confirmed foundation** | Website builder is a core module needed for Foundations. | Current light CMS is partial only. Define Website, Page, ContentBlock, Asset, publishing, SEO, permissions and member-only content scope. |
| 10 | **Confirmed target decomposition** | Coach-led multi-activity/multi-session events become a Coaching format; tournaments move to Recreational Competitions; create a separate basic social/ticketed Events feature. | Retire “Events” as an overloaded domain term. Define migration/URL/content ownership and shared registration/payment needs. |
| 11 | **Confirmed staged direction** | Club/coach site discovery exists through Website Manager; provide embeddable third-party widgets first. Later add aggregation across clubs/coaches for ELPs and possible ClubSpark programme/session search. | Treat widgets as the initial owned-discovery surface; sequence aggregator/index/search contracts later. |
| 12 | **Deferred** | LTA will not be the first partner. NGB/Authority-owned templates can come later. | Remove LTA-first assumptions. Defer Authority template entity and ProgrammeTemplate → ProgrammeInstance migration until an identified partner/phase. |
| 13 | **Deferred with trigger** | Operating profiles are not required for pilot but are required for self-service onboarding. | Design after core platform shape stabilises; make self-service onboarding the entry criterion. |
| 14 | **Deferred / discovery** | Tournament Desk and Control Centre are later-phase products and each needs a detailed assessment. | No pilot dependency. Produce separate discovery/specification before committing ingest direction or cutover. |
| 15 | **Open validation** | CPO needs the hierarchy implemented in the pilot to test against the prototype. Language needs a broader review. | Use [`../reference/pilot-hierarchy-and-membership.md`](../reference/pilot-hierarchy-and-membership.md). Record prototype findings before renaming Location/Venue, Facility/ResourceGroup or retaining BookableUnit. |
| 16 | **Open validation** | CPO needs the membership build output to sense-check against the product specification. | Use [`../reference/pilot-hierarchy-and-membership.md`](../reference/pilot-hierarchy-and-membership.md). Decide whether CostPeriod-level obligation/instalment tracking is required and align money ownership with Commerce. |
| 17 | **Temporary decision; discovery** | Keep Team Fixture and Competition Match separate for now. Steph owns further discovery. | Preserve both models. Do not create automatic convergence until ownership of schedule, participants, result, squad/fees and standings is decided. |
| 18 | **Open — reframe required** | The CPO did not understand the question. | Re-ask plainly: “Should the organisation that buys/pays for ClubSpark be modelled separately from the NGB/Authority that governs sport, even when they are currently the same organisation?” Current entitlements already separate subscription data from governing affiliation; product sign-off remains. |
| 19 | **Open; leaning grouping** | CPO leans towards a grouping level above organisations but wants implications worked through. | Compare explicit Operator/Group with Authority reuse: ownership, config inheritance, permissions, reporting, shared people, billing, residency and organisations belonging to several groups. Produce ADR before modelling. |
| 20 | **Mixed decisions** | See retained-build matrix below. | Update capability map and stop treating rejected/tender-derived features as committed platform scope. |

## Question 20 — retained-build matrix

| Built capability | Decision | Follow-up |
|---|---|---|
| Accounting sync | **Retain** | Integration domain; keep Xero/QuickBooks direction. |
| Split payments | **Retain** | Required in Booking and potentially other domains; define whether Commerce owns a reusable split allocation/payment contract. |
| Disciplinary cases | **Remove from committed product scope** | LTA-tender-derived; preserve code until an explicit decommission decision, but do not roadmap further work. |
| Work cards with external ratings | **Remove from committed product scope** | LTA-tender-derived; do not confuse with future accreditation/compliance. |
| Rankings engine | **Discovery** | Research established rating integrations versus owning an engine before further investment. |
| AI analytics set | **Retain** | Add to capability map and roadmap. |
| Internal staff portal | **Retain** | Add to capability map and roadmap. |

## Confirmed sequencing summary

### Pilot / foundations

- Website builder is a foundation capability.
- Current pilot hierarchy and membership must be validated by product before terminology/model
  changes.
- Platform Person and operating profiles are not pilot requirements, but must remain explicit
  target commitments.

### Later phases

- NGB compliance consumption and Authority-owned templates.
- Tournament Desk and Control Centre after dedicated assessment.
- Aggregated ELP/ClubSpark programme and session discovery.
- Operating profiles as part of self-service onboarding.

### Decisions still required

1. Tenant/NGB versus current organisation scoping ADR.
2. Platform Person/Contact/auth/residency ADR.
3. Shared versus domain-owned enrolment stress test and decision.
4. Custom Forms scope and timing.
5. Pilot hierarchy terminology after prototype review.
6. Membership CostPeriod/obligation requirements after prototype review.
7. Platform commercial account versus Authority clarification.
8. Multi-site Group/Operator implications and ADR.
9. Rankings build-versus-integrate discovery.

## Source status

This document records product responses supplied on 24 August 2026. Statements about the current
pilot were verified against the repository schemas and existing engineering review. It authorises
documentation alignment only; it does not claim that target architecture changes are implemented.
