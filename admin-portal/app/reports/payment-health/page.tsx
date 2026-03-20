import { PortalLayout } from "@/components/portal-layout"
import { ExportButton } from "@/components/reports/export-button"
import { ReportFilters } from "@/components/reports/report-filters"
import { HBarChart, DonutChart } from "@/components/reports/charts"
import { getBookings, getMemberships } from "@/lib/api"
import { resolveReportRange, inRange, formatDateRange } from "@/lib/report-utils"

function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(v)
}

function ageLabel(createdAt: string | null | undefined): string {
  if (!createdAt) return "unknown"
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000)
  if (days <= 7)  return "0–7 days"
  if (days <= 14) return "8–14 days"
  if (days <= 30) return "15–30 days"
  return "30+ days"
}

const AGE_BANDS = ["0–7 days", "8–14 days", "15–30 days", "30+ days"]

export default async function PaymentHealthReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const { from, to } = resolveReportRange(sp)
  const rangeLabel = formatDateRange(from, to)

  const [bookingsRes, membershipsRes] = await Promise.allSettled([
    getBookings(1, 1000),
    getMemberships(1, 1000),
  ])

  const bookingsData = bookingsRes.status === "fulfilled" ? bookingsRes.value : null
  const rawBookings: any[] = Array.isArray(bookingsData)
    ? bookingsData
    : (bookingsData as any)?.data ?? []

  const membershipsData = membershipsRes.status === "fulfilled" ? membershipsRes.value : null
  const rawMemberships: any[] = Array.isArray(membershipsData)
    ? membershipsData
    : (membershipsData as any)?.data ?? []

  // Filter by date range
  const allBookings    = rawBookings.filter((b: any) => inRange(b.createdAt, from, to))
  const allMemberships = rawMemberships.filter((m: any) => inRange(m.createdAt, from, to))

  // Unpaid / partially paid bookings (non-cancelled)
  const unpaidBookings = allBookings.filter(
    (b: any) => b.status !== "cancelled" && (b.paymentStatus === "unpaid" || b.paymentStatus === "partial"),
  )

  // Unpaid memberships (active/pending)
  const unpaidMemberships = allMemberships.filter(
    (m: any) => m.status !== "cancelled" && m.status !== "expired" && m.paymentStatus === "unpaid",
  )

  const bookingValueAtRisk = unpaidBookings.reduce((s, b) => s + Number(b.price ?? 0), 0)
  const membershipValueAtRisk = unpaidMemberships.reduce((s, m) => s + Number(m.price ?? 0), 0)
  const totalValueAtRisk = bookingValueAtRisk + membershipValueAtRisk

  // Age bands for unpaid bookings
  const bookingAgeBands: Record<string, number> = Object.fromEntries(AGE_BANDS.map((b) => [b, 0]))
  for (const b of unpaidBookings) {
    bookingAgeBands[ageLabel(b.createdAt)] = (bookingAgeBands[ageLabel(b.createdAt)] ?? 0) + 1
  }
  const bookingAgeBandRows = AGE_BANDS.map((label) => ({ label, value: bookingAgeBands[label] ?? 0 }))

  // Booking payment status breakdown (all non-cancelled)
  const activeBookings = allBookings.filter((b: any) => b.status !== "cancelled")
  const bookingPaymentMap: Record<string, number> = {}
  for (const b of activeBookings) {
    const ps = b.paymentStatus ?? "unknown"
    bookingPaymentMap[ps] = (bookingPaymentMap[ps] ?? 0) + 1
  }
  const bookingPaymentSlices = Object.entries(bookingPaymentMap)
    .map(([label, value]) => ({ label, value }))

  // Membership payment status breakdown (active only)
  const activeMemberships = allMemberships.filter((m: any) => m.status === "active")
  const membershipPaymentMap: Record<string, number> = {}
  for (const m of activeMemberships) {
    const ps = m.paymentStatus ?? "unknown"
    membershipPaymentMap[ps] = (membershipPaymentMap[ps] ?? 0) + 1
  }
  const membershipPaymentSlices = Object.entries(membershipPaymentMap)
    .map(([label, value]) => ({ label, value }))

  const bookingExportColumns = [
    { key: "bookingReference", header: "Reference" },
    { key: "status", header: "Status" },
    { key: "paymentStatus", header: "Payment Status" },
    { key: "price", header: "Price (£)" },
    { key: "bookingSource", header: "Source" },
    { key: "startsAt", header: "Slot Start" },
    { key: "customerFirstName", header: "First Name" },
    { key: "customerLastName", header: "Last Name" },
    { key: "customerEmail", header: "Email" },
    { key: "createdAt", header: "Created" },
  ]

  const membershipExportColumns = [
    { key: "id", header: "ID" },
    { key: "planName", header: "Plan" },
    { key: "status", header: "Status" },
    { key: "paymentStatus", header: "Payment Status" },
    { key: "startDate", header: "Start Date" },
    { key: "endDate", header: "End Date" },
    { key: "createdAt", header: "Created" },
  ]

  return (
    <PortalLayout title="Payment Health" description="Unpaid and partially paid bookings and memberships — value at risk and aged debt analysis.">
      <div className="space-y-6">

        <ReportFilters rangeLabel={rangeLabel} />

        {/* Value at risk KPIs */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-red-200 bg-red-50/50 p-5 shadow-sm">
            <div className="text-sm font-medium text-red-600">Total value at risk</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{formatCurrency(totalValueAtRisk)}</div>
            <div className="mt-1 text-xs text-slate-400">Across bookings + memberships</div>
          </div>
          <div className="rounded-2xl border border-orange-200 bg-orange-50/40 p-5 shadow-sm">
            <div className="text-sm font-medium text-orange-600">Unpaid bookings</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{unpaidBookings.length}</div>
            <div className="mt-1 text-xs text-slate-400">{formatCurrency(bookingValueAtRisk)} at risk</div>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm">
            <div className="text-sm font-medium text-amber-600">Unpaid memberships</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{unpaidMemberships.length}</div>
            <div className="mt-1 text-xs text-slate-400">{formatCurrency(membershipValueAtRisk)} at risk</div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {/* Booking payment status donut */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Booking payment status (non-cancelled)</h3>
            {bookingPaymentSlices.length > 0 ? (
              <DonutChart
                slices={bookingPaymentSlices}
                colours={["#10b981", "#f59e0b", "#ef4444", "#64748b"]}
              />
            ) : (
              <p className="text-sm text-slate-400">No booking payment data available.</p>
            )}
          </div>

          {/* Membership payment status donut */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Membership payment status (active)</h3>
            {membershipPaymentSlices.length > 0 ? (
              <DonutChart
                slices={membershipPaymentSlices}
                colours={["#10b981", "#f59e0b", "#ef4444", "#64748b"]}
              />
            ) : (
              <p className="text-sm text-slate-400">No active membership payment data.</p>
            )}
          </div>
        </div>

        {/* Unpaid bookings by age band */}
        {unpaidBookings.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Unpaid bookings by age</h3>
            <HBarChart rows={bookingAgeBandRows} colour="#ef4444" />
          </div>
        )}

        {/* Unpaid bookings table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Unpaid bookings ({unpaidBookings.length})</h3>
              <p className="mt-0.5 text-xs text-slate-500">Non-cancelled bookings with unpaid or partial payment status.</p>
            </div>
            <ExportButton
              data={unpaidBookings as unknown as Record<string, unknown>[]}
              filename="unpaid-bookings.csv"
              columns={bookingExportColumns}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  {["Reference", "Payment", "Price", "Slot", "Customer", "Age", "Source"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {unpaidBookings.map((b: any) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-mono font-semibold text-slate-800">{b.bookingReference ?? "—"}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        b.paymentStatus === "partial" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
                      }`}>{b.paymentStatus}</span>
                    </td>
                    <td className="px-4 py-2 font-semibold text-slate-800">
                      {b.price != null ? `£${Number(b.price).toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {b.startsAt
                        ? new Date(b.startsAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {b.customerFirstName || b.customerLastName
                        ? `${b.customerFirstName ?? ""} ${b.customerLastName ?? ""}`.trim()
                        : b.customerEmail ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-500">{ageLabel(b.createdAt)}</td>
                    <td className="px-4 py-2 text-slate-600">{b.bookingSource ?? "—"}</td>
                  </tr>
                ))}
                {unpaidBookings.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-400">No unpaid bookings.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Unpaid memberships table */}
        {unpaidMemberships.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Unpaid memberships ({unpaidMemberships.length})</h3>
                <p className="mt-0.5 text-xs text-slate-500">Active/pending memberships with unpaid status.</p>
              </div>
              <ExportButton
                data={unpaidMemberships as unknown as Record<string, unknown>[]}
                filename="unpaid-memberships.csv"
                columns={membershipExportColumns}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    {["Plan", "Status", "Payment", "Start", "End", "Age"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {unpaidMemberships.map((m: any) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-medium text-slate-800">{m.planName ?? "—"}</td>
                      <td className="px-4 py-2">
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">{m.status}</span>
                      </td>
                      <td className="px-4 py-2">
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">{m.paymentStatus}</span>
                      </td>
                      <td className="px-4 py-2 text-slate-600">
                        {m.startDate ? new Date(m.startDate).toLocaleDateString("en-GB") : "—"}
                      </td>
                      <td className="px-4 py-2 text-slate-600">
                        {m.endDate ? new Date(m.endDate).toLocaleDateString("en-GB") : "—"}
                      </td>
                      <td className="px-4 py-2 text-xs text-slate-500">{ageLabel(m.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  )
}
