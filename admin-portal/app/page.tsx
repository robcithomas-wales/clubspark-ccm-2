import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  Brain,
  Building2,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Crown,
  GraduationCap,
  Globe,
  Key,
  Layers,
  LayoutGrid,
  MessageSquare,
  Package,
  PoundSterling,
  RefreshCw,
  Shield,
  ShieldCheck,
  Smartphone,
  Trophy,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react"
import { PortalLayout } from "@/components/portal-layout"
import { RecentBookingsTable } from "@/components/recent-bookings-table"
import { DashboardTrendChart } from "@/components/dashboard-trend-chart"
import {
  getAddOnServices,
  getAvailabilityConfigs,
  getBookableUnits,
  getBookingDailyStats,
  getBookingStats,
  getBookings,
  getBookingSeries,
  getCoaches,
  getCustomers,
  getEntitlementPolicies,
  getMembershipPlans,
  getMembershipSchemes,
  getMemberships,
  getMembershipsRenewalsDue,
  getMembershipsWithFilter,
  getOrganisation,
  getResources,
  getTeams,
  getTeamReportOverview,
  getVenues,
  getAllCompetitionsForReport,
  getRankingConfigs,
  getApiKeys,
  getWebhookSubscriptions,
  getHighChurnMembers,
  getAnomalyFlags,
} from "@/lib/api"

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  accent,
}: {
  title: string
  value: string | number
  description: string
  icon: any
  accent?: string
}) {
  const bg = accent ?? "#1857E0"
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-md transition-shadow hover:shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-slate-500">{title}</div>
          <div className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{value}</div>
          <div className="mt-2 text-sm leading-6 text-slate-500">{description}</div>
        </div>
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${bg}1a` }}
        >
          <Icon className="h-6 w-6" style={{ color: bg }} />
        </div>
      </div>
    </div>
  )
}

function SectionCard({
  title,
  description,
  children,
  actionHref,
  actionLabel,
}: {
  title: string
  description: string
  children: React.ReactNode
  actionHref?: string
  actionLabel?: string
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md transition-shadow hover:shadow-lg">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white px-6 py-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
        {actionHref && actionLabel ? (
          <Link
            href={actionHref}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-[#1857E0]/30 hover:bg-blue-50 hover:text-[#1857E0]"
          >
            {actionLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

export default async function DashboardPage() {
  const org = await getOrganisation()

  const [
    venuesResult,
    resourcesResult,
    unitsResult,
    bookingsResult,
    pendingBookingsResult,
    customersResult,
    schemesResult,
    plansResult,
    policiesResult,
    membershipsResult,
    addOnsResult,
    statsResult,
    dailyStatsResult,
    renewalsDueResult,
    unpaidMembershipsResult,
    teamsResult,
    seriesResult,
    coachesResult,
    availabilityConfigsResult,
    competitionsResult,
    rankingConfigsResult,
    teamOverviewResult,
    apiKeysResult,
    webhookSubsResult,
    highChurnResult,
    anomalyAlertsResult,
  ] = await Promise.allSettled([
    getVenues(),
    getResources(),
    getBookableUnits(),
    getBookings(),
    getBookings(1, 100, { status: "pending" }),
    getCustomers(),
    getMembershipSchemes(),
    getMembershipPlans(),
    getEntitlementPolicies(),
    getMemberships(),
    getAddOnServices(),
    getBookingStats(),
    getBookingDailyStats(30),
    getMembershipsRenewalsDue(30),
    getMembershipsWithFilter({ status: "active", paymentStatus: "unpaid", limit: 100 }),
    getTeams(),
    getBookingSeries(),
    getCoaches(1, 100),
    getAvailabilityConfigs({ scopeType: "venue" }),
    getAllCompetitionsForReport(),
    getRankingConfigs(),
    getTeamReportOverview(),
    getApiKeys(),
    getWebhookSubscriptions(),
    getHighChurnMembers(60, 1),
    getAnomalyFlags(1, 50, { unresolvedOnly: true, severity: "alert" }),
  ])

  const venuesResponse = venuesResult.status === "fulfilled" ? venuesResult.value : null
  const resourcesResponse = resourcesResult.status === "fulfilled" ? resourcesResult.value : null
  const unitsResponse = unitsResult.status === "fulfilled" ? unitsResult.value : null
  const bookingsResponse = bookingsResult.status === "fulfilled" ? bookingsResult.value : null
  const pendingBookingsResponse = pendingBookingsResult.status === "fulfilled" ? pendingBookingsResult.value : null
  const customersResponse = customersResult.status === "fulfilled" ? customersResult.value : null
  const schemesResponse = schemesResult.status === "fulfilled" ? schemesResult.value : null
  const plansResponse = plansResult.status === "fulfilled" ? plansResult.value : null
  const policiesResponse = policiesResult.status === "fulfilled" ? policiesResult.value : null
  const membershipsResponse = membershipsResult.status === "fulfilled" ? membershipsResult.value : null
  const addOnsResponse = addOnsResult.status === "fulfilled" ? addOnsResult.value : null
  const bookingStats = statsResult.status === "fulfilled" ? statsResult.value : null
  const dailyStats = dailyStatsResult.status === "fulfilled" ? dailyStatsResult.value : []
  const renewalsDue: any[] = renewalsDueResult.status === "fulfilled" ? ((renewalsDueResult.value as any)?.data ?? []) : []
  const unpaidMemberships: any[] = unpaidMembershipsResult.status === "fulfilled" ? ((unpaidMembershipsResult.value as any)?.data ?? []) : []
  const teamsResponse = teamsResult.status === "fulfilled" ? teamsResult.value : null
  const seriesResponse = seriesResult.status === "fulfilled" ? seriesResult.value : null
  const coachesResponse = coachesResult.status === "fulfilled" ? coachesResult.value : null
  const availabilityConfigs: any[] = availabilityConfigsResult.status === "fulfilled"
    ? (availabilityConfigsResult.value ?? [])
    : []
  const rawCompetitions: any[] = competitionsResult.status === "fulfilled" ? competitionsResult.value : []
  const rankingConfigs: any[] = rankingConfigsResult.status === "fulfilled" ? (rankingConfigsResult.value as any[] ?? []) : []
  const teamOverview: any[] = teamOverviewResult.status === "fulfilled" ? (teamOverviewResult.value as any[] ?? []) : []
  const apiKeys: any[] = apiKeysResult.status === "fulfilled" ? ((apiKeysResult.value as any)?.data ?? []) : []
  const webhookSubs: any[] = webhookSubsResult.status === "fulfilled" ? ((webhookSubsResult.value as any)?.data ?? []) : []
  const highChurnTotal: number = highChurnResult.status === "fulfilled" ? ((highChurnResult.value as any)?.pagination?.total ?? 0) : 0
  const anomalyAlertCount: number = anomalyAlertsResult.status === "fulfilled" ? ((anomalyAlertsResult.value as any)?.pagination?.total ?? 0) : 0

  function extractData(r: any): any[] {
    if (!r) return []
    if (Array.isArray(r)) return r
    return r.data ?? []
  }

  const venues = extractData(venuesResponse)
  const resources = extractData(resourcesResponse)
  const units = extractData(unitsResponse)
  const bookings = extractData(bookingsResponse)
  const pendingBookingsTotal = (pendingBookingsResponse as any)?.pagination?.total ?? extractData(pendingBookingsResponse).length
  const customers = extractData(customersResponse)
  const schemes = extractData(schemesResponse)
  const plans = extractData(plansResponse)
  const policies = extractData(policiesResponse)
  const memberships = extractData(membershipsResponse)
  const addOns = extractData(addOnsResponse)
  const teams = extractData(teamsResponse)
  const series = extractData(seriesResponse)
  const coaches = extractData(coachesResponse)

  const activeBookings = bookings.filter((b: any) => b.status === "active")
  const activeMemberships = memberships.filter((m: any) => m.status === "active")
  const activeAddOns = addOns.filter((a: any) => a.status === "active")
  const activeSeries = series.filter((s: any) => s.status === "active")
  const activeTeams = teams.filter((t: any) => t.isActive !== false)
  const totalSquadPlayers = teamOverview.reduce((s, t) => s + (t.activePlayers ?? 0), 0)
  const totalSquadCoaches = teamOverview.reduce((s, t) => s + (t.coachCount ?? 0), 0)
  const publicTeams = teams.filter((t: any) => t.isPublic !== false).length

  const activeApiKeys = apiKeys.filter((k: any) => k.isActive)
  const activeWebhookSubs = webhookSubs.filter((s: any) => s.isActive)

  const activeCompetitions = rawCompetitions.filter((c: any) => c.status === "IN_PROGRESS" || c.status === "REGISTRATION_OPEN")
  const openForEntry = rawCompetitions.filter((c: any) => c.status === "REGISTRATION_OPEN")

  const recentBookings = [...bookings]
    .sort((a: any, b: any) => new Date(b.startsAt || 0).getTime() - new Date(a.startsAt || 0).getTime())
    .slice(0, 6)

  const today = new Date().toISOString().slice(0, 10)
  const bookingsToday = bookings.filter((b: any) => {
    if (!b.startsAt) return false
    return new Date(b.startsAt).toISOString().slice(0, 10) === today
  })

  const totalBookedHours = bookingStats?.totalBookedHours ?? 0
  const totalRevenue = bookingStats?.totalRevenue ?? 0
  const addOnRevenue = bookingStats?.addOnRevenue ?? 0
  const uniqueCustomers = bookingStats?.uniqueCustomers ?? 0
  const activeUnitCount = units.filter((u: any) => u.isActive !== false).length
  const catchAllConfig = availabilityConfigs.find((c: any) => c.dayOfWeek == null && c.isActive !== false)
  const opensAt = catchAllConfig?.opensAt ?? "06:00"
  const closesAt = catchAllConfig?.closesAt ?? "22:00"
  const hoursPerDay = (() => {
    const [oh, om] = opensAt.split(":").map(Number)
    const [ch, cm] = closesAt.split(":").map(Number)
    return Math.max(1, Math.min(24, ((ch ?? 22) * 60 + (cm ?? 0) - (oh ?? 6) * 60 - (om ?? 0)) / 60))
  })()
  const availableHours = activeUnitCount * hoursPerDay * 30
  const utilisationPct = availableHours > 0
    ? Math.min(100, Math.round((totalBookedHours / availableHours) * 100))
    : 0

  const sportMix = Array.from(
    resources.reduce((map: Map<string, number>, r: any) => {
      const key = r.sport || r.resourceType || "other"
      map.set(key, (map.get(key) || 0) + 1)
      return map
    }, new Map<string, number>())
  )

  const bookingsByDate = (() => {
    const counts = new Map<string, number>()
    bookings.forEach((b: any) => {
      if (!b.startsAt) return
      const day = new Date(b.startsAt).toISOString().slice(0, 10)
      counts.set(day, (counts.get(day) || 0) + 1)
    })
    return Array.from(counts.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-14)
  })()

  const domainCards = [
    {
      title: "Facilities",
      href: "/facilities",
      icon: Building2,
      summary: `${venues.length} venues · ${resources.length} resources · ${units.length} bookable units`,
    },
    {
      title: "Bookings",
      href: "/bookings",
      icon: CalendarDays,
      summary: `${activeBookings.length} active · ${activeSeries.length} recurring series · ${pendingBookingsTotal} pending approval`,
    },
    {
      title: "People",
      href: "/people",
      icon: Users,
      summary: `${customers.length} contacts with household, role and lifecycle tracking`,
    },
    {
      title: "Membership",
      href: "/membership/plans",
      icon: Crown,
      summary: `${schemes.length} schemes · ${plans.length} plans · ${policies.length} policies · ${activeMemberships.length} active members`,
    },
    {
      title: "Teams",
      href: "/teams",
      icon: Shield,
      summary: `${activeTeams.length} active teams · ${totalSquadPlayers} players · ${totalSquadCoaches} coaches · public portal pages with squad, fixtures and sponsors`,
    },
    {
      title: "Competitions & Rankings",
      href: "/reports/competition-overview",
      icon: Trophy,
      summary: `${rawCompetitions.length} competitions · ${activeCompetitions.length} active · ${rankingConfigs.length} ranking configs · ELO and Points Table · submissions, audit trail and messaging`,
    },
    {
      title: "Coaching",
      href: "/coaching/coaches",
      icon: GraduationCap,
      summary: `${coaches.length} coaches and lesson types with session scheduling`,
    },
    {
      title: "Add-ons",
      href: "/add-ons",
      icon: Package,
      summary: `${activeAddOns.length} active add-ons covering equipment, facilities, access and services`,
    },
    {
      title: "Payments",
      href: "/reports/payment-health",
      icon: CreditCard,
      summary: `Gateway-agnostic payment service · Stripe live · GoCardless ready`,
    },
    {
      title: "Discipline & Work Cards",
      href: "/discipline",
      icon: ShieldCheck,
      summary: `Disciplinary records against competitions with status tracking · staff work cards linked to operational workflows`,
    },
    {
      title: "Reports",
      href: "/reports/bookings",
      icon: BarChart3,
      summary: `22 reports across bookings, revenue, utilisation, membership, coaching, teams, squad composition, website readiness, competition analytics and rankings leaderboard`,
    },
    {
      title: "Customer Portal",
      href: "/website/design",
      icon: Globe,
      summary: `Multi-tenant white-label portal with booking, account, membership self-service and public team pages with squad, fixtures and sponsors`,
    },
    {
      title: "Mobile App",
      href: "/settings",
      icon: Smartphone,
      summary: `Expo React Native app — auth, booking flow, teams tab, coaching wizard, competitions tab and account management`,
    },
    {
      title: "Booking Rules",
      href: "/booking-rules",
      icon: ShieldCheck,
      summary: `Access and pricing rules by membership type, role, time window and day of week`,
    },
    {
      title: "Communications Centre",
      href: "/communications/log",
      icon: MessageSquare,
      summary: `Email & SMS campaigns · rich text composer · 10 system notification templates · suppression, guardian routing, message log and campaign analytics`,
    },
    {
      title: "Support Chat",
      href: "/settings",
      icon: Layers,
      summary: `AI-assisted support widget embedded in admin and customer portals — tenant-authenticated, real-time assistance`,
    },
    {
      title: "Plan & Billing",
      href: "/pricing",
      icon: PoundSterling,
      summary: `SaaS pricing engine — Core, Growth, Pro and Enterprise plans · feature entitlements · org subscriptions · add-ons`,
    },
    {
      title: "Integrations",
      href: "/settings/integrations/api-keys",
      icon: Zap,
      summary: `${activeApiKeys.length} active API key${activeApiKeys.length !== 1 ? "s" : ""} · ${activeWebhookSubs.length} active webhook subscription${activeWebhookSubs.length !== 1 ? "s" : ""} · scoped credentials, HMAC-signed delivery and retry worker`,
    },
    {
      title: "AI Insights",
      href: "/reports/anomalies",
      icon: Brain,
      summary: `Churn/LTV/default scoring · ${highChurnTotal} high-churn member${highChurnTotal !== 1 ? "s" : ""} flagged · ${anomalyAlertCount} unresolved anomaly alert${anomalyAlertCount !== 1 ? "s" : ""} · utilisation forecasting with dead-slot detection · player matching by ELO · ELO draw seeding`,
    },
  ]

  const pilotSummaryItems = [
    "Flexible facility hierarchy — venues, resources and bookable units with conflict-aware availability",
    "Full CRUD for venues, resources, resource groups and bookable units — create and edit flows across admin portal",
    "Parent-child bookable unit conflict auto-sync — unit_conflicts rows auto-created and cleared when parent/child relationships change",
    "Facilities explorer with human-readable names — IDs replaced with venue and resource names throughout; unit parent shown by name",
    "Real-time availability checking across full and partial facility configurations with dynamic venue picker and hydration-safe NOW indicator",
    "Recurring (series) bookings with iCal RRULE support and per-occurrence management",
    "Booking access and pricing rules by membership type, role, time window and day of week",
    "Pending approval workflow with admin sign-off before booking confirmation",
    "People platform with household, role, tag and lifecycle tracking",
    "Membership schemes, plans, entitlement policies and live member records with renewal tracking",
    "Team management — rosters with player/coach/manager roles, fixtures, player availability, squad selection and fee charge runs",
    "Public team pages on the customer portal — squad grid, upcoming fixtures, recent results and sponsor carousel per team",
    "Competition management — competitions, divisions, entries, automated draw generation, match results, standings and reporting",
    "Competition submissions with admin approval workflow and rejection flow",
    "Competition audit trail — full chronological log of all competition state changes and admin actions",
    "Competition messaging — admin-to-participant messaging thread per competition",
    "Discipline module — disciplinary records against competitions with status tracking and admin management",
    "Work cards — staff task management linked to competitions and operational workflows",
    "Ratings/rankings engine — ELO rating system for individual sports and Points Table for team sports, updating automatically from verified match results",
    "Rankings leaderboard report — filterable per sport, gender and age group with rank, rating and trend indicators",
    "Coaching service — coach profiles, lesson types and session scheduling",
    "Add-ons for equipment hire, ancillary facilities, access services and products",
    "Gateway-agnostic payment service — Stripe implemented, GoCardless ready, idempotent by design",
    "Support chat widget — AI-assisted real-time support embedded in admin portal and customer portal, tenant-authenticated",
    "Org-level sponsor management with public sponsor carousel on team portal pages",
    "Multi-tenant admin portal, white-label customer portal with public team pages and branded Expo mobile app",
    "Reporting suite — 22 reports covering bookings, revenue, utilisation, membership, coaching, teams, squad composition, team website readiness, competition analytics and rankings leaderboard with PDF and CSV export",
    "Role-based admin access control across all portal functions",
    "Communications Centre — email and SMS campaigns with rich text composer, scheduling, audience targeting, suppression, guardian routing for minors and message log",
    "10 system notification templates — booking confirmed/cancelled/reminder, membership activated/renewal/expired, payment success/failure/refund and fixture reminder; Azure Communication Services ready",
    "Advanced audience builder — AND/OR rule engine with membership status, age range, tags, booking history, payment status and lifecycle stage; save named audience definitions",
    "Campaign analytics — per-campaign sent/delivery/open/click/bounce rates driven by the message log with visual engagement funnel",
    "Split payments — record multiple payers per booking with per-payer status (unpaid/partial/paid/refunded) and running collection total",
    "Seasonal availability config linking — override opening hours, slot duration and new-day release time per season with venue/group/resource scope and day-of-week targeting",
    "Integration layer — API key issuance with scoped credentials (HMAC-hashed, cs_ prefixed, shown once), webhook subscriptions with per-subscription signing secrets, delivery worker with exponential retry and dead-letter status",
    "Inbound event fan-out — booking-service, membership-service and payment-service all forward domain events to integration-service for delivery to registered webhook endpoints",
    "Accounting integration — Xero and QuickBooks OAuth 2.0 with token encryption at rest; real-time payment and membership event sync to invoices and credit notes; nightly batch reconciliation",
    "AI analytics — nightly member scoring across churn risk, lifetime value, payment default risk and optimal send hour; anomaly detection across 4 rules (dormant spike, payment failure spike, court hoarding, extreme duration); 7–14 day utilisation forecasting with dead-slot detection; player matching by ELO proximity with activity bonus",
    "ELO draw seeding — competition draws auto-seeded by ELO rating before generation; alphabetical fallback when no rating config exists",
    "Microservice architecture ready to scale to production on Azure",
    "817-test automated regression suite — 733 service integration tests across 12 microservices and 84 Playwright e2e tests covering end-to-end user journeys, all running against a real database",
  ]

  return (
    <PortalLayout
      title={org?.name ?? "Dashboard"}
      description={org?.about ?? "Operational overview across all platform domains."}
    >
      <div className="space-y-6">

        {/* ── KPI stat cards ── */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Revenue"
            value={`£${totalRevenue.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            description="Across all paid bookings in the platform."
            icon={PoundSterling}
            accent="#10b981"
          />
          <StatCard
            title="Active Bookings"
            value={activeBookings.length}
            description={`${bookingsToday.length} bookings on today's operating day.`}
            icon={CalendarDays}
          />
          <StatCard
            title="Active Members"
            value={activeMemberships.length}
            description={`${pendingBookingsTotal} bookings pending approval.`}
            icon={Crown}
          />
          <StatCard
            title="Utilisation"
            value={`${utilisationPct}%`}
            description={`${Math.round(totalBookedHours)} booked hours across ${activeUnitCount} units · ${opensAt}–${closesAt} (30 days).`}
            icon={TrendingUp}
          />
          <StatCard
            title="People"
            value={customers.length}
            description="Contact records linked to bookings and memberships."
            icon={Users}
          />
          <StatCard
            title="Teams"
            value={activeTeams.length}
            description={`${totalSquadPlayers} players · ${totalSquadCoaches} coaches & managers · ${publicTeams} public on portal.`}
            icon={Shield}
            accent="#7c3aed"
          />
          <StatCard
            title="Coaches"
            value={coaches.length}
            description="Coach profiles with lesson types and session scheduling."
            icon={GraduationCap}
            accent="#0891b2"
          />
          <StatCard
            title="Competitions"
            value={rawCompetitions.length}
            description={`${activeCompetitions.length} active · ${openForEntry.length} open for entry · ${rankingConfigs.length} rating config${rankingConfigs.length !== 1 ? "s" : ""}.`}
            icon={Trophy}
            accent="#f97316"
          />
          <StatCard
            title="Participants"
            value={uniqueCustomers}
            description={`Unique customers with at least one active booking. £${addOnRevenue.toFixed(2)} add-on revenue.`}
            icon={BarChart3}
            accent="#f59e0b"
          />
          <StatCard
            title="High-Churn Risk"
            value={highChurnTotal}
            description="Members with churn risk ≥ 60 — scored nightly by AI analytics."
            icon={Brain}
            accent="#dc2626"
          />
          <StatCard
            title="Anomaly Alerts"
            value={anomalyAlertCount}
            description="Unresolved alert-severity anomaly flags — rule-based detection runs nightly."
            icon={TrendingUp}
            accent="#ea580c"
          />
        </div>

        {/* ── Booking trends ── */}
        {dailyStats.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-md">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">Bookings — last 30 days</div>
                <BarChart3 className="h-4 w-4 text-slate-400" />
              </div>
              <DashboardTrendChart
                data={dailyStats}
                valueKey="bookingCount"
                color="#1857E0"
                formatValue={(v) => v.toLocaleString("en-GB")}
              />
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-md">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">Revenue — last 30 days</div>
                <PoundSterling className="h-4 w-4 text-slate-400" />
              </div>
              <DashboardTrendChart
                data={dailyStats}
                valueKey="revenue"
                color="#10b981"
                formatValue={(v) =>
                  `£${v.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                }
              />
            </div>
          </div>
        )}

        {/* ── Platform Coverage + Pilot Summary ── */}
        <SectionCard
          title="Platform Coverage"
          description="All operational domains now live across the microservice platform."
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {domainCards.map((card) => {
              const Icon = card.icon
              return (
                <Link
                  key={card.title}
                  href={card.href}
                  className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#1857E0]/30 hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1857E0] shadow-sm">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 transition group-hover:text-[#1857E0]">
                        {card.title}
                      </div>
                      <div className="mt-1 text-sm leading-5 text-slate-500">{card.summary}</div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </SectionCard>

        {/* ── Recent Platform Additions ── */}
        <SectionCard
          title="Recent Platform Additions"
          description="Features shipped in the latest development phases — covering AI analytics, accounting integrations, competition operations, communications, support and platform quality."
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[
              {
                title: "Communications Centre",
                body: "Full email & SMS campaign system — rich text composer with toolbar, 10 system notification templates, suppression engine, guardian routing, saved audiences, draft saving, recipient preview and per-campaign analytics.",
              },
              {
                title: "Advanced Audience Builder",
                body: "AND/OR rule builder for targeting campaigns — filter by membership status, age range, tags, booking history, payment status and lifecycle stage. Save named audience definitions and reuse across campaigns.",
              },
              {
                title: "Campaign Analytics",
                body: "Per-campaign stats dashboard: sent count, delivery rate, open rate, click rate and bounce rate. Visual engagement funnel driven by the message log. Suppression breakdown included.",
              },
              {
                title: "Split Payments on Bookings",
                body: "Record multiple payers against a single booking — payer name, amount, method (card/cash/BACS) and status (unpaid/partial/paid/refunded). Running totals show amount collected vs booking value.",
              },
              {
                title: "Seasonal Availability Configs",
                body: "Link availability configs (opening hours, slot duration, new-day release time) directly to a seasonal schedule to override defaults during that period. Supports venue, resource group or specific resource scope, with optional day-of-week targeting.",
              },
              {
                title: "Revenue & Bookings Trend Charts",
                body: "30-day bar charts for daily booking volumes and daily revenue on the admin dashboard — built as pure SVG with no external charting library.",
              },
              {
                title: "Full CRUD — Facilities",
                body: "Create and edit flows for venues, resources, resource groups and bookable units. Human-readable names throughout the facilities explorer; unit parent shown by name, not UUID.",
              },
              {
                title: "Parent-Child Unit Conflict Sync",
                body: "When a parentUnitId is set or changed on a bookable unit, unit_conflicts rows are auto-created and cleared — no manual conflict management needed.",
              },
              {
                title: "Competition Submissions",
                body: "Athletes and clubs submit entries for competition review. Admins can approve or reject with reason. Full submission status lifecycle tracked per competition.",
              },
              {
                title: "Competition Audit Trail & Messaging",
                body: "Chronological log of all competition state changes and admin actions. Admin-to-participant messaging thread per competition surfaced in the customer portal.",
              },
              {
                title: "Discipline Module & Work Cards",
                body: "Disciplinary records against competitions with status tracking. Staff work cards for task management linked to competitions and operational workflows.",
              },
              {
                title: "Rankings Leaderboard & Support Chat",
                body: "Filterable leaderboard (sport, gender, age group) with ELO and Points Table ratings. AI-assisted support chat widget in both admin and customer portals, tenant-authenticated.",
              },
              {
                title: "Integration Layer — API Keys",
                body: `Issue scoped API credentials for third-party systems. Each key is HMAC-SHA256 hashed at rest — the \`cs_\` prefixed plaintext is shown once on creation and never stored. Scopes: bookings:read, members:read, competitions:read, teams:read, webhooks:manage. ${apiKeys.length} key${apiKeys.length !== 1 ? "s" : ""} issued, ${activeApiKeys.length} active.`,
              },
              {
                title: "Integration Layer — Webhooks",
                body: `Subscribe third-party endpoints to platform events. Each subscription carries a per-tenant HMAC signing secret for request verification via X-ClubSpark-Signature. A 30-second cron worker delivers events with a 5-attempt exponential retry schedule (30s → 2m → 10m → 1h → 4h). ${webhookSubs.length} subscription${webhookSubs.length !== 1 ? "s" : ""} configured, ${activeWebhookSubs.length} active.`,
              },
              {
                title: "AI Insights — Churn Risk & LTV",
                body: `Nightly batch scoring for all members: churn risk (0–100, band: low/medium/high) using booking recency, trend, membership status, email engagement; lifetime value in £/year using booking + membership + coaching revenue with a tenure-based retention multiplier (0.7–1.5×). ${highChurnTotal} member${highChurnTotal !== 1 ? "s" : ""} currently at high churn risk.`,
              },
              {
                title: "AI Insights — Payment Default & Send Hour",
                body: "Payment default risk (0–100) based on failed payment history, no-show rate, membership tenure and recent successful payments. Optimal send hour identifies the best time to contact each member from their email-open histogram, returned with a confidence score. All four scores visible per-member in the AI Insights panel on the person detail page.",
              },
              {
                title: "ELO Draw Seeding",
                body: "Before generating a competition draw, admins can auto-seed confirmed entries by ELO rating — highest-rated player becomes seed 1. Falls back to alphabetical order if no ELO ranking config exists for the competition's sport. One-click 'Seed by ELO' button on the draw panel with clear feedback on source.",
              },
              {
                title: "Accounting Integration — Xero & QuickBooks",
                body: "OAuth 2.0 connection flow for Xero and QuickBooks. Tokens encrypted at rest (AES-256-GCM) and auto-refreshed within 5 minutes of expiry. Real-time sync: payment.succeeded → invoice, refund → credit note, membership.activated → invoice. Nightly batch reconciliation for any missed events. Configurable invoice mode (DRAFT/AUTHORISED), revenue account and tax rate.",
              },
              {
                title: "AI Anomaly Detection",
                body: `Rule-based detection running nightly at 03:00 UTC. Four rules: dormant account spike (60+ days inactive → 5+ bookings in 24h, alert), payment failure spike (3+ failures in 24h, alert), court hoarding (same unit booked 7+ times in 7 days, warning), extreme booking duration (>6 hours, warning). Idempotent — skips re-flagging unresolved duplicates within 24h. ${anomalyAlertCount} unresolved alert${anomalyAlertCount !== 1 ? "s" : ""} flagged.`,
              },
              {
                title: "Facility Utilisation Forecasting",
                body: "7–14 day occupancy forecasting by bookable unit — rolling 4-week average occupancy by unit, day-of-week and hour. Dead slots (predicted <30%) identified from 3 days ahead and surfaced per-unit with lowest occupancy. 'Previous bookers' endpoint returns person IDs who previously used that slot — ready to wire to a targeted campaign. Computed nightly at 02:00 UTC.",
              },
              {
                title: "Player Matching",
                body: "Match players with similar skill levels for a sport. ELO proximity within ±200 points scores up to 60 points (closer = higher); activity bonus (last-60-day booking frequency) adds up to 40 points. Graceful fallback to activity-only matching when no ELO config exists. Returns top 15 ranked candidates. Accessible via the Player Matching panel on every person detail page.",
              },
            ].map(({ title, body }) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 shadow-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1857E0]" />
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{title}</div>
                    <div className="mt-1 text-sm leading-5 text-slate-500">{body}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ── Pilot Summary ── */}
        <SectionCard
          title="Pilot Summary"
          description="Everything the platform now supports across facilities, bookings, teams, coaching, membership, payments and channels."
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {pilotSummaryItems.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#1857E0]" />
                <div className="text-sm leading-6 text-slate-700">{item}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ── Recent bookings + Membership snapshot ── */}
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <SectionCard
            title="Recent Bookings"
            description="Live operational view of the most recent bookings in the system."
            actionHref="/bookings"
            actionLabel="View Bookings"
          >
            <RecentBookingsTable bookings={recentBookings} />
          </SectionCard>

          <SectionCard
            title="Membership Snapshot"
            description="Schemes, plans, policies and active member records."
            actionHref="/membership/plans"
            actionLabel="View Membership"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: "Schemes", value: schemes.length },
                { label: "Plans", value: plans.length },
                { label: "Policies", value: policies.length },
                { label: "Active Members", value: activeMemberships.length },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-medium text-slate-900">Entitlement-driven model</div>
              <div className="mt-2 text-sm leading-6 text-slate-500">
                Plans carry entitlement policies that govern booking access, advance windows and differentiated pricing — independent of the booking module.
              </div>
            </div>
          </SectionCard>
        </div>

        {/* ── Operational alerts ── */}
        {(renewalsDue.length > 0 || unpaidMemberships.length > 0) && (
          <div className="grid gap-4 md:grid-cols-2">
            {renewalsDue.length > 0 && (
              <Link href="/membership/memberships?paymentStatus=renewals" className="group flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 transition hover:border-amber-300 hover:bg-amber-100">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 group-hover:bg-amber-200">
                    <CalendarDays className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-amber-900">{renewalsDue.length} renewal{renewalsDue.length !== 1 ? "s" : ""} due</div>
                    <div className="text-xs text-amber-700">Within the next 30 days</div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-amber-500" />
              </Link>
            )}
            {unpaidMemberships.length > 0 && (
              <Link href="/membership/memberships?paymentStatus=unpaid" className="group flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 transition hover:border-rose-300 hover:bg-rose-100">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 group-hover:bg-rose-200">
                    <PoundSterling className="h-5 w-5 text-rose-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-rose-900">{unpaidMemberships.length} unpaid membership{unpaidMemberships.length !== 1 ? "s" : ""}</div>
                    <div className="text-xs text-rose-700">Active members with outstanding payment</div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-rose-500" />
              </Link>
            )}
          </div>
        )}

        {/* ── Renewals detail ── */}
        {renewalsDue.length > 0 && (
          <SectionCard
            title={`Renewals Due (${renewalsDue.length})`}
            description="Memberships with a renewal date in the next 30 days."
            actionHref="/membership/memberships?tab=renewals"
            actionLabel="View all"
          >
            <div className="divide-y divide-slate-100">
              {renewalsDue.slice(0, 5).map((m: any) => {
                const renewalDate = m.renewalDate
                  ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(m.renewalDate))
                  : "—"
                const daysUntil = m.renewalDate
                  ? Math.ceil((new Date(m.renewalDate).getTime() - Date.now()) / 86400000)
                  : null
                return (
                  <Link
                    key={m.id}
                    href={`/membership/memberships/${m.id}`}
                    className="flex items-center justify-between gap-4 py-3 transition hover:text-[#1857E0]"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-900">{m.planName ?? "Unknown plan"}</div>
                      <div className="text-xs text-slate-500">Renews {renewalDate}</div>
                    </div>
                    {daysUntil != null && (
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        daysUntil <= 7 ? "bg-rose-100 text-rose-700" : daysUntil <= 14 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                      }`}>
                        {daysUntil <= 0 ? "Today" : `${daysUntil}d`}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </SectionCard>
        )}

        {/* ── Revenue + booked hours trend charts ── */}
        {dailyStats.length > 0 && (() => {
          const chartH = 80
          const n = dailyStats.length
          const barW = Math.floor(560 / n) - 2
          const maxRev = Math.max(...dailyStats.map((d) => d.addOnRevenue), 1)
          const maxHrs = Math.max(...dailyStats.map((d) => d.bookedHours), 1)

          return (
            <div className="grid gap-6 xl:grid-cols-2">
              <SectionCard title="Add-on revenue (30 days)" description="Daily add-on revenue from active booking add-ons." actionHref="/bookings" actionLabel="View bookings">
                <div className="overflow-x-auto">
                  <svg viewBox={`0 0 560 ${chartH + 28}`} className="w-full" aria-label="Daily add-on revenue bar chart">
                    {dailyStats.map((d, i) => {
                      const barH = Math.max(4, Math.round((d.addOnRevenue / maxRev) * chartH))
                      const x = i * (barW + 2)
                      return (
                        <g key={d.date}>
                          <rect x={x} y={chartH - barH} width={barW} height={barH} rx={3} fill="#10b981" opacity={0.8} />
                          {barW >= 20 && <text x={x + barW / 2} y={chartH + 16} textAnchor="middle" fontSize={9} fill="#94a3b8">{d.date.slice(5)}</text>}
                        </g>
                      )
                    })}
                  </svg>
                </div>
              </SectionCard>

              <SectionCard title="Booked hours (30 days)" description="Daily booked hours across all active bookings." actionHref="/bookings" actionLabel="View bookings">
                <div className="overflow-x-auto">
                  <svg viewBox={`0 0 560 ${chartH + 28}`} className="w-full" aria-label="Daily booked hours bar chart">
                    {dailyStats.map((d, i) => {
                      const barH = Math.max(4, Math.round((d.bookedHours / maxHrs) * chartH))
                      const x = i * (barW + 2)
                      return (
                        <g key={d.date}>
                          <rect x={x} y={chartH - barH} width={barW} height={barH} rx={3} fill="#1857E0" opacity={0.7} />
                          {barW >= 20 && <text x={x + barW / 2} y={chartH + 16} textAnchor="middle" fontSize={9} fill="#94a3b8">{d.date.slice(5)}</text>}
                        </g>
                      )
                    })}
                  </svg>
                </div>
              </SectionCard>
            </div>
          )
        })()}

        {/* ── Bookings over time ── */}
        {bookingsByDate.length > 0 && (() => {
          const maxCount = Math.max(...bookingsByDate.map(([, c]) => c), 1)
          const chartH = 80
          const barW = Math.floor(560 / bookingsByDate.length) - 2
          return (
            <SectionCard title="Bookings over time" description="Booking volume by date from the current data set." actionHref="/bookings" actionLabel="View all">
              <div className="overflow-x-auto">
                <svg viewBox={`0 0 560 ${chartH + 28}`} className="w-full" aria-label="Bookings per day bar chart">
                  {bookingsByDate.map(([date, count], i) => {
                    const barH = Math.max(4, Math.round((count / maxCount) * chartH))
                    const x = i * (barW + 2)
                    const y = chartH - barH
                    return (
                      <g key={date}>
                        <rect x={x} y={y} width={barW} height={barH} rx={3} fill="#1857E0" opacity={0.8} />
                        {barW >= 20 && <text x={x + barW / 2} y={chartH + 16} textAnchor="middle" fontSize={9} fill="#94a3b8">{date.slice(5)}</text>}
                        {count > 0 && barH > 16 && <text x={x + barW / 2} y={y + barH - 5} textAnchor="middle" fontSize={9} fill="white" fontWeight="600">{count}</text>}
                      </g>
                    )
                  })}
                </svg>
              </div>
            </SectionCard>
          )
        })()}

        {/* ── Facilities + Sport mix + Teams snapshot ── */}
        <div className="grid gap-6 xl:grid-cols-3">
          <SectionCard title="Facilities Overview" description="Venues, resources and bookable units." actionHref="/facilities" actionLabel="View Facilities">
            <div className="space-y-4">
              {[
                { label: "Venues", sub: "Top level operating locations", value: venues.length },
                { label: "Resources", sub: "Courts, pitches and playable assets", value: resources.length },
                { label: "Bookable Units", sub: "Full, half and split booking options", value: units.length },
              ].map(({ label, sub, value }) => (
                <div key={label} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm transition hover:shadow-md">
                  <div>
                    <div className="text-sm font-medium text-slate-900">{label}</div>
                    <div className="mt-1 text-xs text-slate-500">{sub}</div>
                  </div>
                  <div className="text-2xl font-semibold text-slate-950">{value}</div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Sport Mix" description="Resource coverage across the pilot venue structure.">
            <div className="space-y-3">
              {sportMix.length === 0 ? (
                <div className="text-sm text-slate-500">No sport data available.</div>
              ) : (
                sportMix.map(([sport, count]) => (
                  <div key={sport} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-4 py-3 shadow-sm">
                    <div className="text-sm font-medium capitalize text-slate-900">{sport}</div>
                    <div className="text-sm font-semibold text-slate-700">{count}</div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard title="Teams, Coaching &amp; Competitions" description="Team sports management, coaching operations, full competition lifecycle, rankings engine, discipline and work cards." actionHref="/teams" actionLabel="View Teams">
            <div className="space-y-4">
              {[
                { label: "Active Teams", sub: "With rosters and fixture schedules", value: activeTeams.length },
                { label: "Recurring Series", sub: "iCal RRULE recurring bookings", value: activeSeries.length },
                { label: "Coaches", sub: "With lesson types and sessions", value: coaches.length },
                { label: "Competitions", sub: `${activeCompetitions.length} active · ${openForEntry.length} open · submissions, audit, messaging`, value: rawCompetitions.length },
                { label: "Ranking Configs", sub: "ELO and Points Table across sports", value: rankingConfigs.length },
              ].map(({ label, sub, value }) => (
                <div key={label} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm transition hover:shadow-md">
                  <div>
                    <div className="text-sm font-medium text-slate-900">{label}</div>
                    <div className="mt-1 text-xs text-slate-500">{sub}</div>
                  </div>
                  <div className="text-2xl font-semibold text-slate-950">{value}</div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* ── What this pilot demonstrates ── */}
        <SectionCard
          title="What this pilot demonstrates"
          description="An executive view of the platform capabilities now proven across the rebuild."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                icon: LayoutGrid,
                title: "Operational Core",
                body: "Facilities, conflict-aware availability, bookings, booking rules and people work together as one operating platform across web, portal and mobile.",
              },
              {
                icon: Crown,
                title: "Membership Engine",
                body: "Schemes, plans, entitlement policies and live member records with renewal tracking — independent of the booking module by design.",
              },
              {
                icon: Shield,
                title: "Teams, Competition & Ratings",
                body: "Full team management with rosters, fixtures, player availability, squad selection and charge runs — plus a full competition lifecycle (entries, draws, results, standings) and an automatic ratings engine: ELO for individual sports and Points Table for team sports.",
              },
              {
                icon: GraduationCap,
                title: "Coaching & Programmes",
                body: "Coach profiles, lesson types and coaching session scheduling on the same booking primitives — no redesign needed for programmes.",
              },
              {
                icon: CreditCard,
                title: "Payments Infrastructure",
                body: "Gateway-agnostic payment service with Stripe implemented, idempotency, refunds, webhook normalisation and GoCardless ready to plug in.",
              },
              {
                icon: Package,
                title: "Commercial Extensibility",
                body: "Add-ons model equipment hire, ancillary facilities, access services and products. Booking rules apply pricing and access constraints per membership type or role.",
              },
              {
                icon: RefreshCw,
                title: "Multi-Channel Platform",
                body: "Admin portal, multi-tenant white-label customer portal and branded Expo mobile app — all live and connected to the same service layer.",
              },
              {
                icon: Zap,
                title: "Integration Layer",
                body: "API key issuance with scoped credentials for third-party consumers. Webhook subscriptions with HMAC-signed delivery to external endpoints. 30-second cron worker, 5-attempt exponential retry and dead-letter queue. Events forwarded from booking, membership and payment services automatically.",
              },
              {
                icon: Brain,
                title: "AI Analytics Layer",
                body: "Nightly member scoring (churn, LTV, default risk, send hour) · rule-based anomaly detection with 4 detection rules · 7–14 day utilisation forecasting with dead-slot identification and previous-booker lookup · player matching by ELO proximity. Pure TypeScript, cross-schema SQL — no ML infrastructure required.",
              },
              {
                icon: Layers,
                title: "Production Architecture",
                body: "Twelve independent NestJS microservices with Prisma migrations, 733 service integration tests, 84 Playwright e2e tests (817 total), Swagger docs on every service and a clear Azure deployment path.",
              },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1857E0]">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="font-semibold text-slate-900">{title}</div>
                <div className="mt-2 text-sm leading-6 text-slate-500">{body}</div>
              </div>
            ))}
          </div>
        </SectionCard>

      </div>
    </PortalLayout>
  )
}
