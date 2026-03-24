import { PortalLayout } from "@/components/portal-layout"
import { ExportButton } from "@/components/reports/export-button"
import { ReportFilters } from "@/components/reports/report-filters"
import { DonutChart, HBarChart, VBarChart, DualVBarChart } from "@/components/reports/charts"
import {
  getMembershipStats,
  getMembershipDailyStats,
  getMemberships,
  getMembershipsRenewalsDue,
} from "@/lib/api"
import { resolveReportRange, monthsBetween, inRange, formatDateRange } from "@/lib/report-utils"

export default async function MembershipReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const { from, to } = resolveReportRange(sp)
  const months = monthsBetween(from, to)
  const rangeLabel = formatDateRange(from, to)

  const statusFilter = typeof sp.status === 'string' ? sp.status : 'all'

  const [statsRes, dailyRes, membershipsRes, renewals7Res, renewals30Res] = await Promise.allSettled([
    getMembershipStats(),
    getMembershipDailyStats(months),
    getMemberships(1, 1000),
    getMembershipsRenewalsDue(7),
    getMembershipsRenewalsDue(30),
  ])

  const stats = statsRes.status === "fulfilled" ? statsRes.value : null
  const daily = dailyRes.status === "fulfilled" ? dailyRes.value : []
  const membershipsData = membershipsRes.status === "fulfilled" ? membershipsRes.value : null
  const rawMemberships: any[] = Array.isArray(membershipsData)
    ? membershipsData
    : (membershipsData as any)?.data ?? []
  const renewals7: any[]  = renewals7Res.status  === "fulfilled" ? (renewals7Res.value?.data  ?? []) : []
  const renewals30: any[] = renewals30Res.status === "fulfilled" ? (renewals30Res.value?.data ?? []) : []

  // Filter by date range and status
  const allMemberships = rawMemberships.filter((m: any) => {
    if (!inRange(m.startDate ?? m.createdAt, from, to)) return false
    if (statusFilter !== 'all' && m.status !== statusFilter) return false
    return true
  })

  const total = allMemberships.length
  const totalActive = allMemberships.filter((m: any) => m.status === 'active').length
  const totalRevenue = allMemberships
    .filter((m: any) => m.status === 'active')
    .reduce((s, m: any) => s + Number(m.price ?? 0), 0)

  const activeMemberships = allMemberships.filter((m) => m.status === "active")
  const autoRenewCount = activeMemberships.filter((m) => m.autoRenew).length
  const manualCount = activeMemberships.length - autoRenewCount
  const autoRenewPct = activeMemberships.length > 0
    ? Math.round((autoRenewCount / activeMemberships.length) * 100)
    : 0

  const paymentStatusMap: Record<string, number> = {}
  for (const m of activeMemberships) {
    const s = m.paymentStatus ?? "unknown"
    paymentStatusMap[s] = (paymentStatusMap[s] ?? 0) + 1
  }
  const paymentStatusSlices = Object.entries(paymentStatusMap).map(([label, value]) => ({ label, value }))

  const revenueAtRisk = renewals30.reduce((s, m) => s + (m.price ?? 0), 0)
  const autoRenew30 = renewals30.filter((m) => m.autoRenew)
  const manual30    = renewals30.filter((m) => !m.autoRenew)

  // Status donut from filtered data
  const statusMap: Record<string, number> = {}
  for (const m of allMemberships) {
    statusMap[m.status] = (statusMap[m.status] ?? 0) + 1
  }
  const statusSlices = Object.entries(statusMap).map(([label, value]) => ({ label, value }))

  // By plan from filtered data
  const byPlanMap: Record<string, { count: number; revenue: number }> = {}
  for (const m of allMemberships) {
    const p = m.planName ?? "Unknown"
    if (!byPlanMap[p]) byPlanMap[p] = { count: 0, revenue: 0 }
    byPlanMap[p].count += 1
    if (m.status === 'active') byPlanMap[p].revenue += Number(m.price ?? 0)
  }
  const byPlanRows = Object.entries(byPlanMap).map(([label, v]) => ({ label, value: v.count })).sort((a, b) => b.value - a.value)
  const byPlanRevenueRows = Object.entries(byPlanMap).filter(([, v]) => v.revenue > 0).map(([label, v]) => ({ label, value: parseFloat(v.revenue.toFixed(2)) })).sort((a, b) => b.value - a.value)

  // ── Retention / churn trend ───────────────────────────────────────────────
  // Derived from monthly snapshots: lapsed ≈ prev_active + new_this_month - this_active
  const retentionRows = daily.map((d, i) => {
    const prev = i > 0 ? daily[i - 1] : null
    const lapsed = prev
      ? Math.max(0, prev.activeCount + d.newCount - d.activeCount)
      : 0
    return {
      label: d.month.slice(0, 7), // "YYYY-MM"
      primary: d.newCount,
      secondary: lapsed,
      primaryFormatted: `${d.newCount} new`,
      secondaryFormatted: `${lapsed} lapsed`,
    }
  })

  const totalNew    = daily.reduce((s, d) => s + d.newCount, 0)
  const totalLapsed = retentionRows.reduce((s, r) => s + r.secondary, 0)
  const churnRate =
    totalNew + totalLapsed > 0
      ? Math.round((totalLapsed / (totalNew + totalLapsed)) * 100)
      : 0

  const exportColumns = [
    { key: "id", header: "ID" },
    { key: "planName", header: "Plan" },
    { key: "membershipType", header: "Type" },
    { key: "status", header: "Status" },
    { key: "paymentStatus", header: "Payment Status" },
    { key: "startDate", header: "Start Date" },
    { key: "endDate", header: "End Date" },
    { key: "autoRenew", header: "Auto Renew" },
    { key: "source", header: "Source" },
    { key: "createdAt", header: "Created" },
  ]

  const statusColour: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700",
    pending: "bg-amber-50 text-amber-700",
    cancelled: "bg-red-50 text-red-700",
    lapsed: "bg-slate-100 text-slate-600",
    suspended: "bg-orange-50 text-orange-700",
    expired: "bg-slate-100 text-slate-500",
  }

  return (
    <PortalLayout title="Membership Report" description="Membership status, plan breakdown, renewals forecast and revenue analysis.">
      <div className="space-y-6">

        <ReportFilters
          rangeLabel={rangeLabel}
          extraFilters={[
            {
              key: "status",
              label: "Status",
              options: ["active", "pending", "lapsed", "suspended", "expired", "cancelled"].map((s) => ({
                value: s,
                label: s.charAt(0).toUpperCase() + s.slice(1),
              })),
            },
          ]}
        />

        {/* KPI row */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">Memberships in range</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{total}</div>
            <div className="mt-1 text-xs text-slate-400">{rangeLabel}</div>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm">
            <div className="text-sm font-medium text-emerald-700">Active in range</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{totalActive}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">Active revenue (range)</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">£{totalRevenue.toFixed(2)}</div>
          </div>
          <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-5 shadow-sm">
            <div className="text-sm font-medium text-sky-700">Auto-renew rate</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{autoRenewPct}%</div>
            <div className="mt-1 text-xs text-slate-400">{autoRenewCount} auto / {manualCount} manual</div>
          </div>
        </div>

        {/* Renewals panel */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Renewals due</h2>
          <p className="mt-1 text-sm text-slate-600">Members approaching end of their membership period.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-amber-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-amber-600">Next 7 days</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{renewals7.length}</div>
              <div className="mt-1 text-xs text-slate-500">
                {renewals7.filter((m) => m.autoRenew).length} auto-renew / {renewals7.filter((m) => !m.autoRenew).length} manual
              </div>
            </div>
            <div className="rounded-xl border border-amber-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-amber-600">Next 30 days</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{renewals30.length}</div>
              <div className="mt-1 text-xs text-slate-500">
                {autoRenew30.length} auto-renew / {manual30.length} manual
              </div>
            </div>
            <div className="rounded-xl border border-red-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-red-600">Revenue at risk (30d)</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">£{revenueAtRisk.toFixed(2)}</div>
              <div className="mt-1 text-xs text-slate-500">From {renewals30.length} expiring</div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Memberships by status (filtered)</h3>
            {statusSlices.length > 0 ? (
              <DonutChart slices={statusSlices} colours={["#10b981", "#f59e0b", "#ef4444", "#64748b", "#f97316", "#8b5cf6"]} />
            ) : (
              <DonutChart slices={(stats?.byStatus ?? []).map((r) => ({ label: r.status, value: r.count }))} colours={["#10b981", "#f59e0b", "#ef4444", "#64748b", "#f97316", "#8b5cf6"]} />
            )}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Active memberships — payment status</h3>
            {paymentStatusSlices.length > 0 ? (
              <DonutChart slices={paymentStatusSlices} colours={["#10b981", "#f59e0b", "#ef4444", "#64748b"]} />
            ) : (
              <p className="text-sm text-slate-400">No active membership payment data.</p>
            )}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Memberships by type (filtered)</h3>
            <DonutChart slices={(stats?.byType ?? []).map((r) => ({ label: r.membershipType, value: r.count }))} />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Auto-renew vs manual (active, filtered)</h3>
            <HBarChart
              rows={[
                { label: "Auto-renew", value: autoRenewCount },
                { label: "Manual", value: manualCount },
              ]}
              colour="#1857E0"
            />
          </div>
        </div>

        {byPlanRows.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Memberships by plan (filtered)</h3>
            <HBarChart rows={byPlanRows} colour="#1857E0" />
          </div>
        )}

        {byPlanRevenueRows.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Active revenue by plan (filtered, £)</h3>
            <HBarChart rows={byPlanRevenueRows} colour="#10b981" />
          </div>
        )}

        {daily.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">New memberships by month ({months} months)</h3>
            <VBarChart
              rows={daily.map((d) => ({ label: d.month.slice(5), value: d.newCount }))}
              colour="#1857E0"
            />
          </div>
        )}

        {/* Retention / churn section */}
        {retentionRows.length > 1 && (
          <>
            {/* Retention KPIs */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
                <div className="text-sm font-medium text-emerald-700">New members (period)</div>
                <div className="mt-2 text-3xl font-bold text-slate-950">{totalNew}</div>
                <div className="mt-1 text-xs text-slate-400">{months} months</div>
              </div>
              <div className="rounded-2xl border border-red-200 bg-red-50/50 p-5 shadow-sm">
                <div className="text-sm font-medium text-red-600">Lapsed / churned (period)</div>
                <div className="mt-2 text-3xl font-bold text-slate-950">{totalLapsed}</div>
                <div className="mt-1 text-xs text-slate-400">Estimated from active-count delta</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm font-medium text-slate-500">Net churn rate</div>
                <div className={`mt-2 text-3xl font-bold ${churnRate > 25 ? "text-red-600" : churnRate > 10 ? "text-amber-600" : "text-emerald-600"}`}>
                  {churnRate}%
                </div>
                <div className="mt-1 text-xs text-slate-400">Lapsed ÷ (new + lapsed)</div>
              </div>
            </div>

            {/* New vs Lapsed dual chart */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-1 text-base font-semibold text-slate-900">New vs lapsed memberships by month</h3>
              <p className="mb-4 text-xs text-slate-400">
                Lapsed is estimated from the month-on-month change in active count. Use as a trend indicator, not an exact count.
              </p>
              <DualVBarChart
                rows={retentionRows}
                primaryColour="#10b981"
                secondaryColour="#ef4444"
                primaryLabel="New"
                secondaryLabel="Lapsed (est.)"
              />
            </div>

            {/* Active members trend */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-1 text-base font-semibold text-slate-900">Active membership count by month</h3>
              <p className="mb-4 text-xs text-slate-400">Snapshot at end of each month</p>
              <VBarChart
                rows={daily.map((d) => ({ label: d.month.slice(0, 7), value: d.activeCount }))}
                colour="#1857E0"
              />
            </div>
          </>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-semibold text-slate-900">Filtered memberships ({allMemberships.length})</h3>
            <ExportButton data={allMemberships} filename="memberships-report.csv" columns={exportColumns} />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  {["Plan", "Type", "Status", "Payment", "Start", "End", "Auto Renew"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allMemberships.slice(0, 50).map((m: any) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium text-slate-800">{m.planName ?? "—"}</td>
                    <td className="px-4 py-2 text-slate-600 capitalize">{m.membershipType ?? "—"}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColour[m.status] ?? "bg-slate-100 text-slate-600"}`}>{m.status}</span>
                    </td>
                    <td className="px-4 py-2 text-slate-600">{m.paymentStatus ?? "—"}</td>
                    <td className="px-4 py-2 text-slate-600">{m.startDate ? new Date(m.startDate).toLocaleDateString("en-GB") : "—"}</td>
                    <td className="px-4 py-2 text-slate-600">{m.endDate ? new Date(m.endDate).toLocaleDateString("en-GB") : "—"}</td>
                    <td className="px-4 py-2 text-slate-600">{m.autoRenew ? "Yes" : "No"}</td>
                  </tr>
                ))}
                {allMemberships.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-400">No memberships match the selected filters.</td></tr>
                )}
              </tbody>
            </table>
            {allMemberships.length > 50 && (
              <p className="px-4 py-3 text-xs text-slate-400">Showing first 50 of {allMemberships.length}. Use Export CSV for full data.</p>
            )}
          </div>
        </div>
      </div>
    </PortalLayout>
  )
}
