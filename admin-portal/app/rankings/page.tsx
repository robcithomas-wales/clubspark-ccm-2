import Link from "next/link"
import { PortalLayout } from "@/components/portal-layout"
import { getRankingConfigs, getRankingLeaderboard } from "@/lib/api"
import { ArrowDown, ArrowUp, Minus, Plus, Trophy } from "lucide-react"

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-yellow-400 text-xs font-bold text-yellow-900">1</span>
  )
  if (rank === 2) return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-300 text-xs font-bold text-slate-700">2</span>
  )
  if (rank === 3) return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white">3</span>
  )
  return <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">{rank}</span>
}

function RankChange({ change }: { change: number | null }) {
  if (change == null || change === 0) return <Minus className="h-3.5 w-3.5 text-slate-400" />
  if (change > 0) return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600">
      <ArrowUp className="h-3 w-3" />{change}
    </span>
  )
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-rose-500">
      <ArrowDown className="h-3 w-3" />{Math.abs(change)}
    </span>
  )
}

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const configs = await getRankingConfigs()
  const selectedConfigId = sp.config ?? configs[0]?.id ?? null

  const leaderboardData = selectedConfigId
    ? await getRankingLeaderboard(selectedConfigId)
    : null

  const selectedConfig = leaderboardData?.config ?? configs.find((c: any) => c.id === selectedConfigId) ?? null
  const entries: any[] = leaderboardData?.data ?? []
  const isElo = selectedConfig?.algorithm === 'ELO'

  const sports = Array.from(new Set(configs.map((c: any) => c.sport))) as string[]

  return (
    <PortalLayout title="Rankings" description="Player and team rankings derived from verified match results.">
      <div className="space-y-6">

        {/* Top bar: config picker + create link */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {configs.map((c: any) => (
              <Link
                key={c.id}
                href={`/rankings?config=${c.id}`}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition ${
                  c.id === selectedConfigId
                    ? "border-[#1857E0] bg-[#1857E0] text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-[#1857E0]/30 hover:text-[#1857E0]"
                }`}
              >
                {c.sport} · {c.scope === 'ALL_TIME' ? 'All-time' : c.scope === 'SEASON' ? c.season ?? 'Season' : 'Competition'} · {c.algorithm === 'ELO' ? 'ELO' : 'Points'}
              </Link>
            ))}
            {configs.length === 0 && (
              <p className="text-sm text-slate-500">No ranking configs yet. Create one to get started.</p>
            )}
          </div>
          <Link
            href="/rankings/new"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#1857E0]/20 bg-[#1857E0]/5 px-3 py-2 text-sm font-medium text-[#1857E0] transition hover:bg-[#1857E0]/10"
          >
            <Plus className="h-4 w-4" />
            New Config
          </Link>
        </div>

        {/* Config summary */}
        {selectedConfig && (
          <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Sport</div>
              <div className="mt-0.5 font-semibold capitalize text-slate-900">{selectedConfig.sport}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Algorithm</div>
              <div className="mt-0.5 font-semibold text-slate-900">{selectedConfig.algorithm === 'ELO' ? 'ELO Rating' : 'Points Table'}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Scope</div>
              <div className="mt-0.5 font-semibold text-slate-900">
                {selectedConfig.scope === 'ALL_TIME' ? 'All-time' : selectedConfig.scope === 'SEASON' ? `Season: ${selectedConfig.season}` : 'Competition'}
              </div>
            </div>
            {!isElo && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Points per win</div>
                <div className="mt-0.5 font-semibold text-slate-900">{selectedConfig.pointsPerWin}</div>
              </div>
            )}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ranked entries</div>
              <div className="mt-0.5 font-semibold text-slate-900">{leaderboardData?.total ?? 0}</div>
            </div>
          </div>
        )}

        {/* Leaderboard table */}
        {selectedConfig ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-900">
                {selectedConfig.sport.charAt(0).toUpperCase() + selectedConfig.sport.slice(1)} Rankings
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Rank</th>
                    <th className="px-4 py-3 text-left">Δ</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    {isElo ? (
                      <>
                        <th className="px-4 py-3 text-right">ELO</th>
                        <th className="px-4 py-3 text-right">Played</th>
                        <th className="px-4 py-3 text-right">W</th>
                        <th className="px-4 py-3 text-right">D</th>
                        <th className="px-4 py-3 text-right">L</th>
                        <th className="px-4 py-3 text-left">Status</th>
                      </>
                    ) : (
                      <>
                        <th className="px-4 py-3 text-right">Pts</th>
                        <th className="px-4 py-3 text-right">Played</th>
                        <th className="px-4 py-3 text-right">W</th>
                        <th className="px-4 py-3 text-right">D</th>
                        <th className="px-4 py-3 text-right">L</th>
                        <th className="px-4 py-3 text-right">GF</th>
                        <th className="px-4 py-3 text-right">GA</th>
                        <th className="px-4 py-3 text-right">GD</th>
                      </>
                    )}
                    <th className="px-4 py-3 text-left">Last match</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={isElo ? 9 : 10} className="px-4 py-8 text-center text-sm text-slate-400">
                        No entries yet. Rankings update automatically when match results are verified.
                      </td>
                    </tr>
                  ) : (
                    entries.map((e: any) => (
                      <tr key={e.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <RankBadge rank={e.rank ?? 0} />
                        </td>
                        <td className="px-4 py-3">
                          <RankChange change={e.rankChange} />
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">{e.displayName}</td>
                        {isElo ? (
                          <>
                            <td className="px-4 py-3 text-right font-bold text-[#1857E0]">{e.eloRating}</td>
                            <td className="px-4 py-3 text-right text-slate-600">{e.matchesPlayed}</td>
                            <td className="px-4 py-3 text-right font-semibold text-emerald-700">{e.wins}</td>
                            <td className="px-4 py-3 text-right text-slate-500">{e.draws}</td>
                            <td className="px-4 py-3 text-right text-rose-600">{e.losses}</td>
                            <td className="px-4 py-3">
                              {e.eloProvisional ? (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Provisional</span>
                              ) : (
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Rated</span>
                              )}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3 text-right font-bold text-[#1857E0]">{e.points}</td>
                            <td className="px-4 py-3 text-right text-slate-600">{e.matchesPlayed}</td>
                            <td className="px-4 py-3 text-right font-semibold text-emerald-700">{e.wins}</td>
                            <td className="px-4 py-3 text-right text-slate-500">{e.draws}</td>
                            <td className="px-4 py-3 text-right text-rose-600">{e.losses}</td>
                            <td className="px-4 py-3 text-right text-slate-600">{e.goalsFor}</td>
                            <td className="px-4 py-3 text-right text-slate-600">{e.goalsAgainst}</td>
                            <td className={`px-4 py-3 text-right font-semibold ${e.goalDifference > 0 ? "text-emerald-700" : e.goalDifference < 0 ? "text-rose-600" : "text-slate-500"}`}>
                              {e.goalDifference > 0 ? `+${e.goalDifference}` : e.goalDifference}
                            </td>
                          </>
                        )}
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {e.lastMatchAt
                            ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(new Date(e.lastMatchAt))
                            : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <Trophy className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <h3 className="text-base font-semibold text-slate-700">No ranking configs yet</h3>
            <p className="mt-2 text-sm text-slate-500">
              Create a ranking config to start tracking player and team ratings across competitions.
            </p>
            <Link
              href="/rankings/new"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1245b5]"
            >
              <Plus className="h-4 w-4" />
              Create your first ranking config
            </Link>
          </div>
        )}

        {/* How it works */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-6">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">How rankings work</h3>
          <div className="grid gap-3 text-xs text-slate-600 sm:grid-cols-2">
            <div>
              <span className="font-semibold text-slate-800">ELO Rating</span> — Used for individual sports (tennis, squash, padel). Ratings update after every verified result. Win against a higher-rated opponent = bigger gain. Starting rating is 1,000. Entries with fewer than 5 matches are marked provisional.
            </div>
            <div>
              <span className="font-semibold text-slate-800">Points Table</span> — Used for team sports (football, hockey, etc.). Win = 3pts, draw = 1pt, loss = 0pts (configurable). Ranked by points, then goal difference, then goals scored. Updates automatically when results are verified.
            </div>
          </div>
        </div>

      </div>
    </PortalLayout>
  )
}
