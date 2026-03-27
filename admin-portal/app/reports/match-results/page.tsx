import { PortalLayout } from "@/components/portal-layout"
import { ExportButton } from "@/components/reports/export-button"
import { DonutChart } from "@/components/reports/charts"
import { getTeamReportFixtures, getTeams } from "@/lib/api"

export default async function MatchResultsReportPage({
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

  const played = filtered.filter((f) => f.homeScore != null && f.awayScore != null)
  const wins = played.filter((f) => f.result === "win").length
  const draws = played.filter((f) => f.result === "draw").length
  const losses = played.filter((f) => f.result === "loss").length
  const goalsFor = played.reduce((s, f) => {
    if (f.homeAway === "home") return s + (f.homeScore ?? 0)
    return s + (f.awayScore ?? 0)
  }, 0)
  const goalsAgainst = played.reduce((s, f) => {
    if (f.homeAway === "home") return s + (f.awayScore ?? 0)
    return s + (f.homeScore ?? 0)
  }, 0)

  const resultSlices = [
    { label: "Win", value: wins },
    { label: "Draw", value: draws },
    { label: "Loss", value: losses },
  ].filter((s) => s.value > 0)

  const seasons = Array.from(new Set(fixtures.map((f) => f.season).filter(Boolean))) as string[]

  const exportColumns = [
    { key: "teamName", header: "Team" },
    { key: "season", header: "Season" },
    { key: "opponent", header: "Opponent" },
    { key: "homeAway", header: "H/A" },
    { key: "kickoffAt", header: "Date" },
    { key: "matchType", header: "Type" },
    { key: "status", header: "Status" },
    { key: "homeScore", header: "Home" },
    { key: "awayScore", header: "Away" },
    { key: "result", header: "Result" },
  ]

  return (
    <PortalLayout title="Match Results" description="Scores and results across all teams and seasons.">
      <div className="space-y-6">

        {/* Filters */}
        <form className="flex flex-wrap gap-3">
          <select
            name="season"
            defaultValue={seasonFilter ?? ""}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:outline-none"
          >
            <option value="">All seasons</option>
            {seasons.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            name="team"
            defaultValue={teamFilter}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:outline-none"
          >
            <option value="all">All teams</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button type="submit" className="rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-semibold !text-white shadow-sm hover:bg-[#1832A8]">
            Filter
          </button>
        </form>

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: "Fixtures played", value: played.length },
            { label: "Wins", value: wins, colour: "text-green-700" },
            { label: "Draws", value: draws, colour: "text-amber-600" },
            { label: "Losses", value: losses, colour: "text-red-600" },
            { label: "Win rate", value: played.length > 0 ? `${Math.round((wins / played.length) * 100)}%` : "—" },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-medium text-slate-500">{k.label}</div>
              <div className={`mt-2 text-3xl font-bold ${k.colour ?? "text-slate-950"}`}>{k.value}</div>
            </div>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-5 shadow-sm">
            <div className="text-sm font-medium text-sky-700">Goals scored</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{goalsFor}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">Goals conceded</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{goalsAgainst}</div>
          </div>
        </div>

        {/* Donut */}
        {resultSlices.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Results breakdown</h3>
            <DonutChart slices={resultSlices} colours={["#10b981", "#f59e0b", "#ef4444"]} />
          </div>
        )}

        {/* Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-semibold text-slate-900">All fixtures ({filtered.length})</h3>
            <ExportButton data={filtered} filename="match-results.csv" columns={exportColumns} />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  {["Team", "Date", "Opponent", "H/A", "Score", "Result", "Type", "Status"].map((h) => (
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
                    <td className="px-4 py-2 uppercase text-slate-600">{f.homeAway}</td>
                    <td className="px-4 py-2 font-mono font-semibold text-slate-900">
                      {f.homeScore != null && f.awayScore != null ? `${f.homeScore} – ${f.awayScore}` : "—"}
                    </td>
                    <td className="px-4 py-2">
                      {f.result ? (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          f.result === "win"  ? "bg-green-50 text-green-700" :
                          f.result === "draw" ? "bg-amber-50 text-amber-700" :
                          "bg-red-50 text-red-600"
                        }`}>
                          {f.result.toUpperCase()}
                        </span>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-2 text-slate-600 capitalize">{f.matchType ?? "—"}</td>
                    <td className="px-4 py-2 text-slate-600">{f.status.replace("_", " ")}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-400">No fixtures found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PortalLayout>
  )
}
