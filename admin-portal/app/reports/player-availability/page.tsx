import { PortalLayout } from "@/components/portal-layout"
import { ExportButton } from "@/components/reports/export-button"
import { HBarChart } from "@/components/reports/charts"
import { getTeamReportPlayerStats, getTeams } from "@/lib/api"

export default async function PlayerAvailabilityReportPage({
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

  // Flatten all players across teams
  const rows = teamsData.flatMap((team) =>
    team.players.map((p) => ({
      teamId: team.teamId,
      teamName: team.teamName,
      sport: team.sport,
      season: team.season,
      playerId: p.id,
      displayName: p.displayName,
      position: p.position,
      isJunior: p.isJunior,
      isGuest: p.isGuest,
      ...p.availability,
    }))
  )

  const avgResponseRate = rows.length > 0
    ? Math.round(rows.filter((r) => r.responseRate != null).reduce((s, r) => s + (r.responseRate ?? 0), 0) / rows.filter((r) => r.responseRate != null).length)
    : null

  // Top responders
  const topResponders = [...rows]
    .filter((r) => r.responseRate != null)
    .sort((a, b) => (b.responseRate ?? 0) - (a.responseRate ?? 0))
    .slice(0, 15)
    .map((r) => ({ label: r.displayName, value: r.responseRate ?? 0, valueFormatted: `${r.responseRate}%` }))

  const exportColumns = [
    { key: "teamName", header: "Team" },
    { key: "season", header: "Season" },
    { key: "displayName", header: "Player" },
    { key: "position", header: "Position" },
    { key: "isJunior", header: "Junior" },
    { key: "totalRequested", header: "Requested" },
    { key: "responded", header: "Responded" },
    { key: "available", header: "Available" },
    { key: "maybe", header: "Maybe" },
    { key: "unavailable", header: "Unavailable" },
    { key: "noResponse", header: "No Response" },
    { key: "responseRate", header: "Response Rate (%)" },
    { key: "availabilityRate", header: "Availability Rate (%)" },
  ]

  return (
    <PortalLayout title="Player Availability" description="Availability response rates and patterns per player across all teams.">
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
            { label: "Avg response rate", value: avgResponseRate != null ? `${avgResponseRate}%` : "—" },
            { label: "Teams included", value: teamsData.length },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-medium text-slate-500">{k.label}</div>
              <div className="mt-2 text-3xl font-bold text-slate-950">{k.value}</div>
            </div>
          ))}
        </div>

        {topResponders.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Top response rates (players)</h3>
            <HBarChart rows={topResponders} colour="#1857E0" />
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
                    {["Player", "Requested", "Responded", "Available", "Maybe", "Unavailable", "Response Rate", "Availability Rate"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {team.players.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-medium text-slate-900">
                        {p.displayName}
                        {p.isJunior && <span className="ml-1 rounded-full bg-sky-50 px-1.5 py-0.5 text-xs text-sky-600">J</span>}
                      </td>
                      <td className="px-4 py-2 text-slate-600">{p.availability.totalRequested}</td>
                      <td className="px-4 py-2 text-slate-600">{p.availability.responded}</td>
                      <td className="px-4 py-2 text-green-700">{p.availability.available}</td>
                      <td className="px-4 py-2 text-amber-600">{p.availability.maybe}</td>
                      <td className="px-4 py-2 text-red-600">{p.availability.unavailable}</td>
                      <td className="px-4 py-2">
                        {p.availability.responseRate != null ? (
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full bg-[#1857E0]" style={{ width: `${p.availability.responseRate}%` }} />
                            </div>
                            <span className="text-slate-700">{p.availability.responseRate}%</span>
                          </div>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-2">
                        {p.availability.availabilityRate != null ? (
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${p.availability.availabilityRate}%` }} />
                            </div>
                            <span className="text-slate-700">{p.availability.availabilityRate}%</span>
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

        {/* Export */}
        <div className="flex justify-end">
          <ExportButton data={rows} filename="player-availability.csv" columns={exportColumns} />
        </div>
      </div>
    </PortalLayout>
  )
}
