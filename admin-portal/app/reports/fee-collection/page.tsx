import { PortalLayout } from "@/components/portal-layout"
import { ExportButton } from "@/components/reports/export-button"
import { HBarChart, DonutChart } from "@/components/reports/charts"
import { getTeamReportCharges, getTeams } from "@/lib/api"

export default async function FeeCollectionReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const seasonFilter = typeof sp.season === "string" ? sp.season : undefined
  const statusFilter = typeof sp.status === "string" ? sp.status : "all"
  const teamFilter = typeof sp.team === "string" ? sp.team : "all"

  const [charges, teams] = await Promise.all([
    getTeamReportCharges(seasonFilter).catch(() => []),
    getTeams().catch(() => []),
  ])

  const filtered = charges.filter((c) => {
    if (teamFilter !== "all" && c.teamId !== teamFilter) return false
    if (statusFilter !== "all" && c.status !== statusFilter) return false
    return true
  })

  const totalCharged = filtered.reduce((s, c) => s + c.amount, 0)
  const totalPaid = filtered.filter((c) => c.status === "paid").reduce((s, c) => s + c.amount, 0)
  const totalPending = filtered.filter((c) => c.status === "pending").reduce((s, c) => s + c.amount, 0)
  const collectionRate = totalCharged > 0 ? Math.round((totalPaid / totalCharged) * 100) : null

  const byTeam: Record<string, { name: string; total: number; paid: number }> = {}
  for (const c of filtered) {
    if (!byTeam[c.teamId]) byTeam[c.teamId] = { name: c.teamName, total: 0, paid: 0 }
    byTeam[c.teamId].total += c.amount
    if (c.status === "paid") byTeam[c.teamId].paid += c.amount
  }
  const byTeamRows = Object.values(byTeam)
    .sort((a, b) => b.total - a.total)
    .map((r) => ({ label: r.name, value: Math.round(r.total), valueFormatted: `£${r.total.toFixed(2)}` }))

  const statusSlices = [
    { label: "Paid", value: filtered.filter((c) => c.status === "paid").length },
    { label: "Pending", value: filtered.filter((c) => c.status === "pending").length },
    { label: "Waived", value: filtered.filter((c) => c.status === "waived").length },
  ].filter((s) => s.value > 0)

  const seasons = Array.from(new Set(charges.map((c) => c.season).filter(Boolean))) as string[]

  const exportColumns = [
    { key: "teamName", header: "Team" },
    { key: "season", header: "Season" },
    { key: "playerName", header: "Player" },
    { key: "isJunior", header: "Junior" },
    { key: "opponent", header: "Opponent" },
    { key: "kickoffAt", header: "Fixture Date" },
    { key: "matchType", header: "Match Type" },
    { key: "amount", header: "Amount (£)" },
    { key: "status", header: "Status" },
    { key: "paidAt", header: "Paid At" },
    { key: "chargeRunDate", header: "Charged On" },
    { key: "notes", header: "Notes" },
  ]

  return (
    <PortalLayout title="Fee Collection" description="Match fee charges, payment status, and collection rates across all teams.">
      <div className="space-y-6">

        {/* Filters */}
        <form className="flex flex-wrap gap-3">
          <select name="season" defaultValue={seasonFilter ?? ""} className="rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:outline-none">
            <option value="">All seasons</option>
            {seasons.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select name="team" defaultValue={teamFilter} className="rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:outline-none">
            <option value="all">All teams</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select name="status" defaultValue={statusFilter} className="rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:outline-none">
            <option value="all">All statuses</option>
            {["pending", "paid", "waived", "failed"].map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <button type="submit" className="rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-semibold !text-white shadow-sm hover:bg-[#1832A8]">Filter</button>
        </form>

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">Total charged</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">£{totalCharged.toFixed(2)}</div>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm">
            <div className="text-sm font-medium text-emerald-700">Collected</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">£{totalPaid.toFixed(2)}</div>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm">
            <div className="text-sm font-medium text-amber-700">Outstanding</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">£{totalPending.toFixed(2)}</div>
          </div>
          <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-5 shadow-sm">
            <div className="text-sm font-medium text-sky-700">Collection rate</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{collectionRate != null ? `${collectionRate}%` : "—"}</div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {statusSlices.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-slate-900">Charges by status</h3>
              <DonutChart slices={statusSlices} colours={["#10b981", "#f59e0b", "#64748b"]} />
            </div>
          )}
          {byTeamRows.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-slate-900">Total charged by team</h3>
              <HBarChart rows={byTeamRows} colour="#1857E0" />
            </div>
          )}
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-semibold text-slate-900">Charges ({filtered.length})</h3>
            <ExportButton data={filtered} filename="fee-collection.csv" columns={exportColumns} />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  {["Team", "Player", "Opponent", "Date", "Type", "Amount", "Status", "Paid"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-700">{c.teamName}</td>
                    <td className="px-4 py-2 font-medium text-slate-900">
                      {c.playerName}
                      {c.isJunior && <span className="ml-1 rounded-full bg-sky-50 px-1.5 py-0.5 text-xs text-sky-600">Junior</span>}
                    </td>
                    <td className="px-4 py-2 text-slate-600">{c.opponent}</td>
                    <td className="px-4 py-2 text-slate-600">
                      {new Date(c.kickoffAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-2 text-slate-600 capitalize">{c.matchType ?? "—"}</td>
                    <td className="px-4 py-2 font-semibold text-slate-900">£{c.amount.toFixed(2)}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.status === "paid" ? "bg-green-50 text-green-700" :
                        c.status === "pending" ? "bg-amber-50 text-amber-700" :
                        "bg-slate-100 text-slate-600"
                      }`}>{c.status}</span>
                    </td>
                    <td className="px-4 py-2 text-slate-500">
                      {c.paidAt ? new Date(c.paidAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-400">No charges found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PortalLayout>
  )
}
