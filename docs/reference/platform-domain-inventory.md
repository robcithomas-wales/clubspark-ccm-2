# Platform Domain Inventory
**Prepared for:** CPO  
**Date:** April 2026 · **Product alignment updated:** 24 August 2026
**Purpose:** Accurate baseline of all built domains and available functionality — starting point for gap analysis and feature roadmap.

> **Current versus target:** This inventory describes the running pilot. It does not redefine the
> CPO-approved product vocabulary. In the target model, **tenant means NGB**, an organisation may
> associate with multiple tenants, and a platform-level Person may span organisations and ideally
> tenants. The pilot currently scopes most records by an organisation-equivalent `tenant_id` and
> stores organisation-scoped Person records. See the [CPO decision log](../decisions/2026-08-24-cpo-product-architecture-decisions.md)
> and [pilot model review aid](pilot-hierarchy-and-membership.md).

---

## How to read this document

Each section covers one domain. Within each domain:
- **Data models** — what the platform stores
- **API capabilities** — what operations exist (create, read, update, delete, and any non-CRUD logic)
- **Admin portal** — what admins can do
- **Customer portal / Mobile** — what members/customers can do

All 15 backend services are live. The admin portal, customer portal (web), and mobile app (Expo/React Native) are all deployed.

---

## Domain 1 — Venues & Facilities

### Data models
| Model | What it stores |
|---|---|
| **Venue** | Name, timezone, city, country. Linked to an organisation. |
| **Organisation** | The operating club/provider record in the pilot. Name, slug, about text, logo and branding. This is not the target NGB tenant itself. |
| **ResourceGroup** | Named grouping of resources (e.g. "Clay Courts", "Grass Courts"). Has sport, colour, sort order. |
| **Resource** | A bookable physical asset — court, pitch, lane, etc. Properties: name, resource type, sport, surface, indoor/outdoor, lighting availability, booking purposes (array), active status, public attributes (JSON), visible attributes. |
| **BookableUnit** | A bookable slot configuration on a resource. Supports full/half/split configurations. Has capacity, type, sort order, optional-extra flag (e.g. changing room, ball machine). Units can have a parent unit (hierarchical — booking a half-court blocks the full court). |
| **UnitConflict** | Bidirectional conflict graph — if unit A and unit B conflict, booking one prevents the other. |
| **AddOn** | A product or service attached to a booking (balls, coaching extra, access card, etc.). Properties: name, code (unique per tenant), category, pricing type (fixed/included), price, currency, inventory mode (unlimited / shared pool / tracked), allowed resource types. |
| **VenueSetting** | 1:1 per venue. Controls: open bookings toggle, add-ons enabled, pending approvals mode, split payments, public booking view, club code, branding overrides. |
| **BlackoutDate** | Prevents bookings for a date range. Scoped to venue or individual resource. Supports single day, date range, and recurring rules (RRULE). |

### API capabilities
- Full CRUD on venues, resource groups, resources, bookable units
- Unit conflict management (create/delete bidirectional conflict pairs)
- Add-on CRUD with inventory tracking
- Blackout date CRUD with recurrence support
- Venue settings read/update
- Organisation settings read/update
- Active resource listing with filtering by venue and sport

### Admin portal
- Create and edit venues with timezone, location, branding
- Build resource hierarchy (groups → resources → bookable units)
- Configure add-ons with pricing, category, and inventory mode
- Define unit conflicts to prevent double-booking of related spaces
- Set blackout dates (per venue or per resource; recurring)
- Toggle open/pending-approval booking mode per venue
- Enable/disable split payments, add-ons, public booking view

### Customer portal / Mobile
- Browse venues and resources with surface/indoor/lighting detail
- Resource cards show name, sport, surface attributes as pills
- All booking entry points surface facility details

---

## Domain 2 — Availability

### Data models
| Model | What it stores |
|---|---|
| **AvailabilityConfig** | Opening hours, slot duration (minutes), booking interval (minutes), max advance booking (days), release time (hours before). Scoped to venue, resource group, or individual resource. Optionally scoped to a day of week. Can be linked to a seasonal schedule. |
| **SeasonalSchedule** | A named schedule period (start/end date) linked to a venue. Multiple availability configs can reference the same seasonal schedule to swap operating hours by season. |

### API capabilities
- CRUD on availability configs with scope inheritance (venue → group → resource)
- Day-of-week overrides within a config
- Seasonal schedule CRUD and linking to configs
- Available slot calculation — given a resource/date, returns open slots honouring configs, blackouts, and existing bookings
- Slot availability query used by both booking creation and the public booking wizard

### Admin portal
- Create and edit availability configs at any scope level
- Visual availability board: date + venue picker, slot grid showing booked vs available per unit
- Stat cards: bookable units, available slots, booked slots (released vs unreleased)
- Create seasonal schedules and link configs to them for seasonal operating hour changes

### Customer portal / Mobile
- Available slots surfaced in booking wizards (facility and coaching)
- Unavailable slots shown with a "Booked" indicator (striped style on web, greyed on mobile)
- 14-day date strip for date selection in both web and mobile wizards

---

## Domain 3 — Bookings

### Data models
| Model | What it stores |
|---|---|
| **Booking** | Core booking record. Unit, resource, slot (start/end datetime), customer ID, status (pending/active/cancelled/completed/no_show), payment status (unpaid/paid/part_paid/failed/waived), price, source (admin/portal/app/api), add-on IDs, notes, external reference. |
| **BookingSeries** | Recurring booking definition. RRULE (repeat rule), slot start/end time, unit. Parent record — individual bookings reference this. |
| **BookingRule** | Access and pricing rule. Subject type (everyone / role / membership_plan / membership_scheme), scope (organisation / resource_group / resource), price per slot, active status. Controls who can book and at what price. |
| **SplitPayment** | Per-payer record on a booking. Person ID, amount owed, payment status. Multiple per booking. |

### API capabilities
- CRUD on bookings with status and payment status lifecycle
- Booking series creation (expands to individual bookings via RRULE)
- Cancel individual occurrence or entire series
- Split payment creation and per-payer status updates
- Booking rule CRUD with subject and scope targeting
- Stats endpoints: daily stats (30-day rolling), booking counts by status
- Pending bookings queue with timestamps for SLA monitoring
- Approve / reject pending bookings

### Admin portal
- Full booking list with status/date filters
- Day-view calendar (06:00–22:00, 30-min grid) showing all booked units; colour-coded by status
- Pending approval queue with SLA indicators (>4h amber, >24h red); inline approve/reject
- Individual booking detail: customer info, slot, unit, status/payment lifecycle, split payments, add-ons, audit trail
- Create booking (admin-side): venue/unit/slot picker, customer search/create, pricing, add-ons, payment method
- Recurring booking series list and series detail (all occurrences, cancel series/occurrence)
- Booking rules: create and manage access/pricing rules by subject and scope

### Customer portal / Mobile
- 5-step facility booking wizard (venue → resource → date → slot → confirm)
- Slot selection: units grouped, availability indicators, morning/afternoon/evening grouping
- Account page: upcoming and past bookings, cancel booking (with confirmation)
- Mobile: cancel via native Alert confirmation dialog

---

## Domain 4 — Coaching

### Data models
| Model | What it stores |
|---|---|
| **Coach** | Person ID reference, bio, specialties (array), active status. |
| **LessonType** | Name, description, sport, duration (minutes), price per session, active status. Many-to-many with coaches. |
| **CoachingSession** | Date/time, coach ID, lesson type ID, resource/venue (optional), status (scheduled/confirmed/completed/cancelled/no_show), payment status, notes. |
| **SessionParticipant** | Person on a coaching session (many per session). |

### API capabilities
- CRUD on coaches, lesson types, coaching sessions
- Coach availability slot calculation (respects lesson duration and existing sessions)
- Participant add/remove on sessions
- Session status and payment status lifecycle

### Admin portal
- Coach roster with bio, specialties, assigned lesson types, active status
- Lesson type catalogue with sport, duration, pricing
- Session list with filters (coach, status); status and payment badges
- Session detail: participants, payment status, notes
- Create session (admin-side assignment)

### Customer portal / Mobile
- 6-step coaching booking wizard: coach → lesson type → date → slot → confirm → done
- Coach cards show name, bio, specialties
- Lesson type cards show duration and price
- Available slot list fetched per coach/lesson type
- Session booked as "pending" (awaiting admin confirmation)

---

## Domain 5 — Membership

### Data models
| Model | What it stores |
|---|---|
| **Scheme** | Top-level membership structure. Name, status, description, code. Groups related plans. |
| **Plan** | Specific membership offering. Linked to scheme. Properties: name, type (individual/household/student/junior/senior/corporate/group), pricing model (one_time/recurring/free), price, billing interval, duration type (fixed/rolling), sport category, sort order, eligibility settings, active status. |
| **Policy** | Reusable entitlement rule. Policy type (e.g. booking_discount, priority_access, member_rate). Description. Library item — assigned to plans. |
| **Membership** | Individual member record. Person ID, plan ID, start/end date, status (pending/active/suspended/lapsed/cancelled/expired), payment status, auto-renew flag, renewal reminder sent timestamp. |

### API capabilities
- Full CRUD on schemes, plans, policies, memberships
- Membership status lifecycle (activate, suspend, lapse, cancel, expire)
- Auto-renew flag toggle
- Membership bulk assignment to multiple people
- Stats: counts by status, upcoming renewals (7/14/30/60-day windows), unpaid active memberships
- Renewal reminder tracking (prevents duplicate reminder sends)
- Eligibility checking (plan-level rules used by booking rules)

### Admin portal
- Scheme management: create/edit schemes, view linked plans
- Plan management: full pricing and entitlement configuration, assign policies
- Policy library: create and manage reusable entitlement rules
- Membership list with status tabs (All/Pending/Active/Suspended/Lapsed/Cancelled/Expired/Renewals Due) and payment status filter
- Individual membership detail: plan, dates, payment status, lifecycle events, entitlement summary
- Bulk assign memberships to multiple people
- Renewals workflow: process renewals, view revenue at risk
- Alerts: unpaid active memberships (red banner), renewals due in 30 days (amber banner)

### Customer portal / Mobile
- Membership plan listing with pricing cards (featured plan highlighted)
- Benefits list shown on plans
- Join a plan (calls `joinMembership`)
- Already-member state and post-join success state shown
- Account page shows current membership status card (plan name, status, start/end date, price)

---

## Domain 6 — People (CRM)

### Data models
| Model | What it stores |
|---|---|
| **Person** | Organisation-scoped contact/profile in the pilot: identity details, lifecycle, roles, household flag and notes. A cross-organisation platform Person remains target architecture. |
| **Tag** | Free-text label attached to a person. Tenant-scoped. |
| **Relationship** | Typed link between two persons (e.g. parent/child, partner). |
| **Segment** | Named group of people. Type: static (manually curated list) or dynamic (AND/OR rule engine). |
| **SegmentMember** | Person-to-segment membership. Static segments only — dynamic segments are resolved at query time. |

### API capabilities
- Full CRUD on persons, tags, relationships
- Lifecycle state management
- Segment CRUD: static segments with member add/remove; dynamic segments with rule-based resolution
- Bulk people import (CSV)
- Search and filter by lifecycle state, tags, name, email

### Admin portal
- People list with lifecycle filter, search, AI churn risk badges (medium=amber, high=red)
- Person detail: personal details, lifecycle state, tags, roles, household flag, relationships, booking history, membership history
- AI Insights panel per person: churn risk score + band, lifetime value, payment default risk, optimal send hour (all with confidence scores)
- Player Matching panel per person: ELO proximity-based candidate suggestions for a sport (up to 15 results)
- Segment management: create static/dynamic segments, add/remove members, view resolved members
- Dynamic segment rule builder (AND/OR conditions on lifecycle, tags, booking history, membership status, etc.)
- CSV import for bulk person creation

### Customer portal / Mobile
- No direct CRM-facing pages; person records created/updated on registration and booking

---

## Domain 7 — Teams

### Data models
| Model | What it stores |
|---|---|
| **Team** | Name, sport, season, age group, gender, public/private flag, external fixtures URL, sponsor IDs. |
| **TeamMember** | Person on a team. Role (player/coach/manager/guest), position, shirt number, photo URL, join date, active status. |
| **Fixture** | Match record. Home/away flag, opponent name/team ID, venue, date/time, type (league/cup/friendly), status (scheduled/completed/cancelled/postponed), home score, away score. |
| **AvailabilityResponse** | Per-player per-fixture availability answer (yes/maybe/no). |
| **SquadSelection** | Selected starting lineup for a fixture. List of TeamMember IDs. |
| **FeeChargeRun** | Batch fee charge record for a team. Amount, target (all/selected members), status, created by. |
| **Sponsor** | Name, logo URL, website URL, display order, active status. Linked to team or venue. |

### API capabilities
- Full CRUD on teams, team members, fixtures
- Availability response submit/update per player per fixture
- Squad selection create/update for a fixture
- Fee charge run creation (triggers payment records for selected members)
- Team overview stats (roster count, fixture count, upcoming fixtures, outstanding fees)
- Public team listing (only public teams exposed via slug endpoint)

### Admin portal
- Team list with active/inactive counts; member count and fixture count per team
- Team detail hub with tabs:
  - **Roster** — players/coaches/managers with position, shirt number, photo; add/remove members
  - **Fixtures** — upcoming and past fixtures with scores, home/away, venue
  - **Availability** — per-fixture availability response grid (yes/maybe/no per player)
  - **Squad Selection** — pick starting lineup from roster for a fixture
  - **Fee Charge Runs** — create and view batch fee charges to roster members
  - **Settings** — name, sport, season, age group, gender, public/private, fixtures URL, sponsors

### Customer portal / Mobile
- **Web:** Teams listing grouped by sport; team detail pages with squad grid, upcoming fixtures, recent results, sponsor carousel (public teams only)
- **Mobile:** My teams tab shows fixture list with home/away, date, venue; availability response buttons (Yes/Maybe/No) per fixture; pull-to-refresh

---

## Domain 8 — Competitions

### Data models
| Model | What it stores |
|---|---|
| **Competition** | Name, sport (tennis/football/squash/padel/badminton/hockey/netball/cricket/basketball/rugby_union), format (LEAGUE/KNOCKOUT/ROUND_ROBIN/GROUP_KNOCKOUT/SWISS/LADDER), status, description, season, entry fee, max entries. |
| **Division** | Named division within a competition. Seeding, max entries, current entries. |
| **Entry** | Person or team entry into a division. Display name, status (pending/confirmed/rejected/withdrawn). |
| **Match** | Match record. Home/away entry IDs, round, scheduled date, venue, status, home score, away score, verified flag. |
| **Standing** | Live standings row per entry per division. Played, won, drawn, lost, goals for/against, goal difference, points. |
| **DisciplinaryCase** | Open disciplinary case. Person ID, description, status (OPEN/UNDER_REVIEW/RESOLVED/APPEALED/CLOSED), actions. |
| **AuditEntry** | Chronological log of competition state changes and admin actions. |
| **CompetitionMessage** | Admin-to-participant message thread. Visible to participants. |

### API capabilities
- Full CRUD on competitions, divisions, entries
- Entry approval workflow (pending → confirmed / rejected)
- Draw generation with ELO-based seeding
- Match result submission and verification
- Live standings calculation (recalculated on result verification)
- Disciplinary case CRUD with status lifecycle
- Audit trail append/read
- Competition messaging (admin posts, participants read)
- Stats: entry counts, confirmed entries, revenue from entry fees

### Admin portal
- Competition list with sport and status filters
- Create competition with format, sport, entry fee, capacity
- Competition detail hub with tabs:
  - **Overview** — entries, status, description, format details
  - **Divisions** — create and manage divisions
  - **Draw** — generate draw, seed by ELO rating
  - **Results** — submit and verify match scores
  - **Submissions** — pending entry approvals with approve/reject flow
  - **Audit Trail** — chronological log of all state changes and actions
  - **Messaging** — admin-to-participant message thread
- Disciplinary case management across all competitions

### Customer portal / Mobile
- **Web:** Competition listing (search, sport filter); competition detail (standings, fixtures, entry modal with display name input, division picker, entry fee notice)
- **Mobile:** Competition listing with status badges; inline competition detail (same screen); standings table (P/W/D/L/+/-/Pts); fixtures by round with scores; entry modal (display name, division, entry fee confirmation)
- Competition messages visible to participants on both platforms

---

## Domain 9 — Rankings & Ratings

### Data models
| Model | What it stores |
|---|---|
| **RankingConfig** | Defines a leaderboard. Sport, algorithm (ELO / POINTS_TABLE), scope, season, points per win (Points Table only). |
| **RankingEntry** | Per-person entry in a config. Current rating (ELO score or points), previous rating, played/won/drawn/lost/goals for/against, provisional flag (ELO — fewer than 5 matches), last match date, rank, previous rank. |
| **WorkCard** | Player grading record per sport. Grade, category, playing level, LTA rating (numeric), UTR (numeric), NTRP (numeric), external ref (LTA Player ID), notes. |

### API capabilities
- CRUD on ranking configs and entries
- ELO recalculation on match result verification (automatic, triggered by competition-service result events)
- Points Table recalculation on result verification
- Rank delta calculation (current rank vs previous rank)
- Work card CRUD with sport-specific grading fields
- Leaderboard query: top N entries with rank changes

### Admin portal
- Live ratings leaderboard: tab per config, top-20 table with rank/delta/name/rating/P-W-D-L, gold/silver/bronze badges for top 3
- "How it works" panel explaining ELO vs Points Table
- Create ranking config (sport, algorithm, scope, season, points per win)
- Work cards management: filterable by sport; add/update grading, LTA rating, UTR, NTRP, external ref

### Customer portal / Mobile
- No direct rankings pages; ELO ratings are used internally for draw seeding and player matching
- Competition standings (which use Points Table) are visible on competition detail pages

---

## Domain 10 — Communications

### Data models
| Model | What it stores |
|---|---|
| **MessageLog** | Sent message record. Recipient, subject/template key, channel (email/sms/push/in_app), status (sent/queued/failed/suppressed/bounced), source module, event type, campaign link, timestamp. |
| **Template** | System or tenant-customised notification template. Template key, channel, subject, body. |
| **Audience** | Saved audience definition. AND/OR rule set evaluated at send time. Filters: membership status, age range, tags, booking history, payment status, lifecycle stage. |
| **CampaignStats** | Aggregated per-campaign stats: sent, delivered, opened, clicked, bounced, suppressed. |
| **NotificationSetting** | Per-template active/inactive toggle and configuration. Reply-to address, custom footer. |

### API capabilities
- Message log read (last 100)
- Template CRUD
- Audience CRUD with rule-based resolution
- Campaign analytics aggregation
- Send/schedule campaign (targeting an audience or segment)
- System event-triggered sends (booking confirmed, membership activated, etc.)
- 10 system notification templates: booking.confirmed, booking.cancelled, booking.reminder, membership.activated, membership.renewal_due, membership.expired, payment.succeeded, payment.failed, payment.refund_issued, fixture.reminder
- Suppression engine (prevents sends to bounced/suppressed recipients)
- Guardian routing (channel selection logic)

### Admin portal
- Message log viewer (date, recipient, channel badge, status badge, source, event type, campaign link)
- Template library: view system and tenant templates
- Audience builder: AND/OR rule engine with all filter types; save named audiences
- Campaign analytics: sent, delivery rate, open rate, click rate, bounce rate; visual engagement funnel; suppression breakdown
- Email compose: rich text editor, recipient targeting (audience or segment), preview list, draft saving, send or schedule
- Notification settings: toggle 10 system templates active/inactive; configure reply-to and footer

### Customer portal / Mobile
- Receive automated notifications (email/SMS/push/in-app) driven by system templates
- Competition messages visible in competition detail pages
- No self-service notification preference management currently built

---

## Domain 11 — Payments

### Data models
| Model | What it stores |
|---|---|
| **PaymentRecord** | Amount, currency, status (pending/succeeded/failed/refunded/partially_refunded), source (booking/membership/coaching/team_fee/competition_entry), external reference (Stripe/GoCardless ID), person ID, idempotency key. |
| **RefundPolicy** | Policy name, refund window (days), percentage refundable, conditions. |
| **PricingRule** | Dynamic pricing modifier. Target (resource, group, sport), time window, adjustment type (fixed/percentage), amount. |
| **AccountingIntegration** | Provider (xero/quickbooks), OAuth tokens (AES-256-GCM encrypted), sync config (invoice mode, revenue account, tax rate), last sync timestamp. |

### API capabilities
- Payment record CRUD and status lifecycle
- Refund policy CRUD
- Pricing rule CRUD
- Stripe payment intent creation and webhook handling
- GoCardless integration (mandate and payment creation — ready, not fully activated)
- Accounting sync: real-time payment.succeeded → invoice creation, refund → credit note, membership.activated → invoice
- Nightly batch reconciliation
- Unpaid bookings and membership queries

### Admin portal
- Pricing rules management: create/edit rules targeting resource/group/sport with time windows and fixed/percentage adjustments
- Refund policies management
- Payment health report (unpaid bookings by age band, unpaid memberships, value at risk)
- Accounting integrations: Xero and QuickBooks OAuth 2.0 connect/disconnect; sync configuration (invoice mode, revenue account, tax rate)

### Customer portal / Mobile
- Booking price shown at confirmation step
- Membership price shown on plan cards
- Payment handled at point of booking/membership join (Stripe)
- No self-service payment history or invoice download currently built

---

## Domain 12 — AI Analytics

### Data models
| Model | What it stores |
|---|---|
| **AiScore** | Per-person AI scoring. Churn risk score (0–100) + band (low/medium/high/critical), lifetime value (£), payment default risk score, optimal send hour, confidence values. Computed nightly. |
| **ForecastSlot** | Per-unit per-day per-hour occupancy forecast. Occupancy rate (0.0–1.0), dead slot flag (< 0.30 threshold), based on rolling 4-week average. 7–14 day horizon. Computed nightly at 02:00 UTC. |
| **AnomalyFlag** | Rule-triggered anomaly. Rule type (dormant_spike / payment_failure_spike / court_hoarding / booking_duration_extreme), severity (alert/warning), person ID, description, detected timestamp, resolved timestamp (nullable). |
| **MatchingResult** | Player matching output. Seeker person ID, sport, candidate list with match score and ELO delta. ELO window ±200 pts, activity bonus up to 40 pts, max 15 results. |

### API capabilities
- Nightly AI scoring batch for all active persons (churn, LTV, payment default, optimal send hour)
- Bulk score fetch by person IDs
- Individual score fetch
- Forecasting: compute and store slot occupancy forecasts per unit; query dead slots (grouped by unit with lowest occupancy and dead slot count); filter by `deadSlotsOnly`; `bookers` endpoint returns historical bookers for targeted campaigns
- Anomaly detection: trigger detection run (`POST /detect`); list flags with severity and unresolved filters; resolve individual flags (`PATCH /:id/resolve`); pagination
- Player matching: given a person ID and sport, return ranked candidates by ELO proximity and activity score; self-excluded from results; max 15 matches

### Admin portal
- **AI Insights panel** on every person detail page: churn risk score/band, LTV, payment default risk, optimal send hour — all with confidence scores
- **Player Matching panel** on every person detail page: sport-selectable candidate list with match scores
- **People list**: AI churn risk badges (medium=amber, high=red) on each person row
- **Utilisation Forecast report** (`/reports/utilisation-forecast`): 14-day dead slot view by unit, colour-coded occupancy bars, "Show bookers" for targeted campaigns, recompute trigger
- **Anomaly Flags report** (`/reports/anomalies`): alert/warning counts, severity filter, "Run detection" trigger, rule legend (4 detection rules), resolve-in-place workflow

### Customer portal / Mobile
- No AI-facing features on customer-facing surfaces currently

---

## Domain 13 — Integration Layer

### Data models
| Model | What it stores |
|---|---|
| **ApiKey** | Name, HMAC-SHA256 key hash (plaintext `cs_xxx` shown once, never stored), scopes (array), active status, soft-delete timestamp. |
| **ApiKeyUsage** | Per-request log. API key ID, endpoint, HTTP response code, timestamp. |
| **WebhookSubscription** | Name, endpoint URL, event types (array), per-subscription HMAC signing secret hash, active status. |
| **WebhookDelivery** | Delivery attempt record. Subscription ID, event type, payload (JSON), status (pending/delivered/failed/dead), attempt count, next retry timestamp, last response code and body. |

### API capabilities
- API key issuance: plaintext shown once on creation, hash stored; scoped credentials
- API key lifecycle: suspend, activate, revoke (soft-delete)
- API key usage log (paginated)
- Webhook subscription CRUD
- Webhook dispatch: inbound domain events create pending delivery rows for all matching active subscriptions
- Delivery worker: `@Cron` every 30 seconds, picks up to 50 pending deliveries, signs each POST with `X-ClubSpark-Signature: sha256=<hmac>`, exponential retry (30s→2m→10m→1h→4h, 5 attempts max), then `dead`
- Manual retry: reset failed/dead delivery to pending
- Delivery log read (paginated, filtered by subscription ID)

**Available API key scopes:** `bookings:read`, `members:read`, `competitions:read`, `teams:read`, `webhooks:manage`

### Admin portal (`/settings/integrations/`)
- **API Keys** — Issue new key (name + scopes), one-time plaintext display with copy button and "won't be shown again" warning, list active/suspended keys, suspend/activate/revoke actions, view usage log modal
- **Webhooks** — Create subscriptions (name, endpoint URL, event types multi-select), list subscriptions with status, edit endpoint/events, delete, view delivery log modal (status pill, event type, attempts, last response code, timestamp), retry failed/dead deliveries

---

## Domain 14 — Administration

### Data models
| Model | What it stores |
|---|---|
| **AdminUser** | User ID (Supabase Auth), tenant ID, role (admin/super), active status. |

### API capabilities
- CRUD on admin users (super role required for create/list/update/delete)
- Self-lookup (`GET /admin-users/me`)
- Role-based access: super can manage all admin users; non-super cannot list or modify

### Admin portal
- Admin users list (super only; redirects to `/access-denied` if non-super)
- Create admin users, assign admin/super role, deactivate
- Cannot delete own account

---

## Summary: What is and is not built

### Built and operational
| Domain | Service | Admin Portal | Customer Web | Mobile |
|---|---|---|---|---|
| Venues & Facilities | ✅ | ✅ | ✅ (browse) | ✅ (browse) |
| Availability | ✅ | ✅ | ✅ (booking wizard) | ✅ (booking wizard) |
| Bookings | ✅ | ✅ | ✅ | ✅ |
| Coaching | ✅ | ✅ | ✅ | ✅ |
| Membership | ✅ | ✅ | ✅ | ✅ |
| People / CRM | ✅ | ✅ | — | — |
| Teams | ✅ | ✅ | ✅ | ✅ |
| Competitions | ✅ | ✅ | ✅ | ✅ |
| Rankings & Ratings | ✅ | ✅ | — | — |
| Communications | ✅ | ✅ | — | — |
| Payments | ✅ | ✅ | ✅ (at checkout) | ✅ (at checkout) |
| AI Analytics | ✅ | ✅ | — | — |
| Integration Layer | ✅ | ✅ | — | — |
| Administration | ✅ | ✅ | — | — |

### Notable gaps not yet built (for CPO backlog)
- **Customer notification preferences** — members cannot manage their own comms opt-ins
- **Customer payment history / invoices** — no self-service payment record access
- **Public rankings pages** — leaderboards not exposed on customer portal or mobile
- **GoCardless activation** — integration is wired but not fully activated in production
- **AI on customer surfaces** — player matching and utilisation forecasting not exposed to customers
- **Member self-service profile editing** — customers cannot update their own personal details
- **In-app competition messaging for mobile** — admin messages not surfaced on mobile
- **Push notification delivery** — comms service has `in_app` channel but push infrastructure not wired end-to-end
