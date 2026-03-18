import { PortalLayout } from "@/components/portal-layout"
import { ExportButton } from "@/components/reports/export-button"
import { DowHeatmap, HBarChart, VBarChart } from "@/components/reports/charts"
import {
  getBookingStats,
  getBookingDailyStats,
  getBookingStatsByUnit,
  getBookingStatsByDow,
  getBookableUnits,
} from "@/lib/api"

export default async function UtilisationReportPage() {
  const [statsRes, dailyRes, byUnitRes, byDowRes, unitsRes] = await Promise.allSettled([
    getBookingStats(),
    getBookingDailyStats(30),
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

  // Build unit name map
  const unitNameMap = new Map<string, string>(
    units.map((u: any) => [u.id, u.name]),
  )

  const activeUnitCount = units.filter((u: any) => u.isActive !== false).length
  const availableHours = activeUnitCount * 12 * 30
  const totalBookedHours = stats?.totalBookedHours ?? 0
  const utilisationPct = availableHours > 0
    ? Math.min(100, Math.round((totalBookedHours / availableHours) * 100))
    : 0

  // Per-unit utilisation: 12 hours/day × 30 days
  const perUnitAvailableHours = 12 * 30
  const unitRows = byUnit.map((u) => ({
    unitId: u.bookableUnitId,
    unitName: unitNameMap.get(u.bookableUnitId) ?? u.bookableUnitId.slice(0, 8),
    bookingCount: u.bookingCount,
    bookedHours: u.bookedHours,
    utilisationPct: Math.min(100, Math.round((u.bookedHours / perUnitAvailableHours) * 100)),
  }))

  const exportColumns = [
    { key: "unitName", header: "Unit" },
    { key: "bookingCount", header: "Booking Count" },
    { key: "bookedHours", header: "Booked Hours" },
    { key: "utilisationPct", header: "Utilisation %" },
  ]

  return (
    <PortalLayout title="Utilisation Report" description="Facility utilisation by unit, time of day and trend over 30 days.">
      <div className="space-y-6">

        {/* KPI row */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Overall utilisation (30 days)", value: `${utilisationPct}%` },
            { label: "Total booked hours", value: `${Math.round(totalBookedHours)}h` },
            { label: "Active bookable units", value: activeUnitCount },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-medium text-slate-500">{k.label}</div>
              <div className="mt-2 text-3xl font-bold text-slate-950">{k.value}</div>
            </div>
          ))}
        </div>

        {/* Booked hours trend */}
        {daily.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Daily booked hours (30 days)</h3>
            <VBarChart
              rows={daily.map((d) => ({ label: d.date.slice(5), value: parseFloat(d.bookedHours.toFixed(1)) }))}
              colour="#1857E0"
              formatValue={(v) => `${v}h`}
            />
          </div>
        )}

        {/* DOW/hour heatmap */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-1 text-base font-semibold text-slate-900">Booking density by day & hour</h3>
          <p className="mb-4 text-sm text-slate-500">Darker cells = more bookings. Hours shown 06:00–21:00.</p>
          <DowHeatmap rows={byDow} />
        </div>

        {/* Per-unit utilisation bar */}
        {unitRows.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Booked hours by unit</h3>
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
                          <div
                            className="h-2 rounded-full bg-[#1857E0]"
                            style={{ width: `${u.utilisationPct}%` }}
                          />
                        </div>
                        <span className="text-slate-700 font-medium">{u.utilisationPct}%</span>
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
