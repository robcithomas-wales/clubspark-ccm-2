import { PortalLayout } from "@/components/portal-layout"
import { ExportButton } from "@/components/reports/export-button"
import { VBarChart, HBarChart } from "@/components/reports/charts"
import { getTeamReportFixtures, getTeams } from "@/lib/api"

export default async function FixturesSummaryReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const seasonFilter = typeof sp.season === "string" ? sp.season : undefined
  const teamFilter = typeof sp.team === "string" ? sp.team : "all"

  const [fixtures, teams] = await Promise.all([
    getTeamReportFixtures(seasonFilter).catch(() => []),
    getTeams().catch(() => []),
  ])

  const filtered = fixtures.filter((f) => {
    if (teamFilter !== "all" && f.teamId !== teamFilter) return false
    return true
  })

  const now = new Date()
  const upcoming = filtered.filter((f) => new Date(f.kickoffAt) >= now && f.status !== "cancelled")
  const past = filtered.filter((f) => new Date(f.kickoffAt) < now || f.status === "completed")
  const cancelled = filtered.filter((f) => f.status === "cancelled")

  // By month
  const byMonth: Record<string, number> = {}
  for (const f of filtered) {
    const m = f.kickoffAt.slice(0, 7)
    byMonth[m] = (byMonth[m] ?? 0) + 1
  }
  const byMonthRows = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, value]) => ({ label: label.slice(5), value }))

  // By team
  const byTeam: Record<string, number> = {}
  for (const f of filtered) {
    byTeam[f.teamName] = (byTeam[f.teamName] ?? 0) + 1
  }
  const byTeamRows = Object.entries(byTeam)
    .sort(([, a], [, b]) => b - a)
    .map(([label, value]) => ({ label, value }))

  // By matchType
  const byType: Record<string, number> = {}
  for (const f of filtered) {
    const t = f.matchType ?? "unknown"
    byType[t] = (byType[t] ?? 0) + 1
  }
  const byTypeRows = Object.entries(byType)
    .sort(([, a], [, b]) => b - a)
    .map(([label, value]) => ({ label, value }))

  const seasons = Array.from(new Set(fixtures.map((f) => f.season).filter(Boolean))) as string[]

  const exportColumns = [
    { key: "teamName", header: "Team" },
    { key: "sport", header: "Sport" },
    { key: "season", header: "Season" },
    { key: "opponent", header: "Opponent" },
    { key: "homeAway", header: "H/A" },
    { key: "venue", header: "Venue" },
    { key: "kickoffAt", header: "Kickoff" },
    { key: "matchType", header: "Type" },
    { key: "status", header: "Status" },
    { key: "homeScore", header: "Home" },
    { key: "awayScore", header: "Away" },
    { key: "result", header: "Result" },
    { key: "availabilityResponses", header: "Availability Responses" },
    { key: "selectionCount", header: "Selected Players" },
  ]

  return (
    <PortalLayout title="Fixtures Summary" description="Complete fixture breakdown by team, month, type, and status.">
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
          <button type="submit" className="rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-semibold !text-white shadow-sm hover:bg-[#1832A8]">Filter</button>
        </form>

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total fixtures", value: filtered.length },
            { label: "Upcoming", value: upcoming.length, colour: "text-blue-700" },
            { label: "Played", value: past.length, colour: "text-green-700" },
            { label: "Cancelled", value: cancelled.length, colour: "text-red-600" },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-medium text-slate-500">{k.label}</div>
              <div className={`mt-2 text-3xl font-bold ${k.colour ?? "text-slate-950"}`}>{k.value}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {byMonthRows.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-slate-900">Fixtures by month</h3>
              <VBarChart rows={byMonthRows} colour="#1857E0" />
            </div>
          )}
          {byTeamRows.length > 1 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-slate-900">Fixtures by team</h3>
              <HBarChart rows={byTeamRows} colour="#6366f1" />
            </div>
          )}
        </div>

        {byTypeRows.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Fixtures by match type</h3>
            <HBarChart rows={byTypeRows} colour="#10b981" />
          </div>
        )}

        {/* Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-semibold text-slate-900">All fixtures ({filtered.length})</h3>
            <ExportButton data={filtered} filename="fixtures-summary.csv" columns={exportColumns} />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  {["Team", "Date", "Opponent", "H/A", "Type", "Status", "Score", "Avail", "Selected"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium text-slate-800">{f.teamName}</td>
                    <td className="px-4 py-2 text-slate-600">
                      {new Date(f.kickoffAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-2 text-slate-800">{f.opponent}</td>
                    <td className="px-4 py-2 uppercase text-slate-500">{f.homeAway}</td>
                    <td className="px-4 py-2 text-slate-500 capitalize">{f.matchType ?? "—"}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        f.status === "completed"      ? "bg-green-50 text-green-700" :
                        f.status === "cancelled"      ? "bg-red-50 text-red-600" :
                        f.status === "squad_selected" ? "bg-indigo-50 text-indigo-700" :
                        f.status === "fees_requested" ? "bg-amber-50 text-amber-700" :
                        "bg-blue-50 text-blue-700"
                      }`}>{f.status.replace("_", " ")}</span>
                    </td>
                    <td className="px-4 py-2 font-mono text-slate-700">
                      {f.homeScore != null && f.awayScore != null ? `${f.homeScore}–${f.awayScore}` : "—"}
                    </td>
                    <td className="px-4 py-2 text-slate-500">{f.availabilityResponses}</td>
                    <td className="px-4 py-2 text-slate-500">{f.selectionCount}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-400">No fixtures found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PortalLayout>
  )
}
