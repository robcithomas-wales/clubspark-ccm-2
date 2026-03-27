import { PortalLayout } from "@/components/portal-layout"
import { ExportButton } from "@/components/reports/export-button"
import { HBarChart } from "@/components/reports/charts"
import { getTeamReportOverview } from "@/lib/api"

export default async function TeamsOverviewReportPage() {
  let teams = await getTeamReportOverview().catch(() => [])

  const totalPlayers = teams.reduce((s, t) => s + t.activePlayers, 0)
  const totalUpcoming = teams.reduce((s, t) => s + t.upcomingFixtures, 0)
  const totalFees = teams.reduce((s, t) => s + t.outstandingFees, 0)

  const playerRows = [...teams]
    .sort((a, b) => b.activePlayers - a.activePlayers)
    .map((t) => ({ label: t.name, value: t.activePlayers }))

  const feeRows = teams
    .filter((t) => t.outstandingFees > 0)
    .sort((a, b) => b.outstandingFees - a.outstandingFees)
    .map((t) => ({ label: t.name, value: Math.round(t.outstandingFees), valueFormatted: `£${t.outstandingFees.toFixed(2)}` }))

  const exportColumns = [
    { key: "name", header: "Team" },
    { key: "sport", header: "Sport" },
    { key: "season", header: "Season" },
    { key: "ageGroup", header: "Age Group" },
    { key: "activePlayers", header: "Active Players" },
    { key: "totalFixtures", header: "Total Fixtures" },
    { key: "upcomingFixtures", header: "Upcoming Fixtures" },
    { key: "outstandingFees", header: "Outstanding Fees (£)" },
  ]

  return (
    <PortalLayout title="Cross-Team Overview" description="Active squads, upcoming fixtures and outstanding fees across all teams.">
      <div className="space-y-6">

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Total active teams", value: teams.length },
            { label: "Total active players", value: totalPlayers },
            { label: "Upcoming fixtures", value: totalUpcoming },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-medium text-slate-500">{k.label}</div>
              <div className="mt-2 text-3xl font-bold text-slate-950">{k.value}</div>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm">
          <div className="text-sm font-medium text-amber-700">Total outstanding fees</div>
          <div className="mt-2 text-3xl font-bold text-slate-950">£{totalFees.toFixed(2)}</div>
          <div className="mt-1 text-xs text-slate-400">Pending charges across all teams</div>
        </div>

        {/* Charts */}
        <div className="grid gap-6 xl:grid-cols-2">
          {playerRows.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-slate-900">Active players per team</h3>
              <HBarChart rows={playerRows} colour="#1857E0" />
            </div>
          )}
          {feeRows.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-slate-900">Outstanding fees by team</h3>
              <HBarChart rows={feeRows} colour="#f59e0b" />
            </div>
          )}
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-semibold text-slate-900">All teams ({teams.length})</h3>
            <ExportButton data={teams} filename="teams-overview.csv" columns={exportColumns} />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  {["Team", "Sport", "Season", "Players", "Fixtures", "Upcoming", "Outstanding Fees"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teams.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium text-slate-900">{t.name}</td>
                    <td className="px-4 py-2 text-slate-600 capitalize">{t.sport}</td>
                    <td className="px-4 py-2 text-slate-600">{t.season ?? "—"}</td>
                    <td className="px-4 py-2 text-slate-700">{t.activePlayers}</td>
                    <td className="px-4 py-2 text-slate-700">{t.totalFixtures}</td>
                    <td className="px-4 py-2 text-slate-700">{t.upcomingFixtures}</td>
                    <td className="px-4 py-2">
                      {t.outstandingFees > 0 ? (
                        <span className="font-semibold text-amber-700">£{t.outstandingFees.toFixed(2)}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {teams.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">No teams found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PortalLayout>
  )
}
