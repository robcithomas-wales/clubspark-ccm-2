# Club & Coach Platform — Feature Overview

> **Version:** Phase 0 complete (April 2026) — Team Sport Website Pages, Sponsors, and Rankings added
> **Audience:** Internal — product, engineering, commercial teams

---

## Overview

Club & Coach is a multi-sport SaaS platform for sports clubs and leisure venues. It provides a back-office admin portal for staff, a white-label customer-facing web portal for bookings and self-service, and a branded mobile app for members. The platform is built as a set of independent microservices behind Next.js front-ends.

---

## Architecture at a Glance

| Layer | Technology | Purpose |
|---|---|---|
| Admin Portal | Next.js 15 (App Router) | Staff-facing management interface |
| Customer Portal | Next.js 15 (App Router) | White-label public booking & account portal |
| Mobile App | React Native / Expo | Branded member app |
| Backend Services | NestJS + Fastify | 9 independent microservices |
| Database | PostgreSQL (Supabase → Azure) | Isolated schema per domain |
| Auth | Supabase | JWT-based, multi-tenant |
| Infrastructure target | Azure | Cloud deployment |

---

## Microservices

### 1. Venue Service (port 4003)
Manages the physical infrastructure of a venue.

- **Venues** — create and manage multiple venues with name, address, and settings
- **Resources** — courts, pitches, pools, studios, etc. within a venue; each resource has a surface type, capacity, and lighting attributes
- **Resource Groups** — group resources together for shared availability and pricing rules
- **Bookable Units** — the specific slot-level booking surface (e.g. "Court 1 — 1 hour"), with duration, pricing, and advance booking limits
- **Add-ons** — bookable extras attached to a unit (equipment hire, coaching supplements, etc.); typed as either bookable-resource or product/service
- **Availability Configs** — define opening hours, slot intervals, and booking durations per venue, resource group, or individual resource
- **Blackout Dates** — block specific dates or date ranges when a venue or resource is unavailable
- **Booking Rules** — access and pricing rules governing who can book and at what price (supports membership-type and role-based rules)
- **Organisations** — tenant identity, branding (logo, primary colour), portal slug, public description, and `hasTeams` flag to enable team sport website pages
- **Affiliations** — organisation-level sport affiliation records
- **Sponsors** — club sponsor records (logo, website URL, display order); shown in the sponsor carousel on team pages; full CRUD behind auth plus a public read endpoint for the customer portal

---

### 2. Booking Service (port 4005)
Handles all booking activity — creation, management, and series.

- **Bookings** — create, view, approve, reject, reschedule, and cancel individual bookings; records customer, resource, time slot, price, and source
- **Booking Sources** — tracks whether a booking originated from admin, customer portal, or mobile app
- **Pending Approvals** — bookings that require admin sign-off before confirmation; approve or reject with optional reason
- **Admin Override** — flag to bypass booking rules when creating bookings on behalf of a customer
- **Series Bookings** — recurring booking sets (iCal RRULE format) with per-occurrence and bulk management
- **Availability Checking** — real-time slot availability queries across all bookable units with conflict detection
- **Payment Status Tracking** — paid, unpaid, part-paid, free, and waived states per booking
- **Booking Stats** — aggregated totals: revenue, booked hours, add-on revenue, unique customers, daily breakdowns
- **Auto-expiry** — scheduled task to expire pending bookings that have not been approved within a configurable window
- **Bulk Cancel** — cancel multiple bookings in a single operation

---

### 3. People Service (port 4004)
Central record of all persons associated with a tenant.

- **Person Records** — name, email, phone, and profile data for all contacts
- **Households** — link family members; parent/child and guardian relationships
- **Roles** — assign named roles to people (e.g. coach, committee member, captain, junior) with optional context and date range
- **Tags** — freeform segmentation labels for filtering and grouping
- **Lifecycle History** — track status transitions (prospect → active → lapsed → inactive) with timestamps
- **Activity Timeline** — aggregated read-time view across bookings, memberships, and lifecycle events for a person
- **Financial Profile** — per-person summary: active memberships, total booking revenue, last 30 days revenue, total bookings
- **Customer Registration** — self-service registration flow creates a person record linked to a Supabase auth account
- **Bulk Import** — CSV upload to bulk-create contact records
- **Profile Search** — search by name or email for use in booking and team management flows

---

### 4. Membership Service (port 4010)
Full membership lifecycle management.

- **Membership Schemes** — top-level grouping structure (e.g. "Adult Membership", "Junior Membership")
- **Membership Plans** — specific products within a scheme with price, duration type (fixed/rolling), and ownership type (individual/household)
- **Memberships** — individual member records linked to a plan; tracks status (active, lapsed, cancelled), start/end dates, and payment state
- **Bulk Assignment** — assign a membership plan to multiple members at once
- **Entitlement Policies** — reusable booking-access rules attached to plans (advance booking windows, eligible booking days, peak/off-peak access, booking window restrictions)
- **Renewals Tracking** — identifies memberships due for renewal within a configurable window
- **Renewal Automation** — `POST /memberships/process-renewals` triggers auto-renewal of memberships due within N days; callable from the admin portal renewals report

---

### 5. Coaching Service (port 4007)
Manages the coaching operation end-to-end.

- **Coaches** — coach profiles with display name, bio, avatar, specialties, active status, and availability; linked to lesson types
- **Lesson Types** — define coaching products: sport, duration (minutes), price per session, currency, max participants, active status
- **Coach Availability** — slot-level availability query per coach by date and duration; used by the booking wizard
- **Lesson Sessions** — admin-side session records: create, view, update, and delete individual sessions; tracks coach, lesson type, optional customer, start/end time, status (scheduled → confirmed → completed / cancelled / no_show), payment status (unpaid / paid / waived), price charged, notes, and cancellation reason; full CRUD with status and payment transition actions

---

### 6. Team Service (port 4008)
Full team sports management for clubs with competitive fixtures.

- **Teams** — create teams with sport, season, age group, gender, and fee schedule (default, junior, substitute match fees); `fixturesUrl` for external fixture list link (FA Full-Time, ECB Play-Cricket, etc.); `isPublic` flag controls customer portal visibility
- **Roster Management** — add and edit squad members with `role` (player / coach / manager), `photoUrl`, shirt number, position, junior/guest flags, and guardian details; soft-delete preserves history
- **Person Linking** — roster members can be linked to person records in the People service
- **Fixtures** — schedule matches with opponent, kickoff time, venue, home/away, match type, and notes; lifecycle statuses: draft → scheduled → squad selected → fees requested → completed / cancelled
- **Fixture Cancellation** — cancel fixtures with a single action
- **Availability** — players respond to fixture availability (available / maybe / unavailable); managers can bulk-request responses from all active squad members
- **Squad Selection** — set and publish the squad for a fixture (starters, substitutes, non-playing)
- **Charge Runs** — initiate fee collection against the selected squad; automatically applies the team's senior/junior/substitute fee schedule; individual charges can be waived or marked as manually paid
- **Public API** — unauthenticated endpoints for the customer portal: list public teams, team detail with roster (players and coaches separated) and upcoming fixtures

---

### 7. Admin Service (port 4006)
Platform and tenant management.

- **Admin Users** — manage staff access to the admin portal with role-based permissions
- **RBAC** — role-based access control across portal functions

---

### 8. Competition Service (port 4009)
Full competition and league management across all sports.

- **Competitions** — create and manage competitions with sport, format (League / Knockout / Round Robin / Group+Knockout / Swiss / Ladder), entry type (Individual / Team / Doubles / Mixed Doubles), status lifecycle (Draft → Registration Open → In Progress → Completed / Archived), entry fee, eligibility rules, and date windows
- **Divisions** — competitions can have multiple divisions (e.g. Mens A, Womens B); each division can override the parent format
- **Entries** — register competitors into a competition with PENDING → CONFIRMED / WITHDRAWN / DISQUALIFIED lifecycle; supports individual (personId) and team (teamId) entries; bulk-confirm all pending entries in a division
- **Draw Generation** — automated draw creation per division: round-robin schedule for LEAGUE/ROUND_ROBIN formats, seeded knockout bracket for KNOCKOUT format; conflict-aware with 409 guard against re-generation
- **Matches** — fixture records per draw: home/away entries, scheduled time, venue, round, match number
- **Results** — score submission, verification, and dispute workflow: `SUBMITTED → VERIFIED / DISPUTED`; auto-triggers standings recalculation on verify
- **Standings** — automatic standings recalculation on result verification: wins, losses, draws, points, goal difference with configurable points-per-win rule
- **Rankings** — configurable ranking system per tenant; supports ELO (point change per match outcome) and Points Table (cumulative wins/losses/draws); ranking entries track current and peak rank, total points, and match record; match events log each result's point change; leaderboard endpoint returns ranked list ordered by points

---

### 9. Payment Service
Gateway-agnostic payment processing.

- **Provider Configs** — per-tenant payment gateway configuration (Stripe implemented; GoCardless ready)
- **Payment Initiation** — idempotent payment creation routed to the configured provider
- **Stripe Integration** — full Stripe checkout and webhook handling
- **Webhook Processing** — inbound webhook endpoint per tenant for payment event handling

---

## Admin Portal

The admin portal is the primary management interface for club/venue staff. It uses a sidebar navigation layout and adapts to the organisation's brand colour and logo.

### Dashboard
- **8 KPI cards** — Total Revenue, Active Bookings, Active Members, Utilisation %, People, Teams, Coaches, Participants
- **Operational alerts** — renewals due within 30 days, active memberships with outstanding payment
- **Activity charts** — add-on revenue (30 days), booked hours (30 days), bookings volume over time
- **Platform coverage grid** — quick-links to all domains with live summary stats
- **Pilot summary** — complete feature checklist across all platform capabilities
- Recent bookings table and membership snapshot

### Facilities
- **Facilities Explorer** — unified hierarchical view of all venues → resources → bookable units; expand/collapse per venue and resource; search filters the tree in real time; quick-links to View, Add Resource, Add Unit, Add Venue from the explorer
- Bookable unit cards in the explorer show unit type badge, capacity, sort order, and parent unit name (resolved from the parent's name, not raw UUID)

### Venues
- **Create Venue** — full creation form with name (required), city, country (dropdown), and timezone (dropdown); submits to venue-service and redirects to the new venue's detail page
- View and edit venue details
- Manage resources within each venue

### Resources & Bookable Units
- **Edit Resource** — pre-populated form with all resource attributes: name, type, venue (read-only), resource group (reactive to venue), sport, surface, colour, booking purposes, description, and isIndoor/hasLighting/isActive toggles
- **Edit Resource Group** — pre-populated form with name, venue (read-only), sport, sort order, colour, and description
- **Edit Bookable Unit** — pre-populated form with name, unit type, capacity, sort order, parent unit (dropdown of other units), and isActive/isOptionalExtra toggles; venue and resource shown as human-readable names (read-only)
- Resource groups for shared configuration
- Parent-child unit conflicts — when a bookable unit is assigned a `parentUnitId`, a conflict row is automatically created/synced in `venue.unit_conflicts` so that booking a half automatically blocks the full unit and vice versa

### Availability
- Visual grid (availability board) of slot availability across all active bookable units for a selected date
- Venue picker dropdown (shown when multiple venues exist); defaults to first venue automatically — no hardcoded IDs
- "NOW" live indicator line showing current time position across the board; hydration-safe (renders client-side only after mount)
- KPI cards: bookable unit count, available slots, booked slots with totals
- Click a booked slot to navigate to that booking's detail page; click a free slot to navigate to the create-booking flow

### Availability Configs
- Opening hours configuration per venue, resource group, or resource
- Slot duration and booking interval settings

### Blackout Dates
- Create and manage closures for venues or specific resources

### Booking Rules
- Define access and pricing rules (e.g. members get discounted rates, certain roles can book peak slots)

### Bookings
- **List view** — searchable, filterable list of all bookings with bulk actions (bulk cancel, export)
- **Calendar view** — day-view timeline across all bookable units
- **Pending Approvals** — queue of bookings awaiting admin sign-off, sorted oldest first with urgency indicators (>4h, >24h)
- **Booking detail** — full booking record with customer, resource, time, price, status, approval history, and add-ons
- **Edit booking** — reschedule (change start/end time) and change bookable unit inline
- **Approve / Reject** — approve pending bookings or reject with optional reason
- **Create booking** — assisted booking flow on behalf of a customer with admin-override option

### Booking Series
- View and manage recurring booking sets
- Cancel individual instances or entire series

### Add-ons
- Create and manage bookable extras catalogue
- Attach add-ons to bookable units

### People
- Full person directory: name, email, phone, status, tags, roles, household
- Create individual records or bulk-import from CSV
- **Person detail** — personal info, financial profile (active memberships, revenue stats), booking history, membership list, activity timeline (aggregated events from bookings, memberships, and lifecycle), linked household members

### Membership
- **Schemes** — create and edit top-level membership structures
- **Plans** — define products under each scheme with pricing and duration
- **Entitlement Policies** — create reusable booking-access rules
- **Memberships** — individual member records; create, view, edit, and manage status
- **Bulk Assign** — apply a plan to multiple members simultaneously

### Teams
- Team list and creation
- **Team Detail** — squad roster, upcoming fixtures, past fixtures, and summary stats
- **Roster** — add players (with person-search to link existing records or create new), edit player details, remove players
- **Fixtures** — schedule matches, view full fixture detail (availability breakdown, squad selection, charge runs), cancel fixtures
- **Availability** — per-fixture availability response summary with player count breakdown
- **Squad Selection** — set starters and substitutes, publish to squad
- **Charge Runs** — initiate and track fee collection per fixture; apply/waive individual charges

### Coaching
- **Coaches** — coach profiles with specialties, lesson types, bio, and avatar; add/edit/toggle active status
- **Lesson Types** — create and manage coaching products with sport, duration, and pricing
- **Sessions** — full session management: list with coach/status filters, session detail, create new sessions (coach + lesson type + date/time + optional customer + notes + payment); status transitions (confirm, complete, no-show, cancel with reason); payment status transitions (paid, unpaid, waived); delete

### Reports

| Report | Key Metrics |
|---|---|
| Bookings | Total bookings, by source, by resource, daily trend |
| Revenue | Booking revenue (filtered by date), add-on revenue, competition entry fee revenue, revenue per booked hour, combined known revenue, revenue streams breakdown |
| Utilisation | Overall utilisation %, by resource, peak vs off-peak |
| Customers | Customers registered in range, top customers by spend/hours, never-booked tracking |
| Membership | Memberships in range, active count, renewals due, retention rate |
| Series | Series in range, active series, cancellation rate, by resource |
| Renewals Forecast | Expiring in 7/30/90 days, revenue at risk; trigger auto-renewal run |
| Add-ons | Add-ons in range, total revenue, avg catalogue price, by category |
| Pending Approvals | Total pending, over 24h, over 48h, urgency breakdown |
| Payment Health | Total value at risk, unpaid bookings, unpaid memberships |
| Coaching | Coaching-specific activity report |
| Teams Overview | Team count by sport/status, fixture volume, fee collection summary |
| Match Results | Fixture results with scores by team and sport |
| Fee Collection | Charge run status (team fixtures); competition entry charge status, paid vs outstanding per competition |
| Player Availability | Availability response rates and player-level breakdown per fixture |
| Player Participation | Participation frequency per player across fixtures |
| Fixtures Summary | Upcoming and past fixtures across all teams with status breakdown |
| Competition Overview | Total competitions, open for entry, in progress, entry count, entry fee revenue, status and sport breakdown, entries per competition, competitions timeline |
| Competition Entries | Total entries, confirmed, pending, fees collected vs outstanding; filter by competition and status; entries by status and per competition |
| Competition Results | Total matches, completed, pending, disputed, completion rate; filter by competition and status; match status and per-round breakdown |
| Teams Overview | Team count, total players, total coaches & managers, fixtures volume; coachCount column in table |
| Squad Composition | Total players, coaches & managers, juniors, guests per team; profile completion bars (position/shirt/photo ratios); HBar charts for players per team and profile completion |
| Team Website Readiness | Teams public/private, fixtures URL set, fully-ready count; photo completion progress bar per team; clickable fixtures URL |
| Rankings Leaderboard | Ranked player/team list ordered by points for the configured ranking system (ELO or Points Table); current rank, peak rank, total points, match record |

All reports include date-range filtering and CSV export. All reports include a **Save PDF** button (browser print, captures SVG charts).

### Support Chat
- AI-powered support chat widget in the admin portal (bottom-right corner on all pages)
- Uses Claude claude-sonnet-4-6 with venue-aware tool calls: list venues, list resources, search availability, make booking
- Tenant-scoped: reads venue/resource data using the admin's tenant context

### Settings
- **Organisation** — name, logo, branding colour, website slug, public-facing description
- **Admin Users** — manage staff accounts and portal access
- **Portal Design** — customer portal appearance settings

### Website Content Management
- **Home page** — edit the content shown on the customer-facing home page
- **Events** — manage public events
- **News** — publish news posts

---

## Customer Portal

The customer portal is a white-label Next.js web app served under the organisation's slug (`/[slug]`). It is branded with the organisation's logo and primary colour.

### Public Pages
- **Home** — organisation landing page with branding, description, and navigation to key sections
- **News** — news feed with individual article pages
- **Events** — upcoming events listing
- **Competitions** — live competition list with sport/format badges, status, entry count, and entry fee; competition detail page with divisions, confirmed entry count, and entry fee; entry form to register for a competition
- **Teams** *(enabled per org via `hasTeams` flag)* — sport-grouped team grid showing member count and external fixtures shortcut; **Team Detail** page with coaching staff section, squad cards (photo, shirt number, position), upcoming fixtures list, recent results, external fixtures CTA button, and sponsor carousel

### Self-Service Account
- **Login / Register** — email and password authentication via Supabase
- **Account** — view profile, active membership, upcoming and past bookings; cancel upcoming bookings
- **Memberships** — browse available membership plans and join

### Booking
- **Book** — browse available resources, select date and time slot, confirm and pay
- Resources shown are filtered to the venue's configured availability and pricing

### Support Chat
- AI-powered support chat widget (bottom-right corner)
- Handles natural-language booking requests: "book a court for Sunday at 1pm"
- Tool calls: list venues, list resources, search availability; `make_booking` requires customer authentication
- Read-only venue/availability calls use tenant header auth (no customer JWT required)

### Coaching
- **Multi-step booking wizard** — coaches → lesson type → date (14-day calendar) → available time slots → confirmation
- Lists all active coaches with bio, specialties, and lesson types
- Slot availability is checked in real time against coach availability and bookable unit conflicts
- Booking confirmation summary with coach, lesson, date, time, court/pitch, and price

---

## Mobile App

A React Native (Expo) mobile app fully themed to the organisation's brand colour and logo at runtime. Members sign in with their existing portal credentials.

### Screens

#### Home (Index)
- Welcome screen with quick-access navigation and organisation branding

#### Book
- Browse available resources by venue
- Select a resource to view its detail, available slots, and pricing
- **Resource Detail** — slot grid for selected date; book a slot with confirmation step
- **Booking Confirm** — review booking details before submission
- **Booking Success** — confirmation screen with booking reference

#### Coaching
- **Multi-step booking wizard** (identical flow to web portal) — coaches → lesson type → date → available slots → confirm → done
- Lists coaches with bio, specialties, and lesson types
- Real-time slot availability with bookable unit enrichment
- "Book another lesson" on success

#### Competitions
- Live list of all competitions for the organisation with sport, format, status, and entry count
- Tapping a competition navigates to the detail page (via customer portal web view)

#### Teams
- List of teams the signed-in member belongs to
- Team selector (pill tabs) when member is in multiple teams
- Team banner with sport, season, and age group; branded header with club logo
- **Upcoming Fixtures** — list of scheduled matches with opponent, date, time, venue, and status
- **Availability Response** — inline Yes / Maybe / No buttons per fixture; response saved in real time

#### Account
- Profile details (name, email, phone)
- Active membership card with plan name and validity date
- **Upcoming Bookings** — list of future bookings with resource name, date, and time
- **Past Bookings** — recent booking history (last 10)
- Cancel individual upcoming bookings (with confirmation)
- Club logo displayed in header when available
- Sign out

### Auth Flows
- **Sign In** — email/password login
- **Sign Up** — new account registration (creates person record via People service)
- **Onboarding** — first-run onboarding screen

---

## Multi-Tenancy

The platform is fully multi-tenant from day one:

- Every record in every service is scoped to a `tenantId`
- Auth tokens carry `tenantId` in `app_metadata` (set at registration)
- The admin portal is scoped to a single tenant per deployment
- The customer portal and mobile app resolve the tenant from the URL slug or app configuration
- Tenant branding (logo, primary colour) is loaded at runtime — the mobile app and customer portal theme themselves dynamically

---

## Testing Coverage

| Suite | Count | Status |
|---|---|---|
| venue-service integration | 73 | Passing |
| booking-service integration | 61 | Passing |
| people-service integration | 35 | Passing |
| membership-service integration | 50 | Passing |
| coaching-service integration | 45 | Passing |
| team-service integration | 38 | Passing |
| admin-service integration | 18 | Passing |
| competition-service integration | 28 | Passing |
| **Total integration** | **348** | **All passing** |
| Playwright e2e (admin portal) | 92 | All passing |
| **Grand total** | **440** | |

All integration tests run against a real PostgreSQL database and use `describe.runIf(DB_AVAILABLE)` to gracefully skip when the database is unreachable.

---

*Document updated April 2026. Reflects Phase 0 complete feature set plus Competitions, Rankings, and Team Sport Website Pages (Sponsors, public Teams/Squad pages).*
