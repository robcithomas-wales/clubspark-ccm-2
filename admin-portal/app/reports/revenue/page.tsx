import { PortalLayout } from "@/components/portal-layout"
import { ExportButton } from "@/components/reports/export-button"
import { ReportFilters } from "@/components/reports/report-filters"
import { DonutChart, HBarChart, VBarChart, DualVBarChart } from "@/components/reports/charts"
import {
  getBookingStats,
  getBookingDailyStats,
  getBookingStatsSummary,
  getBookings,
  getAddOnServices,
} from "@/lib/api"
import { resolveReportRange, daysBetween, inRange, formatDateRange } from "@/lib/report-utils"

function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(v)
}

export default async function RevenueReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const { from, to, fromStr, toStr } = resolveReportRange(sp)
  const days = daysBetween(from, to)
  const rangeLabel = formatDateRange(from, to)

  const [statsRes, dailyRes, summaryRes, bookingsRes, addOnsRes] = await Promise.allSettled([
    getBookingStats(),
    getBookingDailyStats(days),
    getBookingStatsSummary(),
    getBookings(1, 1000),
    getAddOnServices(),
  ])

  const stats = statsRes.status === "fulfilled" ? statsRes.value : null
  const daily = dailyRes.status === "fulfilled" ? dailyRes.value : []
  const summary = summaryRes.status === "fulfilled" ? summaryRes.value : null
  const bookingsData = bookingsRes.status === "fulfilled" ? bookingsRes.value : null
  const rawBookings: any[] = Array.isArray(bookingsData)
    ? bookingsData
    : (bookingsData as any)?.data ?? []
  const addOns: any[] = addOnsRes.status === "fulfilled"
    ? (Array.isArray(addOnsRes.value) ? addOnsRes.value : (addOnsRes.value as any)?.data ?? [])
    : []

  // Filter bookings to range
  const allBookings = rawBookings.filter((b: any) => inRange(b.startsAt ?? b.createdAt, from, to))

  const paidBookings = allBookings.filter((b: any) => b.paymentStatus === "paid")
  const totalBookingRevenue = paidBookings.reduce((s, b: any) => s + Number(b.price ?? 0), 0)
  const addOnRevenue = stats?.addOnRevenue ?? 0
  const totalBookedHours = allBookings.reduce((s, b: any) => {
    if (b.startsAt && b.endsAt) {
      return s + (new Date(b.endsAt).getTime() - new Date(b.startsAt).getTime()) / 3_600_000
    }
    return s
  }, 0)
  const revPBH = totalBookedHours > 0 ? totalBookingRevenue / totalBookedHours : 0
  const avgBookingValue = paidBookings.length > 0 ? totalBookingRevenue / paidBookings.length : 0

  // Revenue by source
  const revenueBySource: Record<string, number> = {}
  for (const b of allBookings) {
    if (b.price != null) {
      const src = b.bookingSource ?? "unknown"
      revenueBySource[src] = (revenueBySource[src] ?? 0) + Number(b.price)
    }
  }
  const revenueBySourceRows = Object.entries(revenueBySource)
    .map(([label, value]) => ({ label, value: Math.round(value), valueFormatted: `£${Math.round(value).toLocaleString()}` }))
    .sort((a, b) => b.value - a.value)

  // Add-on category catalogue pricing (not date-filtered — catalogue is static)
  const addOnByCategory = addOns.reduce((map: Record<string, number>, a: any) => {
    const cat = a.category ?? "uncategorised"
    map[cat] = (map[cat] ?? 0) + (a.price ?? 0)
    return map
  }, {})
  const categoryRows = Object.entries(addOnByCategory)
    .map(([label, value]) => ({ label, value: Math.round(value as number), valueFormatted: `£${Math.round(value as number).toLocaleString()}` }))
    .sort((a, b) => b.value - a.value)

  // Payment status from filtered bookings
  const paymentStatusMap: Record<string, number> = {}
  for (const b of allBookings) {
    const ps = b.paymentStatus ?? "unknown"
    paymentStatusMap[ps] = (paymentStatusMap[ps] ?? 0) + 1
  }
  const paymentStatusSlices = Object.entries(paymentStatusMap).map(([label, value]) => ({ label, value }))

  const exportColumns = [
    { key: "date", header: "Date" },
    { key: "bookingCount", header: "Bookings" },
    { key: "bookedHours", header: "Booked Hours" },
    { key: "revenue", header: "Booking Revenue (£)" },
    { key: "addOnRevenue", header: "Add-on Revenue (£)" },
  ]

  return (
    <PortalLayout title="Revenue Report" description="Total revenue, per-hour rate, source breakdown and daily trend analysis.">
      <div className="space-y-6">

        <ReportFilters rangeLabel={rangeLabel} />

        {/* Primary KPI row */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm">
            <div className="text-sm font-medium text-emerald-700">Booking revenue (filtered)</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{formatCurrency(totalBookingRevenue)}</div>
            <div className="mt-1 text-xs text-slate-400">{rangeLabel}</div>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm">
            <div className="text-sm font-medium text-emerald-700">Add-on revenue</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{formatCurrency(addOnRevenue)}</div>
            <div className="mt-1 text-xs text-slate-400">All time (from active add-ons)</div>
          </div>
          <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-5 shadow-sm">
            <div className="text-sm font-medium text-sky-700">Revenue per booked hour</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{formatCurrency(revPBH)}</div>
            <div className="mt-1 text-xs text-slate-400">{totalBookedHours.toFixed(0)}h booked in range</div>
          </div>
          <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-5 shadow-sm">
            <div className="text-sm font-medium text-violet-700">Avg booking value</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{formatCurrency(avgBookingValue)}</div>
            <div className="mt-1 text-xs text-slate-400">{paidBookings.length} paid in range</div>
          </div>
        </div>

        {/* Daily revenue dual chart */}
        {daily.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Daily revenue: booking vs add-on ({days} days)</h3>
            <DualVBarChart
              rows={daily.map((d) => ({
                label: d.date.slice(5),
                primary: parseFloat((d.revenue ?? 0).toFixed(2)),
                secondary: parseFloat(d.addOnRevenue.toFixed(2)),
                primaryFormatted: `£${(d.revenue ?? 0).toFixed(2)}`,
                secondaryFormatted: `£${d.addOnRevenue.toFixed(2)}`,
              }))}
              primaryColour="#10b981"
              secondaryColour="#8b5cf6"
              primaryLabel="Booking revenue"
              secondaryLabel="Add-on revenue"
            />
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-2">
          {/* Revenue by source */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Revenue by booking source</h3>
            {revenueBySourceRows.length > 0 ? (
              <HBarChart rows={revenueBySourceRows} colour="#1857E0" />
            ) : (
              <p className="text-sm text-slate-400">No source data in selected range.</p>
            )}
          </div>

          {/* Payment status donut */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Payment status (filtered)</h3>
            {paymentStatusSlices.length > 0 ? (
              <DonutChart slices={paymentStatusSlices} colours={["#10b981", "#f59e0b", "#ef4444", "#64748b"]} />
            ) : (
              <DonutChart
                slices={(summary?.byPaymentStatus ?? []).map((r) => ({ label: r.paymentStatus, value: r.count }))}
                colours={["#10b981", "#f59e0b", "#ef4444", "#64748b"]}
              />
            )}
          </div>
        </div>

        {/* Add-on category bar */}
        {categoryRows.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-1 text-base font-semibold text-slate-900">Add-on catalogue price by category</h3>
            <p className="mb-4 text-xs text-slate-400">Catalogue pricing — not date filtered</p>
            <HBarChart rows={categoryRows} colour="#8b5cf6" />
          </div>
        )}

        {/* Daily revenue table + export */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-semibold text-slate-900">Daily revenue breakdown ({daily.length} days)</h3>
            <ExportButton
              data={daily as unknown as Record<string, unknown>[]}
              filename="revenue-report.csv"
              columns={exportColumns}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  {["Date", "Bookings", "Booked hours", "Booking revenue", "Add-on revenue"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {daily.map((d) => (
                  <tr key={d.date} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium text-slate-800">{d.date}</td>
                    <td className="px-4 py-2 text-slate-600">{d.bookingCount}</td>
                    <td className="px-4 py-2 text-slate-600">{d.bookedHours.toFixed(1)}h</td>
                    <td className="px-4 py-2 font-semibold text-emerald-700">{formatCurrency(d.revenue ?? 0)}</td>
                    <td className="px-4 py-2 text-slate-600">{formatCurrency(d.addOnRevenue ?? 0)}</td>
                  </tr>
                ))}
                {daily.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-400">No revenue data for the selected range.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PortalLayout>
  )
}
