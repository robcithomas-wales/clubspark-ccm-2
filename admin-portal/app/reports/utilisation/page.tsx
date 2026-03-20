import { PortalLayout } from "@/components/portal-layout"
import { ExportButton } from "@/components/reports/export-button"
import { ReportFilters } from "@/components/reports/report-filters"
import { DowHeatmap, HBarChart, VBarChart } from "@/components/reports/charts"
import {
  getBookingStats,
  getBookingDailyStats,
  getBookingStatsByUnit,
  getBookingStatsByDow,
  getBookableUnits,
} from "@/lib/api"
import { resolveReportRange, daysBetween, formatDateRange } from "@/lib/report-utils"

export default async function UtilisationReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const { from, to } = resolveReportRange(sp)
  const days = daysBetween(from, to)
  const rangeLabel = formatDateRange(from, to)

  const [statsRes, dailyRes, byUnitRes, byDowRes, unitsRes] = await Promise.allSettled([
    getBookingStats(),
    getBookingDailyStats(days),
    getBookingStatsByUnit(),
    getBookingStatsByDow(),
    getBookableUnits(),
  ])

  const stats = statsRes.status === "fulfilled" ? statsRes.value : null
  const daily = dailyRes.status === "fulfilled" ? dailyRes.value : []
  const byUnit = byUnitRes.status === "fulfilled" ? byUnitRes.value : []
  const byDow = byDowRes.status === "fulfilled" ? byDowRes.value : []
  const units: any[] = unitsRes.status === "fulfilled"
    ? (Array.isArray(unitsRes.value) ? unitsRes.value : (unitsRes.value as any)?.data ?? [])
    : []

  const unitNameMap = new Map<string, string>(units.map((u: any) => [u.id, u.name]))

  const activeUnitCount = units.filter((u: any) => u.isActive !== false).length
  const availableHours = activeUnitCount * 12 * days
  const totalBookedHours = daily.reduce((s, d) => s + d.bookedHours, 0)
  const utilisationPct = availableHours > 0
    ? Math.min(100, Math.round((totalBookedHours / availableHours) * 100))
    : 0

  const perUnitAvailableHours = 12 * days
  const unitRows = byUnit.map((u) => ({
    unitId: u.bookableUnitId,
    unitName: unitNameMap.get(u.bookableUnitId) ?? u.bookableUnitId.slice(0, 8),
    bookingCount: u.bookingCount,
    bookedHours: u.bookedHours,
    utilisationPct: Math.min(100, Math.round((u.bookedHours / perUnitAvailableHours) * 100)),
  }))

  const sortedByUtil = [...unitRows].sort((a, b) => b.utilisationPct - a.utilisationPct)
  const bestUnit  = sortedByUtil[0] ?? null
  const worstUnit = sortedByUtil[sortedByUtil.length - 1] ?? null

  const DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  const dowSummary: number[] = [0, 0, 0, 0, 0, 0, 0]
  for (const row of byDow) {
    dowSummary[row.dow % 7] = (dowSummary[row.dow % 7] ?? 0) + row.bookingCount
  }
  const dowRows = DOW_LABELS.map((label, i) => ({ label, value: dowSummary[i] ?? 0 }))

  const exportColumns = [
    { key: "unitName", header: "Unit" },
    { key: "bookingCount", header: "Booking Count" },
    { key: "bookedHours", header: "Booked Hours" },
    { key: "utilisationPct", header: "Utilisation %" },
  ]

  return (
    <PortalLayout title="Utilisation Report" description="Facility utilisation by unit, time of day and trend over the selected period.">
      <div className="space-y-6">

        <ReportFilters rangeLabel={rangeLabel} />

        {/* KPI row */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: `Overall utilisation (${days} days)`, value: `${utilisationPct}%` },
            { label: "Total booked hours", value: `${Math.round(totalBookedHours)}h` },
            { label: "Active bookable units", value: activeUnitCount },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-medium text-slate-500">{k.label}</div>
              <div className="mt-2 text-3xl font-bold text-slate-950">{k.value}</div>
            </div>
          ))}
        </div>

        {/* Best / worst units */}
        {unitRows.length >= 2 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Best performing unit</div>
              <div className="mt-2 text-xl font-bold text-slate-900">{bestUnit?.unitName}</div>
              <div className="mt-1 text-sm text-slate-600">
                {bestUnit?.utilisationPct}% utilised · {bestUnit?.bookedHours.toFixed(1)}h booked · {bestUnit?.bookingCount} bookings
              </div>
            </div>
            <div className="rounded-2xl border border-red-200 bg-red-50/50 p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-red-500">Lowest utilisation unit</div>
              <div className="mt-2 text-xl font-bold text-slate-900">{worstUnit?.unitName}</div>
              <div className="mt-1 text-sm text-slate-600">
                {worstUnit?.utilisationPct}% utilised · {worstUnit?.bookedHours.toFixed(1)}h booked · {worstUnit?.bookingCount} bookings
              </div>
            </div>
          </div>
        )}

        {/* Booked hours trend */}
        {daily.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Daily booked hours ({days} days)</h3>
            <VBarChart
              rows={daily.map((d) => ({ label: d.date.slice(5), value: parseFloat(d.bookedHours.toFixed(1)) }))}
              colour="#1857E0"
              formatValue={(v) => `${v}h`}
            />
          </div>
        )}

        {/* DOW summary bar */}
        {dowRows.some((r) => r.value > 0) && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-1 text-base font-semibold text-slate-900">Bookings by day of week</h3>
            <p className="mb-4 text-xs text-slate-400">All-time aggregated data</p>
            <HBarChart rows={dowRows} colour="#6366f1" />
          </div>
        )}

        {/* DOW/hour heatmap */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-1 text-base font-semibold text-slate-900">Booking density by day & hour</h3>
          <p className="mb-4 text-sm text-slate-500">Darker cells = more bookings. All-time aggregated · Hours shown 06:00–21:00.</p>
          <DowHeatmap rows={byDow} />
        </div>

        {/* Per-unit utilisation bar */}
        {unitRows.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-1 text-base font-semibold text-slate-900">Booked hours by unit</h3>
            <p className="mb-4 text-xs text-slate-400">All-time aggregated — utilisation % calculated against {days}-day window</p>
            <HBarChart
              rows={unitRows.map((u) => ({ label: u.unitName, value: parseFloat(u.bookedHours.toFixed(1)) }))}
              colour="#1857E0"
            />
          </div>
        )}

        {/* Per-unit table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-semibold text-slate-900">Unit utilisation breakdown</h3>
            <ExportButton
              data={unitRows as unknown as Record<string, unknown>[]}
              filename="utilisation-report.csv"
              columns={exportColumns}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  {["Unit", "Bookings", "Booked hours", "Utilisation %"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {unitRows.map((u) => (
                  <tr key={u.unitId} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium text-slate-800">{u.unitName}</td>
                    <td className="px-4 py-2 text-slate-600">{u.bookingCount}</td>
                    <td className="px-4 py-2 text-slate-600">{u.bookedHours.toFixed(1)}h</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-2 rounded-full bg-[#1857E0]" style={{ width: `${u.utilisationPct}%` }} />
                        </div>
                        <span className="font-medium text-slate-700">{u.utilisationPct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {unitRows.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-400">No active booking data found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PortalLayout>
  )
}
