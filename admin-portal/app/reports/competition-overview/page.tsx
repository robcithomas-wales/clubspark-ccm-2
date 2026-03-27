import { PortalLayout } from "@/components/portal-layout"
import { ExportButton } from "@/components/reports/export-button"
import { HBarChart, DonutChart, VBarChart } from "@/components/reports/charts"
import {
  getAllCompetitionsForReport,
  getCompetitionEntriesForReport,
} from "@/lib/api"

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  REGISTRATION_OPEN: "Open for entries",
  REGISTRATION_CLOSED: "Entries closed",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
}

const FORMAT_LABELS: Record<string, string> = {
  LEAGUE: "League",
  KNOCKOUT: "Knockout",
  ROUND_ROBIN: "Round Robin",
  GROUP_KNOCKOUT: "Group + Knockout",
  SWISS: "Swiss",
  LADDER: "Ladder",
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(v)
}

export default async function CompetitionOverviewReportPage() {
  const competitions = await getAllCompetitionsForReport().catch(() => [] as any[])

  // Fetch entries for every competition in parallel
  const entriesPerComp = await Promise.all(
    competitions.map((c: any) => getCompetitionEntriesForReport(c.id).catch(() => [] as any[]))
  )

  // Enrich each competition with entry aggregates
  const enriched = competitions.map((c: any, i: number) => {
    const entries: any[] = entriesPerComp[i]
    const confirmed = entries.filter((e) => e.status === "confirmed").length
    const pending = entries.filter((e) => e.status === "pending").length
    const withdrawn = entries.filter((e) => e.status === "withdrawn").length
    const feePerEntry = parseFloat(c.entryFee ?? "0")
    const feeRevenue = confirmed * feePerEntry
    return { ...c, entryCount: entries.length, confirmed, pending, withdrawn, feeRevenue }
  })

  // KPIs
  const totalComps = enriched.length
  const openForEntry = enriched.filter((c) => c.status === "REGISTRATION_OPEN").length
  const inProgress = enriched.filter((c) => c.status === "IN_PROGRESS").length
  const totalEntries = enriched.reduce((s, c) => s + c.entryCount, 0)
  const totalFeeRevenue = enriched.reduce((s, c) => s + c.feeRevenue, 0)

  // Charts
  const statusCounts: Record<string, number> = {}
  for (const c of enriched) {
    const label = STATUS_LABELS[c.status] ?? c.status
    statusCounts[label] = (statusCounts[label] ?? 0) + 1
  }
  const statusSlices = Object.entries(statusCounts).map(([label, value]) => ({ label, value }))

  const sportCounts: Record<string, number> = {}
  for (const c of enriched) {
    const s = (c.sport as string).charAt(0).toUpperCase() + (c.sport as string).slice(1)
    sportCounts[s] = (sportCounts[s] ?? 0) + 1
  }
  const sportRows = Object.entries(sportCounts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)

  const entryRows = [...enriched]
    .filter((c) => c.entryCount > 0)
    .sort((a, b) => b.entryCount - a.entryCount)
    .slice(0, 15)
    .map((c) => ({ label: c.name, value: c.entryCount }))

  const feeRows = enriched
    .filter((c) => c.feeRevenue > 0)
    .sort((a, b) => b.feeRevenue - a.feeRevenue)
    .map((c) => ({ label: c.name, value: Math.round(c.feeRevenue), valueFormatted: formatCurrency(c.feeRevenue) }))

  // Monthly entry rate (competitions starting by month)
  const byMonth: Record<string, number> = {}
  for (const c of enriched) {
    if (c.startDate) {
      const month = c.startDate.slice(0, 7)
      byMonth[month] = (byMonth[month] ?? 0) + 1
    }
  }
  const monthRows = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, value]) => ({ label: label.slice(5), value }))

  const exportColumns = [
    { key: "name", header: "Competition" },
    { key: "sport", header: "Sport" },
    { key: "format", header: "Format" },
    { key: "status", header: "Status" },
    { key: "season", header: "Season" },
    { key: "entryCount", header: "Total Entries" },
    { key: "confirmed", header: "Confirmed" },
    { key: "pending", header: "Pending" },
    { key: "withdrawn", header: "Withdrawn" },
    { key: "entryFee", header: "Entry Fee (£)" },
    { key: "feeRevenue", header: "Fee Revenue (£)" },
    { key: "startDate", header: "Start Date" },
    { key: "endDate", header: "End Date" },
  ]

  return (
    <PortalLayout
      title="Competition Overview"
      description="Status, entries, and fee revenue across all competitions."
    >
      <div className="space-y-6">

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: "Total competitions", value: totalComps, border: "border-slate-200", bg: "bg-white", text: "text-slate-500" },
            { label: "Open for entry", value: openForEntry, border: "border-emerald-200", bg: "bg-emerald-50/60", text: "text-emerald-700" },
            { label: "In progress", value: inProgress, border: "border-sky-200", bg: "bg-sky-50/60", text: "text-sky-700" },
            { label: "Total entries", value: totalEntries, border: "border-violet-200", bg: "bg-violet-50/50", text: "text-violet-700" },
          ].map((k) => (
            <div key={k.label} className={`rounded-2xl border ${k.border} ${k.bg} p-5 shadow-sm`}>
              <div className={`text-sm font-medium ${k.text}`}>{k.label}</div>
              <div className="mt-2 text-3xl font-bold text-slate-950">{k.value}</div>
            </div>
          ))}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm">
            <div className="text-sm font-medium text-amber-700">Entry fee revenue</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{formatCurrency(totalFeeRevenue)}</div>
            <div className="mt-1 text-xs text-slate-400">Confirmed entries only</div>
          </div>
        </div>

        {/* Status donut + Sport bar */}
        <div className="grid gap-6 xl:grid-cols-2">
          {statusSlices.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-slate-900">Competitions by status</h3>
              <DonutChart
                slices={statusSlices}
                colours={["#1857E0", "#10b981", "#f59e0b", "#64748b", "#8b5cf6", "#ef4444"]}
              />
            </div>
          )}
          {sportRows.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-slate-900">Competitions by sport</h3>
              <HBarChart rows={sportRows} colour="#1857E0" />
            </div>
          )}
        </div>

        {/* Entries per competition + fee revenue */}
        <div className="grid gap-6 xl:grid-cols-2">
          {entryRows.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-slate-900">Entries per competition</h3>
              <HBarChart rows={entryRows} colour="#8b5cf6" />
            </div>
          )}
          {feeRows.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-slate-900">Entry fee revenue by competition</h3>
              <HBarChart rows={feeRows} colour="#f59e0b" />
            </div>
          )}
        </div>

        {/* Competitions starting by month */}
        {monthRows.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Competitions starting by month</h3>
            <VBarChart rows={monthRows} colour="#1857E0" />
          </div>
        )}

        {/* Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-semibold text-slate-900">All competitions ({enriched.length})</h3>
            <ExportButton data={enriched} filename="competition-overview.csv" columns={exportColumns} />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  {["Competition", "Sport", "Format", "Status", "Entries", "Confirmed", "Entry Fee", "Fee Revenue", "Start Date"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {enriched.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium text-slate-900">{c.name}</td>
                    <td className="px-4 py-2 capitalize text-slate-600">{c.sport}</td>
                    <td className="px-4 py-2 text-slate-600">{FORMAT_LABELS[c.format] ?? c.format}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        c.status === "REGISTRATION_OPEN" ? "bg-emerald-50 text-emerald-700" :
                        c.status === "IN_PROGRESS" ? "bg-sky-50 text-sky-700" :
                        c.status === "COMPLETED" ? "bg-slate-100 text-slate-600" :
                        c.status === "CANCELLED" ? "bg-red-50 text-red-600" :
                        "bg-amber-50 text-amber-700"
                      }`}>
                        {STATUS_LABELS[c.status] ?? c.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-700">{c.entryCount}</td>
                    <td className="px-4 py-2 text-slate-700">{c.confirmed}</td>
                    <td className="px-4 py-2 text-slate-600">
                      {c.entryFee && Number(c.entryFee) > 0 ? `£${Number(c.entryFee).toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-2 font-semibold text-amber-700">
                      {c.feeRevenue > 0 ? formatCurrency(c.feeRevenue) : "—"}
                    </td>
                    <td className="px-4 py-2 text-slate-500">
                      {c.startDate ? new Date(c.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </td>
                  </tr>
                ))}
                {enriched.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-400">No competitions found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PortalLayout>
  )
}
