import { PortalLayout } from "@/components/portal-layout"
import { ExportButton } from "@/components/reports/export-button"
import { DonutChart, HBarChart, VBarChart } from "@/components/reports/charts"
import {
  getBookingStats,
  getBookingDailyStats,
  getBookingStatsSummary,
  getBookings,
  getAddOnServices,
} from "@/lib/api"

export default async function RevenueReportPage() {
  const [statsRes, dailyRes, summaryRes, bookingsRes, addOnsRes] = await Promise.allSettled([
    getBookingStats(),
    getBookingDailyStats(30),
    getBookingStatsSummary(),
    getBookings(1, 1000),
    getAddOnServices(),
  ])

  const stats = statsRes.status === "fulfilled" ? statsRes.value : null
  const daily = dailyRes.status === "fulfilled" ? dailyRes.value : []
  const summary = summaryRes.status === "fulfilled" ? summaryRes.value : null
  const bookingsData = bookingsRes.status === "fulfilled" ? bookingsRes.value : null
  const allBookings: any[] = Array.isArray(bookingsData)
    ? bookingsData
    : (bookingsData as any)?.data ?? []
  const addOns: any[] = addOnsRes.status === "fulfilled"
    ? (Array.isArray(addOnsRes.value) ? addOnsRes.value : (addOnsRes.value as any)?.data ?? [])
    : []

  const totalRevenue = stats?.addOnRevenue ?? 0
  const activeBookings = allBookings.filter((b: any) => b.status === "active")
  const avgRevenuePerBooking = activeBookings.length > 0
    ? totalRevenue / activeBookings.length
    : 0

  // Revenue by add-on category — join add-on services by category
  const addOnByCategory = addOns.reduce((map: Record<string, number>, a: any) => {
    const cat = a.category ?? "uncategorised"
    map[cat] = (map[cat] ?? 0) + (a.price ?? 0)
    return map
  }, {})
  const categoryRows = Object.entries(addOnByCategory)
    .map(([label, value]) => ({ label, value: Math.round(value as number) }))
    .sort((a, b) => b.value - a.value)

  const exportColumns = [
    { key: "date", header: "Date" },
    { key: "bookingCount", header: "Bookings" },
    { key: "bookedHours", header: "Booked Hours" },
    { key: "addOnRevenue", header: "Add-on Revenue (£)" },
  ]

  return (
    <PortalLayout title="Revenue Report" description="Add-on revenue trends, payment status and per-booking analysis.">
      <div className="space-y-6">

        {/* KPI row */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Total add-on revenue", value: `£${totalRevenue.toFixed(2)}` },
            { label: "Active bookings", value: activeBookings.length },
            { label: "Avg add-on revenue / booking", value: `£${avgRevenuePerBooking.toFixed(2)}` },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-medium text-slate-500">{k.label}</div>
              <div className="mt-2 text-3xl font-bold text-slate-950">{k.value}</div>
            </div>
          ))}
        </div>

        {/* Daily revenue chart */}
        {daily.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Daily add-on revenue (30 days)</h3>
            <VBarChart
              rows={daily.map((d) => ({ label: d.date.slice(5), value: parseFloat(d.addOnRevenue.toFixed(2)) }))}
              colour="#10b981"
              formatValue={(v) => `£${v.toFixed(2)}`}
            />
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-2">
          {/* Payment status donut */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Payment status breakdown</h3>
            <DonutChart
              slices={(summary?.byPaymentStatus ?? []).map((r) => ({ label: r.paymentStatus, value: r.count }))}
              colours={["#10b981", "#f59e0b", "#ef4444", "#64748b"]}
            />
          </div>

          {/* Add-on category bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Add-on catalogue price by category</h3>
            {categoryRows.length > 0 ? (
              <HBarChart rows={categoryRows} colour="#8b5cf6" />
            ) : (
              <p className="text-sm text-slate-400">No add-on category data available.</p>
            )}
          </div>
        </div>

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
                  {["Date", "Bookings", "Booked hours", "Add-on revenue"].map((h) => (
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
                    <td className="px-4 py-2 font-semibold text-emerald-700">£{d.addOnRevenue.toFixed(2)}</td>
                  </tr>
                ))}
                {daily.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-400">No revenue data for the last 30 days.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PortalLayout>
  )
}
