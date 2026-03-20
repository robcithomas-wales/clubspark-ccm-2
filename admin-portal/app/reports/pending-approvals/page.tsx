import { PortalLayout } from "@/components/portal-layout"
import { ExportButton } from "@/components/reports/export-button"
import { ReportFilters } from "@/components/reports/report-filters"
import { getBookings, getBookableUnits } from "@/lib/api"
import { resolveReportRange, inRange, formatDateRange } from "@/lib/report-utils"

export default async function PendingApprovalsReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const { from, to } = resolveReportRange(sp)
  const rangeLabel = formatDateRange(from, to)

  const [bookingsRes, unitsRes] = await Promise.allSettled([
    getBookings(1, 1000),
    getBookableUnits(),
  ])

  const bookingsData = bookingsRes.status === "fulfilled" ? bookingsRes.value : null
  const rawBookings: any[] = Array.isArray(bookingsData)
    ? bookingsData
    : (bookingsData as any)?.data ?? []

  // Filter by created date range (pending status filter applied below)
  const allBookings = rawBookings.filter((b: any) => inRange(b.createdAt, from, to))

  const units: any[] = unitsRes.status === "fulfilled"
    ? (Array.isArray(unitsRes.value) ? unitsRes.value : (unitsRes.value as any)?.data ?? [])
    : []
  const unitNameMap = new Map<string, string>(units.map((u) => [u.id, u.name]))

  const now = new Date()

  // Filter pending bookings and compute age
  const pendingBookings = allBookings
    .filter((b: any) => b.status === "pending")
    .map((b: any) => {
      const created = b.createdAt ? new Date(b.createdAt) : null
      const ageHours = created ? Math.round((now.getTime() - created.getTime()) / 3_600_000) : null
      const ageDays = ageHours != null ? Math.floor(ageHours / 24) : null
      return { ...b, ageHours, ageDays }
    })
    .sort((a, b) => (a.ageHours ?? 0) - (b.ageHours ?? 0)) // oldest first (highest age = most urgent)

  // Flip so oldest (most urgent) is at the top
  pendingBookings.reverse()

  const over24h  = pendingBookings.filter((b) => (b.ageHours ?? 0) >= 24)
  const over48h  = pendingBookings.filter((b) => (b.ageHours ?? 0) >= 48)
  const over7d   = pendingBookings.filter((b) => (b.ageDays ?? 0) >= 7)

  const exportColumns = [
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
    { key: "ageDays", header: "Age (days)" },
  ]

  function ageTag(ageHours: number | null) {
    if (ageHours == null) return <span className="text-slate-400">—</span>
    const d = Math.floor(ageHours / 24)
    const h = ageHours % 24
    const label = d > 0 ? `${d}d ${h}h` : `${ageHours}h`
    if (ageHours >= 48) return <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">{label}</span>
    if (ageHours >= 24) return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">{label}</span>
    return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{label}</span>
  }

  return (
    <PortalLayout title="Pending Approvals" description="Bookings awaiting staff action — sorted oldest first for prioritisation.">
      <div className="space-y-6">

        <ReportFilters rangeLabel={rangeLabel} />

        {/* KPI row */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm">
            <div className="text-sm font-medium text-amber-700">Total pending</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{pendingBookings.length}</div>
            <div className="mt-1 text-xs text-slate-400">Awaiting approval</div>
          </div>
          <div className="rounded-2xl border border-orange-200 bg-orange-50/40 p-5 shadow-sm">
            <div className="text-sm font-medium text-orange-600">Over 24 hours</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{over24h.length}</div>
            <div className="mt-1 text-xs text-slate-400">Need attention</div>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50/50 p-5 shadow-sm">
            <div className="text-sm font-medium text-red-600">Over 48 hours</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{over48h.length}</div>
            <div className="mt-1 text-xs text-slate-400">Urgent review required</div>
          </div>
          <div className="rounded-2xl border border-red-300 bg-red-100/50 p-5 shadow-sm">
            <div className="text-sm font-medium text-red-700">Over 7 days</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{over7d.length}</div>
            <div className="mt-1 text-xs text-slate-400">Critically overdue</div>
          </div>
        </div>

        {over7d.length > 0 && (
          <div className="rounded-2xl border border-red-200 bg-red-50/50 px-5 py-4 text-sm text-red-700">
            <strong>{over7d.length} booking{over7d.length !== 1 ? "s" : ""}</strong> {over7d.length !== 1 ? "have" : "has"} been pending for over 7 days. Consider approving or cancelling to keep the diary clean.
          </div>
        )}

        {/* Pending bookings table — oldest first */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Pending bookings in range ({pendingBookings.length})</h3>
              <p className="mt-0.5 text-xs text-slate-500">Sorted by age — oldest (most urgent) first.</p>
            </div>
            <ExportButton
              data={pendingBookings as unknown as Record<string, unknown>[]}
              filename="pending-approvals.csv"
              columns={exportColumns}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  {["Reference", "Age", "Slot", "Unit", "Customer", "Payment", "Price", "Source"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingBookings.map((b: any) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-mono font-semibold text-slate-800">{b.bookingReference ?? "—"}</td>
                    <td className="px-4 py-2">{ageTag(b.ageHours)}</td>
                    <td className="px-4 py-2 text-slate-600">
                      {b.startsAt
                        ? new Date(b.startsAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {b.bookableUnitId ? (unitNameMap.get(b.bookableUnitId) ?? b.bookableUnitId.slice(0, 8)) : "—"}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {b.customerFirstName || b.customerLastName
                        ? `${b.customerFirstName ?? ""} ${b.customerLastName ?? ""}`.trim()
                        : b.customerEmail ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-slate-600">{b.paymentStatus ?? "—"}</td>
                    <td className="px-4 py-2 text-slate-600">
                      {b.price != null ? `£${Number(b.price).toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-2 text-slate-600">{b.bookingSource ?? "—"}</td>
                  </tr>
                ))}
                {pendingBookings.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-400">
                      No pending bookings. All caught up!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PortalLayout>
  )
}
