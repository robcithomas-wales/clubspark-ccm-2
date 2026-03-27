import { PortalLayout } from "@/components/portal-layout"
import { ExportButton } from "@/components/reports/export-button"
import { HBarChart, DonutChart } from "@/components/reports/charts"
import {
  getAllCompetitionsForReport,
  getCompetitionEntriesForReport,
} from "@/lib/api"

const STATUS_COLOURS: Record<string, string> = {
  confirmed: "bg-emerald-50 text-emerald-700",
  pending:   "bg-amber-50 text-amber-700",
  withdrawn: "bg-slate-100 text-slate-500",
  rejected:  "bg-red-50 text-red-600",
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 2 }).format(v)
}

export default async function CompetitionEntriesReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const compFilter = typeof sp.competition === "string" ? sp.competition : "all"
  const statusFilter = typeof sp.status === "string" ? sp.status : "all"

  const competitions = await getAllCompetitionsForReport().catch(() => [] as any[])

  // Fetch all entries in parallel
  const entriesPerComp = await Promise.all(
    competitions.map((c: any) => getCompetitionEntriesForReport(c.id).catch(() => [] as any[]))
  )

  // Flatten with competition context
  const allEntries: any[] = []
  competitions.forEach((comp: any, i: number) => {
    const entries: any[] = entriesPerComp[i]
    for (const entry of entries) {
      const divName = comp.divisions?.find((d: any) => d.id === entry.divisionId)?.name ?? "—"
      allEntries.push({
        ...entry,
        competitionId: comp.id,
        competitionName: comp.name,
        sport: comp.sport,
        entryFee: comp.entryFee,
        divisionName: divName,
      })
    }
  })

  // Filter
  const filtered = allEntries.filter((e) => {
    if (compFilter !== "all" && e.competitionId !== compFilter) return false
    if (statusFilter !== "all" && e.status !== statusFilter) return false
    return true
  })

  // KPIs
  const totalEntries = filtered.length
  const confirmed = filtered.filter((e) => e.status === "confirmed").length
  const pending = filtered.filter((e) => e.status === "pending").length
  const withdrawn = filtered.filter((e) => e.status === "withdrawn" || e.status === "rejected").length

  const feeCollected = filtered
    .filter((e) => e.status === "confirmed")
    .reduce((s, e) => s + parseFloat(e.entryFee ?? "0"), 0)
  const feeOutstanding = filtered
    .filter((e) => e.status === "pending")
    .reduce((s, e) => s + parseFloat(e.entryFee ?? "0"), 0)

  // Charts
  const statusSlices = [
    { label: "Confirmed", value: confirmed },
    { label: "Pending", value: pending },
    { label: "Withdrawn / Rejected", value: withdrawn },
  ].filter((s) => s.value > 0)

  const byComp: Record<string, { name: string; count: number }> = {}
  for (const e of filtered) {
    if (!byComp[e.competitionId]) byComp[e.competitionId] = { name: e.competitionName, count: 0 }
    byComp[e.competitionId].count++
  }
  const compRows = Object.values(byComp)
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)
    .map((r) => ({ label: r.name, value: r.count }))

  const exportColumns = [
    { key: "competitionName", header: "Competition" },
    { key: "sport", header: "Sport" },
    { key: "divisionName", header: "Division" },
    { key: "displayName", header: "Entrant" },
    { key: "status", header: "Status" },
    { key: "entryFee", header: "Entry Fee (£)" },
    { key: "createdAt", header: "Submitted" },
  ]

  return (
    <PortalLayout
      title="Competition Entries"
      description="Entry status, fee collection, and entrant breakdown across all competitions."
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
            {["confirmed", "pending", "withdrawn", "rejected"].map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <button type="submit" className="rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-semibold !text-white shadow-sm hover:bg-[#1832A8]">
            Filter
          </button>
        </form>

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">Total entries</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{totalEntries}</div>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm">
            <div className="text-sm font-medium text-emerald-700">Confirmed</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{confirmed}</div>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm">
            <div className="text-sm font-medium text-amber-700">Pending</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{pending}</div>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
            <div className="text-sm font-medium text-emerald-700">Fees collected</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{formatCurrency(feeCollected)}</div>
            <div className="mt-1 text-xs text-slate-400">Confirmed entries</div>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm">
            <div className="text-sm font-medium text-amber-700">Fees outstanding</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{formatCurrency(feeOutstanding)}</div>
            <div className="mt-1 text-xs text-slate-400">Pending entries</div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid gap-6 xl:grid-cols-2">
          {statusSlices.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-slate-900">Entries by status</h3>
              <DonutChart slices={statusSlices} colours={["#10b981", "#f59e0b", "#64748b"]} />
            </div>
          )}
          {compRows.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-slate-900">Entries per competition</h3>
              <HBarChart rows={compRows} colour="#8b5cf6" />
            </div>
          )}
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-semibold text-slate-900">Entries ({filtered.length})</h3>
            <ExportButton data={filtered} filename="competition-entries.csv" columns={exportColumns} />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  {["Competition", "Division", "Entrant", "Status", "Entry Fee", "Submitted"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.slice(0, 200).map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-700">{e.competitionName}</td>
                    <td className="px-4 py-2 text-slate-500">{e.divisionName}</td>
                    <td className="px-4 py-2 font-medium text-slate-900">{e.displayName ?? "—"}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOURS[e.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {e.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {e.entryFee && Number(e.entryFee) > 0 ? `£${Number(e.entryFee).toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-2 text-slate-500">
                      {e.createdAt ? new Date(e.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">No entries found.</td></tr>
                )}
                {filtered.length > 200 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-3 text-center text-xs text-slate-400">
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
