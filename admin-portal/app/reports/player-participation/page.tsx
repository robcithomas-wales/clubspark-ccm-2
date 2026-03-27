import { PortalLayout } from "@/components/portal-layout"
import { ExportButton } from "@/components/reports/export-button"
import { HBarChart } from "@/components/reports/charts"
import { getTeamReportPlayerStats, getTeams } from "@/lib/api"

export default async function PlayerParticipationReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const teamFilter = typeof sp.team === "string" ? sp.team : undefined

  const [teamsData, allTeams] = await Promise.all([
    getTeamReportPlayerStats(teamFilter).catch(() => []),
    getTeams().catch(() => []),
  ])

  const rows = teamsData.flatMap((team) =>
    team.players.map((p) => ({
      teamId: team.teamId,
      teamName: team.teamName,
      sport: team.sport,
      season: team.season,
      playerId: p.id,
      displayName: p.displayName,
      position: p.position,
      shirtNumber: p.shirtNumber,
      isJunior: p.isJunior,
      isGuest: p.isGuest,
      starts: p.selection.starts,
      subs: p.selection.subs,
      reserves: p.selection.reserves,
      totalSelected: p.selection.totalSelected,
      completedFixtures: p.selection.completedFixtures,
      selectionRate: p.selection.selectionRate,
    }))
  )

  const avgSelectionRate = (() => {
    const rated = rows.filter((r) => r.selectionRate != null && r.completedFixtures > 0)
    if (rated.length === 0) return null
    return Math.round(rated.reduce((s, r) => s + (r.selectionRate ?? 0), 0) / rated.length)
  })()

  const topStarters = [...rows]
    .filter((r) => r.starts > 0)
    .sort((a, b) => b.starts - a.starts)
    .slice(0, 15)
    .map((r) => ({ label: r.displayName, value: r.starts }))

  const exportColumns = [
    { key: "teamName", header: "Team" },
    { key: "season", header: "Season" },
    { key: "displayName", header: "Player" },
    { key: "position", header: "Position" },
    { key: "isJunior", header: "Junior" },
    { key: "completedFixtures", header: "Completed Fixtures" },
    { key: "starts", header: "Starts" },
    { key: "subs", header: "Sub appearances" },
    { key: "reserves", header: "Named reserve" },
    { key: "totalSelected", header: "Total selected" },
    { key: "selectionRate", header: "Selection Rate (%)" },
  ]

  return (
    <PortalLayout title="Player Participation" description="Selection, starts, substitutions and participation rates per player.">
      <div className="space-y-6">

        {/* Team filter */}
        <form className="flex flex-wrap gap-3">
          <select name="team" defaultValue={teamFilter ?? ""} className="rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:outline-none">
            <option value="">All teams</option>
            {allTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button type="submit" className="rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-semibold !text-white shadow-sm hover:bg-[#1832A8]">Filter</button>
        </form>

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Total players", value: rows.length },
            { label: "Avg selection rate", value: avgSelectionRate != null ? `${avgSelectionRate}%` : "—" },
            { label: "Teams included", value: teamsData.length },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-medium text-slate-500">{k.label}</div>
              <div className="mt-2 text-3xl font-bold text-slate-950">{k.value}</div>
            </div>
          ))}
        </div>

        {topStarters.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Most starts (top 15)</h3>
            <HBarChart rows={topStarters} colour="#6366f1" />
          </div>
        )}

        {/* Per-team sections */}
        {teamsData.map((team) => (
          <div key={team.teamId} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-semibold text-slate-900">{team.teamName}</h3>
              <p className="text-sm text-slate-400">{team.sport}{team.season ? ` · ${team.season}` : ""}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    {["#", "Player", "Position", "Fixtures", "Starts", "Subs", "Reserves", "Selection Rate"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...team.players]
                    .sort((a, b) => b.selection.starts - a.selection.starts)
                    .map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-center text-xs font-bold text-slate-400">{p.shirtNumber ?? "—"}</td>
                        <td className="px-4 py-2 font-medium text-slate-900">
                          {p.displayName}
                          {p.isJunior && <span className="ml-1 rounded-full bg-sky-50 px-1.5 py-0.5 text-xs text-sky-600">J</span>}
                          {p.isGuest && <span className="ml-1 rounded-full bg-purple-50 px-1.5 py-0.5 text-xs text-purple-600">G</span>}
                        </td>
                        <td className="px-4 py-2 text-slate-500">{p.position ?? "—"}</td>
                        <td className="px-4 py-2 text-slate-600">{p.selection.completedFixtures}</td>
                        <td className="px-4 py-2 font-semibold text-indigo-700">{p.selection.starts}</td>
                        <td className="px-4 py-2 text-slate-600">{p.selection.subs}</td>
                        <td className="px-4 py-2 text-slate-400">{p.selection.reserves}</td>
                        <td className="px-4 py-2">
                          {p.selection.selectionRate != null ? (
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                                <div className="h-full rounded-full bg-indigo-500" style={{ width: `${p.selection.selectionRate}%` }} />
                              </div>
                              <span className="text-slate-700">{p.selection.selectionRate}%</span>
                            </div>
                          ) : "—"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {rows.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 shadow-sm">
            No player data found.
          </div>
        )}

        <div className="flex justify-end">
          <ExportButton data={rows} filename="player-participation.csv" columns={exportColumns} />
        </div>
      </div>
    </PortalLayout>
  )
}
