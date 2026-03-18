import { PortalLayout } from "@/components/portal-layout"
import { ExportButton } from "@/components/reports/export-button"
import { HBarChart } from "@/components/reports/charts"
import {
  getBookingStats,
  getTopCustomers,
  getCustomers,
} from "@/lib/api"

export default async function CustomersReportPage() {
  const [statsRes, topRes, customersRes] = await Promise.allSettled([
    getBookingStats(),
    getTopCustomers(50),
    getCustomers(),
  ])

  const stats = statsRes.status === "fulfilled" ? statsRes.value : null
  const topCustomers = topRes.status === "fulfilled" ? topRes.value : []
  const customersData = customersRes.status === "fulfilled" ? customersRes.value : null
  const allCustomers: any[] = Array.isArray(customersData)
    ? customersData
    : (customersData as any)?.data ?? []

  const uniqueWithBookings = stats?.uniqueCustomers ?? 0
  const noBooking = allCustomers.length - uniqueWithBookings

  const exportColumns = [
    { key: "firstName", header: "First Name" },
    { key: "lastName", header: "Last Name" },
    { key: "email", header: "Email" },
    { key: "bookingCount", header: "Booking Count" },
    { key: "totalHours", header: "Total Hours" },
    { key: "addOnSpend", header: "Add-on Spend (£)" },
  ]

  const allCustomersExportColumns = [
    { key: "firstName", header: "First Name" },
    { key: "lastName", header: "Last Name" },
    { key: "email", header: "Email" },
    { key: "phone", header: "Phone" },
    { key: "createdAt", header: "Registered" },
  ]

  return (
    <PortalLayout title="Customer Report" description="Customer activity, top bookers and engagement overview.">
      <div className="space-y-6">

        {/* KPI row */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Total customers", value: allCustomers.length },
            { label: "Customers with active bookings", value: uniqueWithBookings },
            { label: "Registered, never booked", value: Math.max(0, noBooking) },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-medium text-slate-500">{k.label}</div>
              <div className="mt-2 text-3xl font-bold text-slate-950">{k.value}</div>
            </div>
          ))}
        </div>

        {/* Top customers by bookings bar */}
        {topCustomers.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Top customers by booking count</h3>
            <HBarChart
              rows={topCustomers.slice(0, 15).map((c) => ({
                label: `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || c.email || c.customerId.slice(0, 8),
                value: c.bookingCount,
              }))}
              colour="#1857E0"
            />
          </div>
        )}

        {/* Top customers by add-on spend */}
        {topCustomers.some((c) => c.addOnSpend > 0) && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Top customers by add-on spend</h3>
            <HBarChart
              rows={[...topCustomers]
                .sort((a, b) => b.addOnSpend - a.addOnSpend)
                .slice(0, 15)
                .filter((c) => c.addOnSpend > 0)
                .map((c) => ({
                  label: `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || c.email || c.customerId.slice(0, 8),
                  value: parseFloat(c.addOnSpend.toFixed(2)),
                }))}
              colour="#10b981"
            />
          </div>
        )}

        {/* Top customers table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-semibold text-slate-900">Top customers by activity</h3>
            <ExportButton
              data={topCustomers as unknown as Record<string, unknown>[]}
              filename="top-customers-report.csv"
              columns={exportColumns}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  {["Customer", "Email", "Bookings", "Hours", "Add-on spend"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topCustomers.map((c, i) => (
                  <tr key={c.customerId} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium text-slate-800">
                      <span className="mr-2 text-slate-400">#{i + 1}</span>
                      {`${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "—"}
                    </td>
                    <td className="px-4 py-2 text-slate-600">{c.email ?? "—"}</td>
                    <td className="px-4 py-2 text-slate-600">{c.bookingCount}</td>
                    <td className="px-4 py-2 text-slate-600">{c.totalHours.toFixed(1)}h</td>
                    <td className="px-4 py-2 font-medium text-emerald-700">£{c.addOnSpend.toFixed(2)}</td>
                  </tr>
                ))}
                {topCustomers.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-400">No customer booking data found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* All customers table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-semibold text-slate-900">All customers ({allCustomers.length})</h3>
            <ExportButton
              data={allCustomers}
              filename="all-customers.csv"
              columns={allCustomersExportColumns}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  {["Name", "Email", "Phone", "Registered"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allCustomers.slice(0, 50).map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium text-slate-800">
                      {`${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "—"}
                    </td>
                    <td className="px-4 py-2 text-slate-600">{c.email ?? "—"}</td>
                    <td className="px-4 py-2 text-slate-600">{c.phone ?? "—"}</td>
                    <td className="px-4 py-2 text-slate-600">
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-GB") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {allCustomers.length > 50 && (
              <p className="px-4 py-3 text-xs text-slate-400">Showing first 50 of {allCustomers.length}. Use Export CSV for full data.</p>
            )}
          </div>
        </div>
      </div>
    </PortalLayout>
  )
}
