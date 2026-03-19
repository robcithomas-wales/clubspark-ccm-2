import { PortalLayout } from "@/components/portal-layout"
import { ExportButton } from "@/components/reports/export-button"
import { DonutChart, HBarChart, VBarChart, DualVBarChart, DowHeatmap } from "@/components/reports/charts"
import {
  getBookingStats,
  getBookingStatsSummary,
  getBookingDailyStats,
  getBookingStatsByUnit,
  getBookingStatsByDow,
  getTopCustomers,
  getBookings,
  getBookableUnits,
} from "@/lib/api"

function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(v)
}

function formatHours(v: number) {
  return `${v.toFixed(1)} h`
}

export default async function BookingsReportPage() {
  const [statsRes, summaryRes, dailyRes, byUnitRes, byDowRes, topCustomersRes, allRes, unitsRes] =
    await Promise.allSettled([
      getBookingStats(),
      getBookingStatsSummary(),
      getBookingDailyStats(30),
      getBookingStatsByUnit(),
      getBookingStatsByDow(),
      getTopCustomers(10),
      getBookings(1, 1000),
      getBookableUnits(),
    ])

  const stats   = statsRes.status   === "fulfilled" ? statsRes.value   : null
  const summary = summaryRes.status === "fulfilled" ? summaryRes.value : null
  const daily   = dailyRes.status   === "fulfilled" ? dailyRes.value   : []
  const byUnit  = byUnitRes.status  === "fulfilled" ? byUnitRes.value  : []
  const byDow   = byDowRes.status   === "fulfilled" ? byDowRes.value   : []
  const topCustomers = topCustomersRes.status === "fulfilled" ? topCustomersRes.value : []
  const allBookingsData = allRes.status === "fulfilled" ? allRes.value : null
  const allBookings: any[] = Array.isArray(allBookingsData)
    ? allBookingsData
    : (allBookingsData as any)?.data ?? []
  const units: any[] = unitsRes.status === "fulfilled" ? (unitsRes.value ?? []) : []

  const unitMap = new Map(units.map((u: any) => [u.id, u]))

  const totalBookings  = summary?.byStatus.reduce((s, r) => s + r.count, 0) ?? 0
  const active         = summary?.byStatus.find((r) => r.status === "active")?.count ?? 0
  const pending        = summary?.byStatus.find((r) => r.status === "pending")?.count ?? 0
  const cancelled      = summary?.byStatus.find((r) => r.status === "cancelled")?.count ?? 0

  const exportColumns = [
    { key: "bookingReference", header: "Reference" },
    { key: "status", header: "Status" },
    { key: "paymentStatus", header: "Payment Status" },
    { key: "price", header: "Price" },
    { key: "currency", header: "Currency" },
    { key: "bookingSource", header: "Source" },
    { key: "startsAt", header: "Start" },
    { key: "endsAt", header: "End" },
    { key: "customerFirstName", header: "First Name" },
    { key: "customerLastName", header: "Last Name" },
    { key: "customerEmail", header: "Email" },
    { key: "venueId", header: "Venue ID" },
    { key: "resourceId", header: "Resource ID" },
    { key: "bookableUnitId", header: "Unit ID" },
    { key: "adminOverride", header: "Admin Override" },
    { key: "createdAt", header: "Created" },
  ]

  return (
    <PortalLayout title="Bookings Report" description="Volume, revenue, utilisation and source breakdown across all booking records.">
      <div className="space-y-6">

        {/* Primary KPI row */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total bookings", value: totalBookings, sub: "All time" },
            { label: "Active", value: active, sub: "Current active" },
            { label: "Pending approval", value: pending, sub: "Awaiting action" },
            { label: "Cancelled", value: cancelled, sub: "All time" },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-medium text-slate-500">{k.label}</div>
              <div className="mt-2 text-3xl font-bold text-slate-950">{k.value}</div>
              <div className="mt-1 text-xs text-slate-400">{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Revenue & utilisation KPI row */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm">
            <div className="text-sm font-medium text-emerald-700">Total Revenue</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">
              {formatCurrency(stats?.totalRevenue ?? 0)}
            </div>
            <div className="mt-1 text-xs text-slate-400">From paid bookings (all time)</div>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm">
            <div className="text-sm font-medium text-emerald-700">Add-on Revenue</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">
              {formatCurrency(stats?.addOnRevenue ?? 0)}
            </div>
            <div className="mt-1 text-xs text-slate-400">From active add-ons (all time)</div>
          </div>
          <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-5 shadow-sm">
            <div className="text-sm font-medium text-sky-700">Utilisation Rate (30d)</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">
              {stats?.utilisationRate30d ?? 0}%
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {(stats?.bookedHours30d ?? 0).toFixed(1)} h booked of 16 h/day per active unit
            </div>
          </div>
          <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-5 shadow-sm">
            <div className="text-sm font-medium text-violet-700">Unique Customers</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">
              {stats?.uniqueCustomers ?? 0}
            </div>
            <div className="mt-1 text-xs text-slate-400">With at least one active booking</div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {/* Status donut */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Bookings by status</h3>
            <DonutChart
              slices={(summary?.byStatus ?? []).map((r) => ({ label: r.status, value: r.count }))}
              colours={["#10b981", "#f59e0b", "#ef4444", "#64748b"]}
            />
          </div>

          {/* Source bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Bookings by source</h3>
            <HBarChart
              rows={(summary?.bySource ?? []).map((r) => ({ label: r.source, value: r.count }))}
            />
          </div>
        </div>

        {/* Daily volume + revenue dual chart */}
        {daily.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Daily bookings & revenue (30 days)</h3>
            <DualVBarChart
              rows={daily.map((d) => ({
                label: d.date.slice(5),
                primary: d.bookingCount,
                secondary: d.revenue,
              }))}
              primaryColour="#1857E0"
              secondaryColour="#10b981"
              primaryLabel="Bookings"
              secondaryLabel="Revenue (£)"
              formatPrimary={(v) => `${v} bookings`}
              formatSecondary={(v) => formatCurrency(v)}
            />
          </div>
        )}

        {/* Booked hours trend */}
        {daily.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Daily booked hours (30 days)</h3>
            <VBarChart
              rows={daily.map((d) => ({ label: d.date.slice(5), value: d.bookedHours }))}
              colour="#6366f1"
              formatValue={formatHours}
            />
          </div>
        )}

        {/* Payment status */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-slate-900">Payment status (non-cancelled)</h3>
          <HBarChart
            rows={(summary?.byPaymentStatus ?? []).map((r) => ({ label: r.paymentStatus, value: r.count }))}
            colour="#10b981"
          />
        </div>

        {/* Utilisation by unit */}
        {byUnit.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Booked hours by unit</h3>
            <HBarChart
              rows={byUnit.slice(0, 15).map((r) => ({
                label: unitMap.get(r.bookableUnitId)?.name ?? r.bookableUnitId.slice(0, 8),
                value: Math.round(r.bookedHours * 10) / 10,
              }))}
              colour="#6366f1"
            />
          </div>
        )}

        {/* Day-of-week heatmap */}
        {byDow.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Booking heatmap (day × hour)</h3>
            <DowHeatmap rows={byDow} />
          </div>
        )}

        {/* Top customers */}
        {topCustomers.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Top 10 customers by bookings</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    {["Customer", "Bookings", "Hours", "Add-on spend"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topCustomers.map((c) => (
                    <tr key={c.customerId} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-medium text-slate-800">
                        {[c.firstName, c.lastName].filter(Boolean).join(" ") || c.email || c.customerId.slice(0, 8)}
                      </td>
                      <td className="px-4 py-2 text-slate-700">{c.bookingCount}</td>
                      <td className="px-4 py-2 text-slate-700">{formatHours(c.totalHours)}</td>
                      <td className="px-4 py-2 text-slate-700">{formatCurrency(c.addOnSpend)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Full booking table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-semibold text-slate-900">All bookings ({allBookings.length})</h3>
            <ExportButton
              data={allBookings}
              filename="bookings-report.csv"
              columns={exportColumns}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  {["Reference", "Status", "Payment", "Price", "Source", "Start", "Customer", "Override"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allBookings.slice(0, 50).map((b: any) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-mono font-semibold text-slate-800">{b.bookingReference}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        b.status === "active"  ? "bg-emerald-50 text-emerald-700" :
                        b.status === "pending" ? "bg-amber-50 text-amber-700"    :
                        "bg-slate-100 text-slate-600"
                      }`}>{b.status}</span>
                    </td>
                    <td className="px-4 py-2 text-slate-600">{b.paymentStatus}</td>
                    <td className="px-4 py-2 text-slate-600">
                      {b.price != null ? formatCurrency(Number(b.price)) : "—"}
                    </td>
                    <td className="px-4 py-2 text-slate-600">{b.bookingSource ?? "—"}</td>
                    <td className="px-4 py-2 text-slate-600">
                      {b.startsAt ? new Date(b.startsAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" }) : "—"}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {b.customerFirstName || b.customerLastName
                        ? `${b.customerFirstName ?? ""} ${b.customerLastName ?? ""}`.trim()
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-slate-600">{b.adminOverride ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {allBookings.length > 50 && (
              <p className="px-4 py-3 text-xs text-slate-400">Showing first 50 of {allBookings.length}. Use Export CSV for full data.</p>
            )}
          </div>
        </div>
      </div>
    </PortalLayout>
  )
}
