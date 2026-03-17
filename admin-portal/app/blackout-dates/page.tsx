import Link from "next/link"
import { Plus, CalendarOff, RefreshCw } from "lucide-react"
import { PortalLayout } from "@/components/portal-layout"
import { getBlackoutDates, getVenues } from "@/lib/api"

function formatDate(value?: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function getTypeLabel(record: any) {
  if (record.recurrenceRule) return "Recurring"
  const start = new Date(record.startDate)
  const end = new Date(record.endDate)
  return start.toDateString() === end.toDateString() ? "Single day" : "Date range"
}

function getTypeClasses(record: any) {
  if (record.recurrenceRule) return "bg-violet-50 text-violet-700 ring-1 ring-violet-200"
  const start = new Date(record.startDate)
  const end = new Date(record.endDate)
  return start.toDateString() === end.toDateString()
    ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
    : "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
}

export default async function BlackoutDatesPage() {
  const [blackouts, venues] = await Promise.all([
    getBlackoutDates().catch(() => []),
    getVenues().catch(() => []),
  ])

  const venueMap = new Map((venues as any[]).map((v: any) => [v.id, v.name]))

  return (
    <PortalLayout
      title="Blackout Dates"
      description="Block out dates when the venue or specific resources are closed."
    >
      <div className="space-y-6">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">All blackout dates</h2>
              <p className="mt-1 text-sm text-slate-500">
                Single dates, date ranges, and recurring closures.
              </p>
            </div>
            <Link
              href="/blackout-dates/new"
              className="inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1832A8]"
            >
              <Plus className="h-4 w-4" />
              Add blackout date
            </Link>
          </div>

          {blackouts.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <CalendarOff className="mx-auto mb-3 h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-500">No blackout dates configured.</p>
              <p className="mt-1 text-xs text-slate-400">
                Add dates when the venue or resources are closed.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden grid-cols-6 gap-4 border-b border-slate-200 bg-slate-100 px-6 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 lg:grid">
                <div className="col-span-2">Name</div>
                <div>Venue / Resource</div>
                <div className="text-center">Type</div>
                <div className="text-center">Dates</div>
                <div />
              </div>

              <div className="divide-y divide-slate-100">
                {(blackouts as any[]).map((record) => (
                  <Link
                    key={record.id}
                    href={`/blackout-dates/${record.id}`}
                    className="block px-6 py-4 transition hover:bg-blue-50/40"
                  >
                    <div className="grid gap-3 lg:grid-cols-6 lg:items-center">
                      <div className="col-span-2 flex items-center gap-3">
                        {record.recurrenceRule ? (
                          <RefreshCw className="h-4 w-4 shrink-0 text-violet-400" />
                        ) : (
                          <CalendarOff className="h-4 w-4 shrink-0 text-slate-400" />
                        )}
                        <div>
                          <div className="font-medium text-slate-900">{record.name}</div>
                          {record.recurrenceRule && (
                            <div className="mt-0.5 font-mono text-xs text-slate-400">
                              {record.recurrenceRule}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-sm text-slate-600">
                        {venueMap.get(record.venueId) ?? record.venueId}
                        {record.resourceId && (
                          <div className="mt-0.5 text-xs text-slate-400">Resource only</div>
                        )}
                      </div>

                      <div className="text-center">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getTypeClasses(record)}`}>
                          {getTypeLabel(record)}
                        </span>
                      </div>

                      <div className="text-center text-sm text-slate-700">
                        {formatDate(record.startDate)}
                        {new Date(record.startDate).toDateString() !== new Date(record.endDate).toDateString() && (
                          <> – {formatDate(record.endDate)}</>
                        )}
                      </div>

                      <div className="text-right text-xs font-medium text-[#1857E0]">
                        Edit →
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </PortalLayout>
  )
}
