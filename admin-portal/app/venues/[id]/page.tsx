import Link from "next/link"
import { getVenues } from "@/lib/api"
import { PortalLayout } from "@/components/portal-layout"

export default async function VenueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const venues = await getVenues()
  const venue = venues.find((item: any) => item.id === id)

  if (!venue) {
    return (
      <PortalLayout
        title="Venue"
        description="Venue details"
      >
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm font-medium text-rose-700">
          Venue not found.
        </div>
      </PortalLayout>
    )
  }

  return (
    <PortalLayout
      title={venue.name}
      description="Venue details"
    >
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Name
              </div>
              <div className="mt-2 text-lg font-semibold text-slate-900">
                {venue.name}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Timezone
              </div>
              <div className="mt-2 text-sm text-slate-900">
                {venue.timezone || "Unknown"}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                City
              </div>
              <div className="mt-2 text-sm text-slate-900">
                {venue.city || "Unknown"}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Country
              </div>
              <div className="mt-2 text-sm text-slate-900">
                {venue.country || "Unknown"}
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Venue id
              </div>
              <div className="mt-2 break-all text-sm text-slate-900">
                {venue.id}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Link
            href={`/resources/new?venueId=${encodeURIComponent(venue.id)}`}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[#1857E0] px-5 text-sm font-medium text-white transition hover:bg-[#1832A8]"
          >
            Add resource
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