import Link from "next/link"
import { notFound } from "next/navigation"
import { CalendarDays, Users, Trophy, BarChart2, ListOrdered } from "lucide-react"
import { PortalLayout } from "@/components/portal-layout"
import { getCompetitionById, getCompetitionEntries, getCompetitionMatches } from "@/lib/api"
import { CompetitionStatusBadge } from "@/components/competition-status-badge"

export default async function CompetitionOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const competition = await getCompetitionById(id).catch(() => null)
  if (!competition) notFound()

  const [entries, matches] = await Promise.allSettled([
    getCompetitionEntries(id),
    getCompetitionMatches(id),
  ])

  const allEntries: any[] = entries.status === "fulfilled" ? entries.value : []
  const allMatches: any[] = matches.status === "fulfilled" ? matches.value : []

  const confirmedEntries = allEntries.filter((e: any) => e.status === "CONFIRMED").length
  const pendingEntries = allEntries.filter((e: any) => e.status === "PENDING").length
  const completedMatches = allMatches.filter((m: any) => m.status === "COMPLETED").length
  const pendingResults = allMatches.filter((m: any) => m.resultStatus === "SUBMITTED").length

  const division = competition.divisions?.[0]

  const navItems = [
    { label: "Entries", href: `/competitions/${id}/entries`, icon: Users, count: allEntries.length },
    { label: "Draw & Fixtures", href: `/competitions/${id}/draw`, icon: CalendarDays, count: allMatches.length },
    { label: "Results", href: `/competitions/${id}/fixtures`, icon: ListOrdered, count: completedMatches },
    { label: "Standings", href: `/competitions/${id}/standings`, icon: BarChart2 },
  ]

  return (
    <PortalLayout
      title={competition.name}
      description={competition.description ?? `${competition.sport} · ${competition.format}`}
    >
      <div className="space-y-6">
        {/* Status bar */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <CompetitionStatusBadge status={competition.status} />
          <span className="text-sm text-slate-500 capitalize">{competition.sport.replace(/_/g, " ")}</span>
          <span className="text-slate-300">·</span>
          <span className="text-sm text-slate-500">{competition.format.replace(/_/g, " ")}</span>
          <span className="text-slate-300">·</span>
          <span className="text-sm text-slate-500 capitalize">{competition.entryType.replace(/_/g, " ")}</span>
          {competition.season && (
            <>
              <span className="text-slate-300">·</span>
              <span className="text-sm text-slate-500">{competition.season}</span>
            </>
          )}
          <div className="ml-auto flex gap-2">
            {["DRAFT", "REGISTRATION_OPEN", "IN_PROGRESS", "COMPLETED"].map((status) => (
              competition.status !== status && (
                <form key={status} action={`/api/competitions/${id}`} method="POST">
                  <input type="hidden" name="_method" value="PATCH" />
                  <input type="hidden" name="status" value={status} />
                  <button type="submit" className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50">
                    → {status.replace(/_/g, " ")}
                  </button>
                </form>
              )
            ))}
          </div>
        </div>

        {/* KPI row */}
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: "Total entries", value: allEntries.length, sub: `${confirmedEntries} confirmed · ${pendingEntries} pending` },
            { label: "Matches played", value: completedMatches, sub: `${allMatches.length} total matches` },
            { label: "Pending results", value: pendingResults, sub: "Awaiting admin verification" },
            { label: "Divisions", value: competition.divisions?.length ?? 0, sub: competition.divisions?.map((d: any) => d.name).join(", ") },
          ].map(k => (
            <div key={k.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-medium text-slate-500">{k.label}</div>
              <div className="mt-2 text-3xl font-bold text-slate-950">{k.value}</div>
              <div className="mt-1 text-xs text-slate-400">{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Quick nav cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {navItems.map(item => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#1857E0]/30 hover:bg-blue-50/30 hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1857E0]/10">
                  <Icon className="h-5 w-5 text-[#1857E0]" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">{item.label}</div>
                  {item.count !== undefined && (
                    <div className="text-sm text-slate-500">{item.count} records</div>
                  )}
                </div>
                <div className="text-xs font-medium text-[#1857E0] opacity-0 transition group-hover:opacity-100">
                  Go →
                </div>
              </Link>
            )
          })}
        </div>

        {/* Divisions summary */}
        {competition.divisions?.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Divisions</h3>
            <div className="space-y-2">
              {competition.divisions.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <div>
                    <span className="font-medium text-slate-900">{d.name}</span>
                    {d.format && <span className="ml-2 text-xs text-slate-400">{d.format}</span>}
                  </div>
                  <div className="flex gap-3 text-sm text-slate-500">
                    <span>{d._count?.entries ?? 0} entries</span>
                    <span>{d._count?.matches ?? 0} matches</span>
                    <Link href={`/competitions/${id}/draw?divisionId=${d.id}`} className="text-xs font-medium text-[#1857E0] hover:text-[#1832A8]">
                      Draw →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  )
}
