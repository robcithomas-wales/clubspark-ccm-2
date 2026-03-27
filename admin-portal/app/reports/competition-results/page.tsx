import { PortalLayout } from "@/components/portal-layout"
import { ExportButton } from "@/components/reports/export-button"
import { HBarChart, DonutChart, VBarChart } from "@/components/reports/charts"
import {
  getAllCompetitionsForReport,
  getCompetitionMatchesForReport,
} from "@/lib/api"

const RESULT_STATUS_LABELS: Record<string, string> = {
  pending:   "Pending",
  submitted: "Submitted",
  verified:  "Verified",
  disputed:  "Disputed",
}

const MATCH_STATUS_LABELS: Record<string, string> = {
  scheduled:  "Scheduled",
  in_progress: "In progress",
  completed:  "Completed",
  cancelled:  "Cancelled",
  postponed:  "Postponed",
  walkover:   "Walkover",
}

export default async function CompetitionResultsReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const compFilter = typeof sp.competition === "string" ? sp.competition : "all"
  const statusFilter = typeof sp.status === "string" ? sp.status : "all"

  const competitions = await getAllCompetitionsForReport().catch(() => [] as any[])

  // Fetch all matches in parallel
  const matchesPerComp = await Promise.all(
    competitions.map((c: any) => getCompetitionMatchesForReport(c.id).catch(() => [] as any[]))
  )

  // Flatten with competition context
  const allMatches: any[] = []
  competitions.forEach((comp: any, i: number) => {
    const matches: any[] = matchesPerComp[i]
    for (const match of matches) {
      allMatches.push({
        ...match,
        competitionId: comp.id,
        competitionName: comp.name,
        sport: comp.sport,
      })
    }
  })

  // Filter
  const filtered = allMatches.filter((m) => {
    if (compFilter !== "all" && m.competitionId !== compFilter) return false
    if (statusFilter !== "all" && m.status !== statusFilter) return false
    return true
  })

  // KPIs
  const totalMatches = filtered.length
  const completed = filtered.filter((m) => m.status === "completed").length
  const pending = filtered.filter((m) => m.status === "scheduled" || m.status === "in_progress").length
  const disputed = filtered.filter((m) => m.resultStatus === "disputed").length
  const completionRate = totalMatches > 0 ? Math.round((completed / totalMatches) * 100) : null

  // Charts — matches by result status
  const resultStatusCounts: Record<string, number> = {}
  for (const m of filtered) {
    const label = m.resultStatus
      ? (RESULT_STATUS_LABELS[m.resultStatus] ?? m.resultStatus)
      : m.status === "completed" ? "Verified" : (MATCH_STATUS_LABELS[m.status] ?? m.status)
    resultStatusCounts[label] = (resultStatusCounts[label] ?? 0) + 1
  }
  const resultSlices = Object.entries(resultStatusCounts).map(([label, value]) => ({ label, value }))

  // Matches per competition
  const byComp: Record<string, { name: string; total: number; completed: number }> = {}
  for (const m of filtered) {
    if (!byComp[m.competitionId]) byComp[m.competitionId] = { name: m.competitionName, total: 0, completed: 0 }
    byComp[m.competitionId].total++
    if (m.status === "completed") byComp[m.competitionId].completed++
  }
  const compRows = Object.values(byComp)
    .sort((a, b) => b.total - a.total)
    .slice(0, 12)
    .map((r) => ({ label: r.name, value: r.total, valueFormatted: `${r.total} (${r.completed} played)` }))

  // Matches by round for filtered competition (if single comp selected)
  const roundRows = compFilter !== "all"
    ? Object.entries(
        filtered.reduce<Record<number, number>>((acc, m) => {
          acc[m.round] = (acc[m.round] ?? 0) + 1
          return acc
        }, {})
      )
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([label, value]) => ({ label: `R${label}`, value: value as number }))
    : []

  const exportColumns = [
    { key: "competitionName", header: "Competition" },
    { key: "sport", header: "Sport" },
    { key: "round", header: "Round" },
    { key: "matchNumber", header: "Match #" },
    { key: "status", header: "Status" },
    { key: "resultStatus", header: "Result Status" },
    { key: "homeDisplayName", header: "Home" },
    { key: "awayDisplayName", header: "Away" },
    { key: "scoreHome", header: "Score (Home)" },
    { key: "scoreAway", header: "Score (Away)" },
  ]

  const exportData = filtered.map((m) => ({
    ...m,
    homeDisplayName: m.homeEntry?.displayName ?? "TBD",
    awayDisplayName: m.awayEntry?.displayName ?? "TBD",
    scoreHome: m.score?.home ?? "",
    scoreAway: m.score?.away ?? "",
  }))

  return (
    <PortalLayout
      title="Competition Results"
      description="Match outcomes, completion rates, and disputed results across all competitions."
    >
      <div className="space-y-6">

        {/* Filters */}
        <form className="flex flex-wrap gap-3">
          <select name="competition" defaultValue={compFilter} className="rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:outline-none">
            <option value="all">All competitions</option>
            {competitions.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select name="status" defaultValue={statusFilter} className="rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:outline-none">
            <option value="all">All statuses</option>
            {["scheduled", "completed", "cancelled", "postponed", "walkover"].map((s) => (
              <option key={s} value={s}>{MATCH_STATUS_LABELS[s] ?? s}</option>
            ))}
          </select>
          <button type="submit" className="rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-semibold !text-white shadow-sm hover:bg-[#1832A8]">
            Filter
          </button>
        </form>

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">Total matches</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{totalMatches}</div>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm">
            <div className="text-sm font-medium text-emerald-700">Completed</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{completed}</div>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm">
            <div className="text-sm font-medium text-amber-700">Pending / scheduled</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{pending}</div>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50/50 p-5 shadow-sm">
            <div className="text-sm font-medium text-red-700">Disputed</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{disputed}</div>
          </div>
          <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-5 shadow-sm">
            <div className="text-sm font-medium text-sky-700">Completion rate</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">
              {completionRate != null ? `${completionRate}%` : "—"}
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid gap-6 xl:grid-cols-2">
          {resultSlices.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-slate-900">Matches by status</h3>
              <DonutChart slices={resultSlices} colours={["#10b981", "#1857E0", "#f59e0b", "#ef4444", "#64748b"]} />
            </div>
          )}
          {compRows.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-slate-900">Matches per competition</h3>
              <HBarChart rows={compRows} colour="#1857E0" />
            </div>
          )}
        </div>

        {/* Per-round breakdown (single competition view) */}
        {roundRows.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Matches by round</h3>
            <VBarChart rows={roundRows} colour="#8b5cf6" />
          </div>
        )}

        {/* Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-semibold text-slate-900">Matches ({filtered.length})</h3>
            <ExportButton data={exportData} filename="competition-results.csv" columns={exportColumns} />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  {["Competition", "Round", "Home", "Score", "Away", "Status", "Result"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.slice(0, 200).map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-700">{m.competitionName}</td>
                    <td className="px-4 py-2 text-slate-500">{m.round}</td>
                    <td className={`px-4 py-2 ${m.winnerId && m.winnerId === m.homeEntry?.id ? "font-bold text-slate-900" : "text-slate-600"}`}>
                      {m.homeEntry?.displayName ?? "TBD"}
                    </td>
                    <td className="px-4 py-2 text-center font-mono font-semibold text-slate-800">
                      {m.score ? `${m.score.home} – ${m.score.away}` : "—"}
                    </td>
                    <td className={`px-4 py-2 ${m.winnerId && m.winnerId === m.awayEntry?.id ? "font-bold text-slate-900" : "text-slate-600"}`}>
                      {m.awayEntry?.displayName ?? "TBD"}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        m.status === "completed" ? "bg-emerald-50 text-emerald-700" :
                        m.status === "cancelled" ? "bg-red-50 text-red-600" :
                        "bg-amber-50 text-amber-700"
                      }`}>
                        {MATCH_STATUS_LABELS[m.status] ?? m.status}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {m.resultStatus ? (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          m.resultStatus === "verified" ? "bg-emerald-50 text-emerald-700" :
                          m.resultStatus === "disputed" ? "bg-red-50 text-red-600" :
                          "bg-slate-100 text-slate-600"
                        }`}>
                          {RESULT_STATUS_LABELS[m.resultStatus] ?? m.resultStatus}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">No matches found.</td></tr>
                )}
                {filtered.length > 200 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-3 text-center text-xs text-slate-400">
                      Showing 200 of {filtered.length} — export CSV for full data
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
