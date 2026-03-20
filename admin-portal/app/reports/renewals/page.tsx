import { PortalLayout } from "@/components/portal-layout"
import { ExportButton } from "@/components/reports/export-button"
import { ReportFilters } from "@/components/reports/report-filters"
import { HBarChart, DonutChart } from "@/components/reports/charts"
import { getMembershipsRenewalsDue } from "@/lib/api"

export default async function RenewalsReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  // searchParams accepted for filter UI consistency — renewals are always forward-looking
  await searchParams
  const [r7Res, r14Res, r30Res, r60Res] = await Promise.allSettled([
    getMembershipsRenewalsDue(7),
    getMembershipsRenewalsDue(14),
    getMembershipsRenewalsDue(30),
    getMembershipsRenewalsDue(60),
  ])

  const renewals7: any[]  = r7Res.status  === "fulfilled" ? (r7Res.value?.data  ?? []) : []
  const renewals14: any[] = r14Res.status === "fulfilled" ? (r14Res.value?.data ?? []) : []
  const renewals30: any[] = r30Res.status === "fulfilled" ? (r30Res.value?.data ?? []) : []
  const renewals60: any[] = r60Res.status === "fulfilled" ? (r60Res.value?.data ?? []) : []

  const revenueAtRisk30 = renewals30.reduce((s, m) => s + (m.price ?? 0), 0)
  const revenueAtRisk60 = renewals60.reduce((s, m) => s + (m.price ?? 0), 0)

  const autoRenew30 = renewals30.filter((m) => m.autoRenew)
  const manual30    = renewals30.filter((m) => !m.autoRenew)

  // Renewals by plan (30 days)
  const byPlan: Record<string, number> = {}
  for (const m of renewals30) {
    const p = m.planName ?? "Unknown plan"
    byPlan[p] = (byPlan[p] ?? 0) + 1
  }
  const byPlanRows = Object.entries(byPlan)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)

  const exportColumns = [
    { key: "id", header: "ID" },
    { key: "planName", header: "Plan" },
    { key: "membershipType", header: "Type" },
    { key: "status", header: "Status" },
    { key: "paymentStatus", header: "Payment Status" },
    { key: "endDate", header: "End Date" },
    { key: "autoRenew", header: "Auto Renew" },
    { key: "price", header: "Price (£)" },
  ]

  return (
    <PortalLayout title="Renewals Forecast" description="Memberships approaching expiry — identify revenue at risk and members needing action.">
      <div className="space-y-6">

        <ReportFilters rangeLabel="Forward-looking renewal windows (7 / 14 / 30 / 60 days from today)" />

        {/* Forecast windows */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Expiring in 7 days",  count: renewals7.length,  auto: renewals7.filter((m) => m.autoRenew).length },
            { label: "Expiring in 14 days", count: renewals14.length, auto: renewals14.filter((m) => m.autoRenew).length },
            { label: "Expiring in 30 days", count: renewals30.length, auto: autoRenew30.length },
            { label: "Expiring in 60 days", count: renewals60.length, auto: renewals60.filter((m) => m.autoRenew).length },
          ].map((w) => (
            <div key={w.label} className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-amber-600">{w.label}</div>
              <div className="mt-2 text-3xl font-bold text-slate-900">{w.count}</div>
              <div className="mt-1 text-xs text-slate-500">
                {w.auto} auto-renew · {w.count - w.auto} need action
              </div>
            </div>
          ))}
        </div>

        {/* Revenue at risk */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-red-200 bg-red-50/50 p-5 shadow-sm">
            <div className="text-sm font-medium text-red-600">Revenue at risk — next 30 days</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">£{revenueAtRisk30.toFixed(2)}</div>
            <div className="mt-1 text-xs text-slate-400">From {manual30.length} memberships without auto-renew</div>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50/50 p-5 shadow-sm">
            <div className="text-sm font-medium text-red-600">Revenue at risk — next 60 days</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">£{revenueAtRisk60.toFixed(2)}</div>
            <div className="mt-1 text-xs text-slate-400">From {renewals60.filter((m) => !m.autoRenew).length} memberships without auto-renew</div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {/* Auto-renew vs manual donut */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Auto-renew vs manual (30-day window)</h3>
            {renewals30.length > 0 ? (
              <DonutChart
                slices={[
                  { label: "Auto-renew", value: autoRenew30.length },
                  { label: "Manual", value: manual30.length },
                ]}
                colours={["#10b981", "#f59e0b"]}
              />
            ) : (
              <p className="text-sm text-slate-400">No renewals due in the next 30 days.</p>
            )}
          </div>

          {/* By plan bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Renewals by plan (30 days)</h3>
            {byPlanRows.length > 0 ? (
              <HBarChart rows={byPlanRows} colour="#1857E0" />
            ) : (
              <p className="text-sm text-slate-400">No renewal data available.</p>
            )}
          </div>
        </div>

        {/* Renewals list — prioritised: manual first, sorted soonest expiry */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Members expiring in 30 days ({renewals30.length})</h3>
              <p className="mt-0.5 text-xs text-slate-500">Manual renewals shown first — these need staff action.</p>
            </div>
            <ExportButton
              data={renewals30 as unknown as Record<string, unknown>[]}
              filename="renewals-forecast.csv"
              columns={exportColumns}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  {["Plan", "Type", "Status", "Payment", "Expires", "Auto Renew", "Price"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...renewals30]
                  .sort((a, b) => {
                    // Manual first, then soonest expiry
                    if (a.autoRenew !== b.autoRenew) return a.autoRenew ? 1 : -1
                    return new Date(a.endDate ?? 0).getTime() - new Date(b.endDate ?? 0).getTime()
                  })
                  .map((m: any) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium text-slate-800">{m.planName ?? "—"}</td>
                    <td className="px-4 py-2 text-slate-600 capitalize">{m.membershipType ?? "—"}</td>
                    <td className="px-4 py-2">
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                        {m.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-600">{m.paymentStatus ?? "—"}</td>
                    <td className="px-4 py-2 text-slate-600">
                      {m.endDate ? new Date(m.endDate).toLocaleDateString("en-GB") : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${m.autoRenew ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                        {m.autoRenew ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-600">{m.price != null ? `£${Number(m.price).toFixed(2)}` : "—"}</td>
                  </tr>
                ))}
                {renewals30.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-400">No memberships expiring in the next 30 days.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PortalLayout>
  )
}
