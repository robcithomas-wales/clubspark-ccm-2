import Link from "next/link"
import { getBookingSeries } from "@/lib/api"
import { PortalLayout } from "@/components/portal-layout"
import { Repeat2, ChevronRight, Plus } from "lucide-react"

function formatDate(value?: string | null) {
  if (!value) return "n/a"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}

function statusBadge(status: string) {
  if (status === "cancelled") {
    return (
      <span className="inline-flex rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700 ring-1 ring-rose-200">
        Cancelled
      </span>
    )
  }
  return (
    <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
      Active
    </span>
  )
}

export default async function BookingSeriesPage() {
  const series = await getBookingSeries()

  return (
    <PortalLayout title="Recurring Series">
      <div className="px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Bookings
            </div>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">
              Recurring Series
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              All recurring booking series for this venue.
            </p>
          </div>
          <Link
            href="/create-booking?recurring=1"
            className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[#1832A8] px-4 text-sm font-semibold text-white transition hover:bg-[#142a8c]"
          >
            <Plus className="h-4 w-4" />
            New recurring series
          </Link>
        </div>

        {series.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 py-20">
            <Repeat2 className="mb-4 h-10 w-10 text-slate-300" />
            <div className="text-base font-semibold text-slate-700">No recurring series yet</div>
            <p className="mt-1 text-sm text-slate-500">
              Create a booking and turn on the &ldquo;Recurring booking&rdquo; toggle.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
            <div className="grid grid-cols-[1fr_1fr_auto_auto_auto_40px] gap-x-4 border-b border-slate-200 bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              <div>Unit / Resource</div>
              <div>RRULE</div>
              <div>Slot</div>
              <div>Created</div>
              <div>Status</div>
              <div />
            </div>

            <div className="divide-y divide-slate-100">
              {series.map((s: any) => (
                <Link
                  key={s.id}
                  href={`/booking-series/${s.id}`}
                  className="grid grid-cols-[1fr_1fr_auto_auto_auto_40px] items-center gap-x-4 px-6 py-4 transition hover:bg-slate-50"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {s.bookableUnitId}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500 truncate">
                      {s.resourceId}
                    </div>
                  </div>
                  <div className="font-mono text-xs text-slate-600 truncate">{s.rrule}</div>
                  <div className="text-sm text-slate-700 whitespace-nowrap">
                    {s.slotStartsAt} – {s.slotEndsAt}
                  </div>
                  <div className="text-sm text-slate-500 whitespace-nowrap">
                    {formatDate(s.createdAt)}
                  </div>
                  <div>{statusBadge(s.status)}</div>
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
