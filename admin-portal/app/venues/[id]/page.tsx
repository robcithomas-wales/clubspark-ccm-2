import Link from "next/link"
import { notFound } from "next/navigation"
import { PortalLayout } from "@/components/portal-layout"
import { getVenues, getResourceGroups, getAvailabilityConfigs } from "@/lib/api"

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export default async function VenueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const venues = await getVenues()
  const venue = venues.find((item: any) => item.id === id)

  if (!venue) {
    notFound()
  }

  const [groups, configs] = await Promise.all([
    getResourceGroups({ venueId: id }),
    getAvailabilityConfigs({ scopeType: "venue", scopeId: id }),
  ])

  return (
    <PortalLayout
      title={venue.name}
      description="Venue details"
    >
      <div className="space-y-6">
        {/* Venue details */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Details</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Name</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">{venue.name}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Timezone</div>
              <div className="mt-2 text-sm text-slate-900">{venue.timezone || "Unknown"}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">City</div>
              <div className="mt-2 text-sm text-slate-900">{venue.city || "Unknown"}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Country</div>
              <div className="mt-2 text-sm text-slate-900">{venue.country || "Unknown"}</div>
            </div>
            <div className="md:col-span-2">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Venue id</div>
              <div className="mt-2 break-all text-sm text-slate-900">{venue.id}</div>
            </div>
          </div>
        </div>

        {/* Resource groups */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
              Resource Groups ({groups.length})
            </h2>
            <Link
              href={`/resource-groups/new?venueId=${id}`}
              className="inline-flex h-8 items-center rounded-lg bg-[#1857E0] px-3 text-xs font-medium text-white transition hover:bg-[#1832A8]"
            >
              Add group
            </Link>
          </div>

          {groups.length === 0 ? (
            <p className="text-sm text-slate-400">No resource groups yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {groups.map((group: any) => (
                <div key={group.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    {group.colour && (
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: group.colour }}
                      />
                    )}
                    <div>
                      <div className="text-sm font-medium text-slate-900">{group.name}</div>
                      {group.sport && (
                        <div className="mt-0.5 text-xs capitalize text-slate-500">{group.sport}</div>
                      )}
                    </div>
                  </div>
                  <Link href={`/resource-groups/${group.id}`} className="text-xs font-medium text-[#1857E0] hover:underline">
                    View
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Venue-level availability */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
              Availability Configuration
            </h2>
            <Link
              href={`/availability-configs/new?scopeType=venue&scopeId=${id}`}
              className="inline-flex h-8 items-center rounded-lg bg-[#1857E0] px-3 text-xs font-medium text-white transition hover:bg-[#1832A8]"
            >
              Add config
            </Link>
          </div>

          {configs.length === 0 ? (
            <p className="text-sm text-slate-400">
              No venue-level availability configured. Add a catch-all config to set opening hours.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {configs.map((config: any) => (
                <div key={config.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      {config.dayOfWeek !== null && config.dayOfWeek !== undefined
                        ? DAY_NAMES[config.dayOfWeek]
                        : "All days (catch-all)"}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {config.opensAt ?? "—"} – {config.closesAt ?? "—"}
                      {config.slotDurationMinutes ? ` · ${config.slotDurationMinutes}min slots` : ""}
                      {config.bookingIntervalMinutes ? ` · ${config.bookingIntervalMinutes}min intervals` : ""}
                    </div>
                  </div>
                  <Link
                    href={`/availability-configs/${config.id}`}
                    className="text-xs font-medium text-[#1857E0] hover:underline"
                  >
                    Edit
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Link
            href={`/resources/new?venueId=${encodeURIComponent(venue.id)}`}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[#1857E0] px-5 text-sm font-medium text-white transition hover:bg-[#1832A8]"
          >
            Add resource
          </Link>
          <Link
            href={`/resource-groups/new?venueId=${encodeURIComponent(venue.id)}`}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Add resource group
          </Link>
          <Link
            href="/facilities"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Back to facilities
          </Link>
        </div>
      </div>
    </PortalLayout>
  )
}
