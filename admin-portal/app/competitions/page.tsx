import Link from "next/link"
import { Plus, Trophy } from "lucide-react"
import { PortalLayout } from "@/components/portal-layout"
import { getCompetitions } from "@/lib/api"

const FORMAT_LABELS: Record<string, string> = {
  LEAGUE: "League",
  KNOCKOUT: "Knockout",
  ROUND_ROBIN: "Round Robin",
  GROUP_KNOCKOUT: "Group + Knockout",
  SWISS: "Swiss",
  LADDER: "Ladder",
}

const STATUS_COLOURS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600 ring-slate-500/20",
  REGISTRATION_OPEN: "bg-blue-50 text-blue-700 ring-blue-600/20",
  IN_PROGRESS: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  COMPLETED: "bg-slate-100 text-slate-600 ring-slate-500/20",
  ARCHIVED: "bg-slate-100 text-slate-500 ring-slate-400/20",
}

export default async function CompetitionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; sport?: string }>
}) {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)

  let result: { data: any[]; pagination: any } = { data: [], pagination: { total: 0 } }
  try {
    result = await getCompetitions(page, 25, { status: sp.status, sport: sp.sport })
  } catch {}

  const { data: competitions, pagination } = result

  return (
    <PortalLayout
      title="Competitions"
      description="Manage leagues, knockout draws, round-robins and more across all sports."
    >
      <div className="space-y-6">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">All Competitions</h2>
              <p className="mt-1 text-sm text-slate-500">{pagination?.total ?? 0} competitions</p>
            </div>
            <Link
              href="/competitions/new"
              className="inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-semibold !text-white shadow-sm transition hover:bg-[#1832A8]"
            >
              <Plus className="h-4 w-4 !text-white" />
              New competition
            </Link>
          </div>

          {/* Filters */}
          <form className="flex flex-wrap gap-3 border-b border-slate-100 px-6 py-3">
            <select
              name="status"
              defaultValue={sp.status ?? ""}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-[#1857E0]"
            >
              <option value="">All statuses</option>
              {["DRAFT", "REGISTRATION_OPEN", "IN_PROGRESS", "COMPLETED", "ARCHIVED"].map(s => (
                <option key={s} value={s}>{FORMAT_LABELS[s] ?? s.replace(/_/g, " ")}</option>
              ))}
            </select>
            <select
              name="sport"
              defaultValue={sp.sport ?? ""}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-[#1857E0]"
            >
              <option value="">All sports</option>
              {["tennis", "football", "squash", "padel", "badminton", "hockey", "netball", "cricket", "basketball", "rugby_union"].map(s => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
            <button type="submit" className="rounded-xl bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200">
              Filter
            </button>
          </form>

          {competitions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Trophy className="h-10 w-10 text-slate-300" />
              <p className="text-sm text-slate-500">No competitions yet.</p>
              <Link
                href="/competitions/new"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-semibold !text-white transition hover:bg-[#1832A8]"
              >
                <Plus className="h-4 w-4 !text-white" /> Create first competition
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  <th className="px-6 py-3">Competition</th>
                  <th className="px-6 py-3">Sport</th>
                  <th className="px-6 py-3">Format</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Entries</th>
                  <th className="px-6 py-3">Season</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {competitions.map((c: any) => (
                  <tr key={c.id} className="transition hover:bg-slate-50/60">
                    <td className="px-6 py-4 font-medium text-slate-900">{c.name}</td>
                    <td className="px-6 py-4 capitalize text-slate-600">{c.sport.replace(/_/g, " ")}</td>
                    <td className="px-6 py-4 text-slate-600">{FORMAT_LABELS[c.format] ?? c.format}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${STATUS_COLOURS[c.status] ?? "bg-slate-100 text-slate-600 ring-slate-500/20"}`}>
                        {c.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{c._count?.entries ?? 0}</td>
                    <td className="px-6 py-4 text-slate-500">{c.season ?? "—"}</td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/competitions/${c.id}`} className="text-xs font-medium text-[#1857E0] transition hover:text-[#1832A8]">
                        Manage →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </PortalLayout>
  )
}
