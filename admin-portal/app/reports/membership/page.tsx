import { PortalLayout } from "@/components/portal-layout"
import { ExportButton } from "@/components/reports/export-button"
import { DonutChart, HBarChart, VBarChart } from "@/components/reports/charts"
import {
  getMembershipStats,
  getMembershipDailyStats,
  getMemberships,
} from "@/lib/api"

export default async function MembershipReportPage() {
  const [statsRes, dailyRes, membershipsRes] = await Promise.allSettled([
    getMembershipStats(),
    getMembershipDailyStats(12),
    getMemberships(1, 1000),
  ])

  const stats = statsRes.status === "fulfilled" ? statsRes.value : null
  const daily = dailyRes.status === "fulfilled" ? dailyRes.value : []
  const membershipsData = membershipsRes.status === "fulfilled" ? membershipsRes.value : null
  const allMemberships: any[] = Array.isArray(membershipsData)
    ? membershipsData
    : (membershipsData as any)?.data ?? []

  const totalRevenue = stats?.totalRevenue ?? 0
  const totalActive = stats?.totalActive ?? 0
  const total = stats?.byStatus.reduce((s, r) => s + r.count, 0) ?? 0

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
    <PortalLayout title="Membership Report" description="Membership status, plan breakdown, revenue and growth over time.">
      <div className="space-y-6">

        {/* KPI row */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Total memberships", value: total },
            { label: "Active memberships", value: totalActive },
            { label: "Estimated active revenue", value: `£${totalRevenue.toFixed(2)}` },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-medium text-slate-500">{k.label}</div>
              <div className="mt-2 text-3xl font-bold text-slate-950">{k.value}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {/* Status donut */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Memberships by status</h3>
            <DonutChart
              slices={(stats?.byStatus ?? []).map((r) => ({ label: r.status, value: r.count }))}
              colours={["#10b981", "#f59e0b", "#ef4444", "#64748b", "#f97316", "#8b5cf6"]}
            />
          </div>

          {/* Membership type donut */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Memberships by type</h3>
            <DonutChart
              slices={(stats?.byType ?? []).map((r) => ({ label: r.membershipType, value: r.count }))}
            />
          </div>
        </div>

        {/* By plan bar */}
        {(stats?.byPlan ?? []).length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Memberships by plan</h3>
            <HBarChart
              rows={(stats?.byPlan ?? []).map((p) => ({ label: p.planName, value: p.count }))}
              colour="#1857E0"
            />
          </div>
        )}

        {/* Revenue by plan bar */}
        {(stats?.byPlan ?? []).some((p) => p.revenue > 0) && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Active revenue by plan (£)</h3>
            <HBarChart
              rows={(stats?.byPlan ?? [])
                .filter((p) => p.revenue > 0)
                .map((p) => ({ label: p.planName, value: parseFloat(p.revenue.toFixed(2)) }))}
              colour="#10b981"
            />
          </div>
        )}

        {/* Monthly new memberships */}
        {daily.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">New memberships by month (12 months)</h3>
            <VBarChart
              rows={daily.map((d) => ({ label: d.month.slice(5), value: d.newCount }))}
              colour="#1857E0"
            />
          </div>
        )}

        {/* Full memberships table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-semibold text-slate-900">All memberships ({allMemberships.length})</h3>
            <ExportButton
              data={allMemberships}
              filename="memberships-report.csv"
              columns={exportColumns}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  {["Plan", "Type", "Status", "Payment", "Start", "Auto Renew"].map((h) => (
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
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColour[m.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-600">{m.paymentStatus ?? "—"}</td>
                    <td className="px-4 py-2 text-slate-600">
                      {m.startDate ? new Date(m.startDate).toLocaleDateString("en-GB") : "—"}
                    </td>
                    <td className="px-4 py-2 text-slate-600">{m.autoRenew ? "Yes" : "No"}</td>
                  </tr>
                ))}
                {allMemberships.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-400">No membership records found.</td></tr>
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
