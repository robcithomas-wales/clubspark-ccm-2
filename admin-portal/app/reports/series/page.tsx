import { PortalLayout } from "@/components/portal-layout"
import { ExportButton } from "@/components/reports/export-button"
import { ReportFilters } from "@/components/reports/report-filters"
import { HBarChart, DonutChart } from "@/components/reports/charts"
import { getBookingSeries, getBookableUnits, getResources } from "@/lib/api"
import { resolveReportRange, inRange, formatDateRange } from "@/lib/report-utils"

export default async function SeriesReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const { from, to } = resolveReportRange(sp)
  const rangeLabel = formatDateRange(from, to)
  const statusFilter = typeof sp.status === "string" ? sp.status : "all"

  const [seriesRes, unitsRes, resourcesRes] = await Promise.allSettled([
    getBookingSeries(),
    getBookableUnits(),
    getResources(),
  ])

  const seriesData = seriesRes.status === "fulfilled" ? seriesRes.value : null
  const rawSeries: any[] = Array.isArray(seriesData)
    ? seriesData
    : (seriesData as any)?.data ?? []

  // Filter by created date and status
  const allSeries = rawSeries.filter((s: any) => {
    if (!inRange(s.createdAt, from, to)) return false
    if (statusFilter !== "all" && s.status !== statusFilter) return false
    return true
  })

  const units: any[] = unitsRes.status === "fulfilled"
    ? (Array.isArray(unitsRes.value) ? unitsRes.value : (unitsRes.value as any)?.data ?? [])
    : []

  const resources: any[] = resourcesRes.status === "fulfilled"
    ? (Array.isArray(resourcesRes.value) ? resourcesRes.value : (resourcesRes.value as any)?.data ?? [])
    : []

  const unitNameMap = new Map<string, string>(units.map((u) => [u.id, u.name]))
  const resourceNameMap = new Map<string, string>(resources.map((r) => [r.id, r.name]))

  const activeSeries = allSeries.filter((s) => s.status !== "cancelled")
  const cancelledSeries = allSeries.filter((s) => s.status === "cancelled")
  const cancellationRate = allSeries.length > 0
    ? Math.round((cancelledSeries.length / allSeries.length) * 100)
    : 0

  // Avg min/max sessions from active series that have them defined
  const withSessions = activeSeries.filter((s) => s.minSessions != null || s.maxSessions != null)
  const avgMinSessions = withSessions.length > 0
    ? withSessions.reduce((s, r) => s + (r.minSessions ?? 0), 0) / withSessions.length
    : null
  const avgMaxSessions = withSessions.length > 0
    ? withSessions.reduce((s, r) => s + (r.maxSessions ?? 0), 0) / withSessions.length
    : null

  // Payment status breakdown
  const paymentStatusMap: Record<string, number> = {}
  for (const s of allSeries) {
    const ps = s.paymentStatus ?? "unknown"
    paymentStatusMap[ps] = (paymentStatusMap[ps] ?? 0) + 1
  }
  const paymentStatusSlices = Object.entries(paymentStatusMap).map(([label, value]) => ({ label, value }))

  // Series by resource
  const byResource: Record<string, number> = {}
  for (const s of activeSeries) {
    const name = resourceNameMap.get(s.resourceId) ?? s.resourceId.slice(0, 8)
    byResource[name] = (byResource[name] ?? 0) + 1
  }
  const byResourceRows = Object.entries(byResource)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)

  // Series by unit
  const byUnit: Record<string, number> = {}
  for (const s of activeSeries) {
    const name = unitNameMap.get(s.bookableUnitId) ?? s.bookableUnitId.slice(0, 8)
    byUnit[name] = (byUnit[name] ?? 0) + 1
  }
  const byUnitRows = Object.entries(byUnit)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)

  const exportColumns = [
    { key: "id", header: "ID" },
    { key: "status", header: "Status" },
    { key: "rrule", header: "RRule" },
    { key: "slotStartsAt", header: "Slot Start" },
    { key: "slotEndsAt", header: "Slot End" },
    { key: "paymentStatus", header: "Payment Status" },
    { key: "minSessions", header: "Min Sessions" },
    { key: "maxSessions", header: "Max Sessions" },
    { key: "bookingSource", header: "Source" },
    { key: "createdAt", header: "Created" },
  ]

  const enriched = allSeries.map((s) => ({
    ...s,
    unitName: unitNameMap.get(s.bookableUnitId) ?? "—",
    resourceName: resourceNameMap.get(s.resourceId) ?? "—",
  }))

  const statusColour: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700",
    cancelled: "bg-red-50 text-red-700",
    pending: "bg-amber-50 text-amber-700",
  }

  return (
    <PortalLayout title="Series Report" description="Recurring booking programmes — volume, resource breakdown and session targets.">
      <div className="space-y-6">

        <ReportFilters
          rangeLabel={rangeLabel}
          extraFilters={[
            {
              key: "status",
              label: "Status",
              options: ["active", "pending", "cancelled"].map((s) => ({
                value: s,
                label: s.charAt(0).toUpperCase() + s.slice(1),
              })),
            },
          ]}
        />

        {/* KPI row */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">Series in range</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{allSeries.length}</div>
            <div className="mt-1 text-xs text-slate-400">{rangeLabel}</div>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm">
            <div className="text-sm font-medium text-emerald-700">Active series</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{activeSeries.length}</div>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50/50 p-5 shadow-sm">
            <div className="text-sm font-medium text-red-600">Cancellation rate</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{cancellationRate}%</div>
            <div className="mt-1 text-xs text-slate-400">{cancelledSeries.length} cancelled</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">Avg sessions (min / max)</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">
              {avgMinSessions != null ? avgMinSessions.toFixed(1) : "—"} / {avgMaxSessions != null ? avgMaxSessions.toFixed(1) : "—"}
            </div>
            <div className="mt-1 text-xs text-slate-400">{withSessions.length} series with session targets</div>
          </div>
        </div>

        {/* Payment status donut */}
        {paymentStatusSlices.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Series by payment status</h3>
            <DonutChart
              slices={paymentStatusSlices}
              colours={["#10b981", "#f59e0b", "#ef4444", "#64748b"]}
            />
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-2">
          {/* By resource */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Active series by resource</h3>
            {byResourceRows.length > 0 ? (
              <HBarChart rows={byResourceRows} colour="#1857E0" />
            ) : (
              <p className="text-sm text-slate-400">No data available.</p>
            )}
          </div>

          {/* By unit */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Active series by bookable unit</h3>
            {byUnitRows.length > 0 ? (
              <HBarChart rows={byUnitRows} colour="#8b5cf6" />
            ) : (
              <p className="text-sm text-slate-400">No data available.</p>
            )}
          </div>
        </div>

        {/* Series table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-semibold text-slate-900">Filtered series ({allSeries.length})</h3>
            <ExportButton
              data={enriched as unknown as Record<string, unknown>[]}
              filename="series-report.csv"
              columns={exportColumns}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  {["Resource", "Unit", "Slot", "Status", "RRule", "Min / Max sessions", "Source"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {enriched.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium text-slate-800">{s.resourceName}</td>
                    <td className="px-4 py-2 text-slate-600">{s.unitName}</td>
                    <td className="px-4 py-2 text-slate-600 font-mono text-xs">
                      {s.slotStartsAt} – {s.slotEndsAt}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColour[s.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-500 font-mono text-xs max-w-[180px] truncate">{s.rrule}</td>
                    <td className="px-4 py-2 text-slate-600">
                      {s.minSessions != null || s.maxSessions != null
                        ? `${s.minSessions ?? "—"} / ${s.maxSessions ?? "—"}`
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-slate-600">{s.bookingSource ?? "—"}</td>
                  </tr>
                ))}
                {allSeries.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-400">No series records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PortalLayout>
  )
}
