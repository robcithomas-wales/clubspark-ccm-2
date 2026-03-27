import { notFound } from "next/navigation"
import Link from "next/link"
import { PortalLayout } from "@/components/portal-layout"
import { getCompetitionById, getStandings } from "@/lib/api"

function TrendIcon({ pos, prev }: { pos: number; prev?: number | null }) {
  if (!prev || pos === prev) return <span className="text-slate-300">—</span>
  if (pos < prev) return <span className="text-emerald-500">▲</span>
  return <span className="text-red-500">▼</span>
}

export default async function StandingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ divisionId?: string }>
}) {
  const { id } = await params
  const sp = await searchParams

  const competition = await getCompetitionById(id).catch(() => null)
  if (!competition) notFound()

  const division = sp.divisionId
    ? competition.divisions?.find((d: any) => d.id === sp.divisionId)
    : competition.divisions?.[0]

  const standings = division ? await getStandings(id, division.id).catch(() => []) : []

  const sport = competition.sport
  const showGoalDiff = ["football", "hockey", "netball", "basketball", "rugby_union"].includes(sport)
  const pointsLabel = ["tennis", "padel", "squash", "badminton"].includes(sport) ? "W" : "Pts"

  return (
    <PortalLayout
      title={`${competition.name} — Standings`}
      description="Live league table, updated automatically when results are verified."
    >
      <div className="space-y-6">
        {/* Division tabs */}
        {competition.divisions?.length > 1 && (
          <div className="flex gap-2">
            {competition.divisions.map((d: any) => (
              <Link
                key={d.id}
                href={`/competitions/${id}/standings?divisionId=${d.id}`}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                  d.id === division?.id
                    ? "border-[#1857E0] bg-[#1857E0] text-white"
                    : "border-slate-200 text-slate-700 hover:border-slate-300"
                }`}
              >
                {d.name}
              </Link>
            ))}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-semibold text-slate-900">{division?.name ?? "Standings"}</h3>
            <p className="mt-1 text-xs text-slate-400 capitalize">{sport.replace(/_/g, " ")} · {competition.format.replace(/_/g, " ")}</p>
          </div>

          {standings.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-slate-400">
              Standings will appear here once results are verified.{" "}
              <Link href={`/competitions/${id}/fixtures`} className="text-[#1857E0] hover:underline">Enter results →</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left w-8">#</th>
                    <th className="px-4 py-3 text-left w-8"></th>
                    <th className="px-4 py-3 text-left">Entry</th>
                    <th className="px-4 py-3 text-center">P</th>
                    <th className="px-4 py-3 text-center">W</th>
                    <th className="px-4 py-3 text-center">D</th>
                    <th className="px-4 py-3 text-center">L</th>
                    {showGoalDiff && (
                      <>
                        <th className="px-4 py-3 text-center">F</th>
                        <th className="px-4 py-3 text-center">A</th>
                        <th className="px-4 py-3 text-center">GD</th>
                      </>
                    )}
                    <th className="px-4 py-3 text-center font-bold">{pointsLabel}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {standings.map((row: any, i: number) => (
                    <tr key={row.id} className={`hover:bg-slate-50 ${i === 0 ? "bg-emerald-50/30" : ""}`}>
                      <td className="px-4 py-3 text-center font-semibold text-slate-700">{row.position}</td>
                      <td className="px-4 py-3 text-center text-xs">
                        <TrendIcon pos={row.position} prev={row.previousPosition} />
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">{row.entry?.displayName ?? "—"}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{row.played}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{row.won}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{row.drawn}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{row.lost}</td>
                      {showGoalDiff && (
                        <>
                          <td className="px-4 py-3 text-center text-slate-600">{Number(row.pointsFor)}</td>
                          <td className="px-4 py-3 text-center text-slate-600">{Number(row.pointsAgainst)}</td>
                          <td className={`px-4 py-3 text-center font-medium ${Number(row.pointsDifference) > 0 ? "text-emerald-600" : Number(row.pointsDifference) < 0 ? "text-red-600" : "text-slate-500"}`}>
                            {Number(row.pointsDifference) > 0 ? "+" : ""}{Number(row.pointsDifference)}
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3 text-center font-bold text-slate-900">{Number(row.points)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  )
}
