import Link from "next/link"
import { Plus, ChevronRight, Building2 } from "lucide-react"
import { getVenues } from "@/lib/api"
import { PortalLayout } from "@/components/portal-layout"

export default async function VenuesPage() {
  const venues = await getVenues()

  return (
    <PortalLayout title="Venues">
      <div className="px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Venue Setup
            </div>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Venues</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage your venue locations.
            </p>
          </div>
          <Link
            href="/venues/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add venue
          </Link>
        </div>

        {venues.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 py-20">
            <Building2 className="mb-4 h-10 w-10 text-slate-300" />
            <div className="text-base font-semibold text-slate-700">No venues yet</div>
            <p className="mt-1 text-sm text-slate-500">Add your first venue to get started.</p>
            <Link
              href="/venues/new"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add venue
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
            <div className="divide-y divide-slate-100">
              {venues.map((venue: any) => (
                <Link
                  key={venue.id}
                  href={`/venues/${venue.id}`}
                  className="flex items-center justify-between px-6 py-4 transition hover:bg-slate-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                      <Building2 className="h-5 w-5 text-slate-500" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{venue.name}</div>
                      {(venue.city || venue.country) && (
                        <div className="mt-0.5 text-xs text-slate-500">
                          {[venue.city, venue.country].filter(Boolean).join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  )
}
