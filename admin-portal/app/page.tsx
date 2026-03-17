import Link from "next/link"
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Crown,
  LayoutGrid,
  Package,
  ShieldCheck,
  Users,
} from "lucide-react"
import { PortalLayout } from "@/components/portal-layout"
import {
  getAddOnServices,
  getBookableUnits,
  getBookings,
  getCustomers,
  getEntitlementPolicies,
  getMembershipPlans,
  getMembershipSchemes,
  getMemberships,
  getResources,
  getVenues,
} from "@/lib/api"

function formatDateTime(value?: string) {
  if (!value) return "—"

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function formatDate(value?: string) {
  if (!value) return "—"

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
  }).format(new Date(value))
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string
  value: string | number
  description: string
  icon: any
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-md transition-shadow hover:shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-slate-500">{title}</div>
          <div className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {value}
          </div>
          <div className="mt-2 text-sm leading-6 text-slate-500">{description}</div>
        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1857E0]/10">
          <Icon className="h-6 w-6 text-[#1857E0]" />
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

function StatusPill({
  label,
  tone = "slate",
}: {
  label: string
  tone?: "emerald" | "blue" | "amber" | "slate"
}) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "blue"
      ? "bg-blue-50 text-blue-700"
      : tone === "amber"
      ? "bg-amber-50 text-amber-700"
      : "bg-slate-100 text-slate-700"

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${toneClass}`}>
      {label}
    </span>
  )
}

export default async function DashboardPage() {
  const [
    venuesResult,
    resourcesResult,
    unitsResult,
    bookingsResult,
    customersResult,
    schemesResult,
    plansResult,
    policiesResult,
    membershipsResult,
    addOnsResult,
  ] = await Promise.allSettled([
    getVenues(),
    getResources(),
    getBookableUnits(),
    getBookings(),
    getCustomers(),
    getMembershipSchemes(),
    getMembershipPlans(),
    getEntitlementPolicies(),
    getMemberships(),
    getAddOnServices(),
  ])

  const venuesResponse = venuesResult.status === "fulfilled" ? venuesResult.value : null
  const resourcesResponse = resourcesResult.status === "fulfilled" ? resourcesResult.value : null
  const unitsResponse = unitsResult.status === "fulfilled" ? unitsResult.value : null
  const bookingsResponse = bookingsResult.status === "fulfilled" ? bookingsResult.value : null
  const customersResponse = customersResult.status === "fulfilled" ? customersResult.value : null
  const schemesResponse = schemesResult.status === "fulfilled" ? schemesResult.value : null
  const plansResponse = plansResult.status === "fulfilled" ? plansResult.value : null
  const policiesResponse = policiesResult.status === "fulfilled" ? policiesResult.value : null
  const membershipsResponse = membershipsResult.status === "fulfilled" ? membershipsResult.value : null
  const addOnsResponse = addOnsResult.status === "fulfilled" ? addOnsResult.value : null

  const venues = venuesResponse?.data || venuesResponse || []
  const resources = resourcesResponse?.data || resourcesResponse || []
  const units = unitsResponse?.data || unitsResponse || []
  const bookings = bookingsResponse?.data || bookingsResponse || []
  const customers = customersResponse?.data || customersResponse || []
  const schemes = schemesResponse?.data || schemesResponse || []
  const plans = plansResponse?.data || plansResponse || []
  const policies = policiesResponse?.data || policiesResponse || []
  const memberships = membershipsResponse?.data || membershipsResponse || []
  const addOns = addOnsResponse?.data || addOnsResponse || []

  const activeBookings = bookings.filter((booking: any) => booking.status === "active")
  const activeMemberships = memberships.filter(
    (membership: any) => membership.status === "active"
  )
  const activeAddOns = addOns.filter((addOn: any) => addOn.status === "active")

  const recentBookings = [...bookings]
    .sort(
      (a: any, b: any) =>
        new Date(b.startsAt || 0).getTime() -
        new Date(a.startsAt || 0).getTime()
    )
    .slice(0, 6)

  const bookingsToday = bookings.filter((booking: any) => {
    const startsAt = booking.startsAt
    if (!startsAt) return false

    const bookingDate = new Date(startsAt).toISOString().slice(0, 10)
    return bookingDate === "2026-03-15"
  })

  const sportMix = Array.from(
    resources.reduce((map: Map<string, number>, resource: any) => {
      const key = resource.sport || resource.resourceType || "unknown"
      map.set(key, (map.get(key) || 0) + 1)
      return map
    }, new Map<string, number>())
  )

  const domainCards = [
    {
      title: "Facilities",
      href: "/facilities",
      icon: Building2,
      summary: `${venues.length} venues, ${resources.length} resources, ${units.length} bookable units`,
    },
    {
      title: "Bookings",
      href: "/bookings",
      icon: CalendarDays,
      summary: `${activeBookings.length} active bookings with live availability controls`,
    },
    {
      title: "Customers",
      href: "/customers",
      icon: Users,
      summary: `${customers.length} customer records linked to bookings and memberships`,
    },
    {
      title: "Membership",
      href: "/membership/plans",
      icon: Crown,
      summary: `${schemes.length} schemes, ${plans.length} plans, ${policies.length} policies, ${memberships.length} memberships`,
    },
    {
      title: "Add Ons",
      href: "/add-ons",
      icon: Package,
      summary: `${addOns.length} add ons covering equipment, facilities, access and services`,
    },
    {
      title: "Availability",
      href: "/availability",
      icon: ShieldCheck,
      summary: `Conflict aware scheduling across full and partial facility units`,
    },
  ]

  return (
    <PortalLayout
      title="Dashboard"
      description="Operational overview of the ClubSpark pilot platform across facilities, bookings, customers, membership and add ons."
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Facilities"
            value={resources.length}
            description={`${venues.length} venues and ${units.length} bookable units now modelled in the platform.`}
            icon={Building2}
          />
          <StatCard
            title="Bookings"
            value={activeBookings.length}
            description={`${bookingsToday.length} bookings on the current operating day across courts and pitches.`}
            icon={CalendarDays}
          />
          <StatCard
            title="Customers"
            value={customers.length}
            description={`Customer records can now be linked directly to bookings and memberships.`}
            icon={Users}
          />
          <StatCard
            title="Membership"
            value={activeMemberships.length}
            description={`${plans.length} plans and ${policies.length} policies now support entitlement led growth.`}
            icon={Crown}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <SectionCard
            title="Platform Coverage"
            description="The pilot now covers the core operational domains required to run a multi sport venue platform."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                        <div className="mt-1 text-sm leading-6 text-slate-500">
                          {card.summary}
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </SectionCard>

          <SectionCard
            title="Pilot Summary"
            description="A simple view of what the platform now supports for the demo."
          >
            <div className="space-y-3">
              {[
                "Flexible facility hierarchy with venues, resources and bookable units",
                "Conflict aware availability across full and partial courts and pitches",
                "Customer management linked to operational bookings",
                "Membership schemes, plans, policies and live memberships",
                "Add ons for equipment, services, access and ancillary facilities",
                "Service based architecture ready for continued scale out",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#1857E0]" />
                  <div className="text-sm leading-6 text-slate-700">{item}</div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <SectionCard
            title="Recent Bookings"
            description="A live operational view of the most recent bookings currently in the system."
            actionHref="/bookings"
            actionLabel="View Bookings"
          >
            {recentBookings.length === 0 ? (
              <div className="text-sm text-slate-500">No bookings found.</div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Reference
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Customer
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Start
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {recentBookings.map((booking: any) => (
                      <tr key={booking.id} className="transition hover:bg-blue-50/40">
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                          {booking.bookingReference || booking.id}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {booking.customerFirstName || booking.customerLastName
                            ? `${booking.customerFirstName || ""} ${
                                booking.customerLastName || ""
                              }`.trim()
                            : "Walk in / not linked"}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {formatDateTime(booking.startsAt)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill
                            label={booking.status || "unknown"}
                            tone={booking.status === "active" ? "emerald" : "slate"}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Membership Snapshot"
            description="Membership is now represented as commercial schemes, plans, policies and active member records."
            actionHref="/membership/plans"
            actionLabel="View Membership"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Schemes
                </div>
                <div className="mt-2 text-2xl font-semibold text-slate-950">{schemes.length}</div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Plans
                </div>
                <div className="mt-2 text-2xl font-semibold text-slate-950">{plans.length}</div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Policies
                </div>
                <div className="mt-2 text-2xl font-semibold text-slate-950">{policies.length}</div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Memberships
                </div>
                <div className="mt-2 text-2xl font-semibold text-slate-950">
                  {memberships.length}
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-medium text-slate-900">
                Entitlement driven model
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-500">
                Plans can now carry policies and entitlement rules, creating the foundation for
                membership aware bookings, access control and differentiated benefits.
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <SectionCard
            title="Facilities Overview"
            description="The platform models venues, playable resources and segmented bookable units."
            actionHref="/facilities"
            actionLabel="View Facilities"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm transition hover:shadow-md">
                <div>
                  <div className="text-sm font-medium text-slate-900">Venues</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Top level operating locations
                  </div>
                </div>
                <div className="text-2xl font-semibold text-slate-950">{venues.length}</div>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm transition hover:shadow-md">
                <div>
                  <div className="text-sm font-medium text-slate-900">Resources</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Courts, pitches and playable assets
                  </div>
                </div>
                <div className="text-2xl font-semibold text-slate-950">{resources.length}</div>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm transition hover:shadow-md">
                <div>
                  <div className="text-sm font-medium text-slate-900">Bookable Units</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Full, half and quarter level booking options
                  </div>
                </div>
                <div className="text-2xl font-semibold text-slate-950">{units.length}</div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Sport Mix"
            description="Current resource coverage across the seeded pilot venue structure."
          >
            <div className="space-y-3">
              {sportMix.length === 0 ? (
                <div className="text-sm text-slate-500">No sport data available.</div>
              ) : (
                sportMix.map(([sport, count]) => (
                  <div
                    key={sport}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-4 py-3 shadow-sm"
                  >
                    <div className="text-sm font-medium capitalize text-slate-900">
                      {sport}
                    </div>
                    <div className="text-sm font-semibold text-slate-700">{count}</div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Add Ons Overview"
            description="Optional services and ancillary items are now modelled as managed venue assets."
            actionHref="/add-ons"
            actionLabel="View Add Ons"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm transition hover:shadow-md">
                <div>
                  <div className="text-sm font-medium text-slate-900">Configured Add Ons</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Equipment, facilities, services and access
                  </div>
                </div>
                <div className="text-2xl font-semibold text-slate-950">{addOns.length}</div>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm transition hover:shadow-md">
                <div>
                  <div className="text-sm font-medium text-slate-900">Active</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Ready to be used in future booking flows
                  </div>
                </div>
                <div className="text-2xl font-semibold text-slate-950">
                  {activeAddOns.length}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-medium text-slate-900">Why this matters</div>
                <div className="mt-2 text-sm leading-6 text-slate-500">
                  Add ons now provide a structured way to model equipment hire, lights, changing
                  rooms and access services alongside core facility operations.
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        <SectionCard
          title="What this pilot now demonstrates"
          description="A concise executive view of the current rebuild status."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1857E0]">
                <LayoutGrid className="h-5 w-5 text-white" />
              </div>
              <div className="font-semibold text-slate-900">Operational Core</div>
              <div className="mt-2 text-sm leading-6 text-slate-500">
                Facilities, availability, bookings and customers now work together as one operating
                platform.
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1857E0]">
                <Crown className="h-5 w-5 text-white" />
              </div>
              <div className="font-semibold text-slate-900">Membership Engine</div>
              <div className="mt-2 text-sm leading-6 text-slate-500">
                Schemes, plans, policies and memberships are in place to support entitlement led
                growth.
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1857E0]">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div className="font-semibold text-slate-900">Commercial Extensibility</div>
              <div className="mt-2 text-sm leading-6 text-slate-500">
                Add ons create a route to monetise ancillary services and venue extras beyond the
                base facility booking.
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1857E0]">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <div className="font-semibold text-slate-900">Service Architecture</div>
              <div className="mt-2 text-sm leading-6 text-slate-500">
                The platform is now structured across services in a way that can scale beyond the
                pilot into production.
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </PortalLayout>
  )
}