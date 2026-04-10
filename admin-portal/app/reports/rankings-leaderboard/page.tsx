import { PortalLayout } from "@/components/portal-layout"
import { ExportButton } from "@/components/reports/export-button"
import { getRankingConfigs, getRankingLeaderboard } from "@/lib/api"
import { ArrowDown, ArrowUp, Minus, Trophy } from "lucide-react"
import Link from "next/link"

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-yellow-400 text-xs font-bold text-yellow-900">1</span>
  )
  if (rank === 2) return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-300 text-xs font-bold text-slate-700">2</span>
  )
  if (rank === 3) return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white">3</span>
  )
  return <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">{rank}</span>
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

export default async function RankingsLeaderboardReportPage() {
  const configs = await getRankingConfigs().catch(() => [] as any[])

  // Fetch leaderboard for every config in parallel
  const leaderboards = await Promise.all(
    configs.map((c: any) => getRankingLeaderboard(c.id, 100).catch(() => ({ config: c, data: [], total: 0 })))
  )

  // Combine configs with their leaderboard data
  const enriched = configs.map((c: any, i: number) => ({
    config: c,
    entries: leaderboards[i]?.data ?? [],
    total: leaderboards[i]?.total ?? 0,
  }))

  // Aggregate KPIs
  const totalConfigs = configs.length
  const totalRankedEntries = enriched.reduce((s, e) => s + e.total, 0)
  const eloConfigs = enriched.filter((e) => e.config.algorithm === "ELO")
  const pointsConfigs = enriched.filter((e) => e.config.algorithm === "POINTS_TABLE")

  // Top movers across all ELO configs
  const allEloEntries = eloConfigs.flatMap((e) => e.entries.map((en: any) => ({ ...en, sport: e.config.sport })))
  const topRisers = [...allEloEntries]
    .filter((e: any) => (e.rankChange ?? 0) > 0)
    .sort((a: any, b: any) => (b.rankChange ?? 0) - (a.rankChange ?? 0))
    .slice(0, 5)
  const topFallers = [...allEloEntries]
    .filter((e: any) => (e.rankChange ?? 0) < 0)
    .sort((a: any, b: any) => (a.rankChange ?? 0) - (b.rankChange ?? 0))
    .slice(0, 5)

  // ELO distribution buckets for histogram (across all ELO configs)
  const eloBuckets: Record<string, number> = {
    "<800": 0, "800–899": 0, "900–999": 0, "1000–1099": 0,
    "1100–1199": 0, "1200–1299": 0, "1300+": 0,
  }
  for (const e of allEloEntries) {
    const r = e.eloRating ?? 1000
    if (r < 800) eloBuckets["<800"]++
    else if (r < 900) eloBuckets["800–899"]++
    else if (r < 1000) eloBuckets["900–999"]++
    else if (r < 1100) eloBuckets["1000–1099"]++
    else if (r < 1200) eloBuckets["1100–1199"]++
    else if (r < 1300) eloBuckets["1200–1299"]++
    else eloBuckets["1300+"]++
  }
  const maxBucketVal = Math.max(...Object.values(eloBuckets), 1)

  // Win rate data for top 10 across all configs
  const topByWinRate = allEloEntries
    .filter((e: any) => (e.matchesPlayed ?? 0) >= 3)
    .map((e: any) => ({
      ...e,
      winRate: e.matchesPlayed > 0 ? Math.round((e.wins / e.matchesPlayed) * 100) : 0,
    }))
    .sort((a: any, b: any) => b.winRate - a.winRate)
    .slice(0, 10)

  const CHART_H = 80

  return (
    <PortalLayout
      title="Rankings Leaderboard"
      description="Ranked standings, ELO distribution and form analysis across all ranking configs."
    >
      <div id="report-root" className="space-y-6">
        <div className="flex items-center justify-between">
          <div />
          <ExportButton />
        </div>

        {/* KPI row */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Rating Configs", value: totalConfigs },
            { label: "Total Rated Entries", value: totalRankedEntries },
            { label: "ELO Configs", value: eloConfigs.length },
            { label: "Points Table Configs", value: pointsConfigs.length },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
              <div className="mt-2 text-3xl font-bold text-slate-950">{value}</div>
            </div>
          ))}
        </div>

        {totalConfigs === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <Trophy className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <h3 className="text-base font-semibold text-slate-700">No rating configs yet</h3>
            <p className="mt-2 text-sm text-slate-500">
              Create a rating config to start tracking player and team ratings.
            </p>
            <Link
              href="/rankings/new"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1245b5]"
            >
              Create your first rating config
            </Link>
          </div>
        )}

        {/* ELO Distribution histogram */}
        {allEloEntries.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-900">ELO Rating Distribution</h2>
              <p className="mt-1 text-sm text-slate-500">
                How players are spread across rating bands. Starting rating is 1,000.
              </p>
            </div>
            <div className="px-6 py-5">
              <div className="flex items-end gap-2">
                {Object.entries(eloBuckets).map(([label, count]) => {
                  const barH = Math.max(4, Math.round((count / maxBucketVal) * CHART_H))
                  return (
                    <div key={label} className="flex flex-1 flex-col items-center gap-1">
                      <div className="text-xs font-semibold text-slate-700">{count > 0 ? count : ""}</div>
                      <div
                        className="w-full rounded-t-md bg-[#1857E0]"
                        style={{ height: barH, opacity: count === 0 ? 0.15 : 0.85 }}
                      />
                      <div className="text-[10px] text-slate-500 text-center leading-tight">{label}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Rank movers */}
        {(topRisers.length > 0 || topFallers.length > 0) && (
          <div className="grid gap-6 xl:grid-cols-2">
            {topRisers.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-6 py-4">
                  <h2 className="text-base font-semibold text-slate-900">Biggest Risers</h2>
                  <p className="mt-1 text-sm text-slate-500">Players who have moved up the most positions.</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {topRisers.map((e: any) => (
                    <div key={e.id} className="flex items-center gap-4 px-6 py-3">
                      <RankBadge rank={e.rank ?? 0} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-slate-900">{e.displayName}</div>
                        <div className="text-xs capitalize text-slate-500">{e.sport} · ELO {e.eloRating}</div>
                      </div>
                      <RankChange change={e.rankChange} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {topFallers.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-6 py-4">
                  <h2 className="text-base font-semibold text-slate-900">Biggest Fallers</h2>
                  <p className="mt-1 text-sm text-slate-500">Players who have dropped the most positions.</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {topFallers.map((e: any) => (
                    <div key={e.id} className="flex items-center gap-4 px-6 py-3">
                      <RankBadge rank={e.rank ?? 0} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-slate-900">{e.displayName}</div>
                        <div className="text-xs capitalize text-slate-500">{e.sport} · ELO {e.eloRating}</div>
                      </div>
                      <RankChange change={e.rankChange} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Win rate leaders */}
        {topByWinRate.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-900">Win Rate Leaders</h2>
              <p className="mt-1 text-sm text-slate-500">Players with the highest win rate (minimum 3 matches played).</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Rank</th>
                    <th className="px-4 py-3 text-left">Player</th>
                    <th className="px-4 py-3 text-left">Sport</th>
                    <th className="px-4 py-3 text-right">ELO</th>
                    <th className="px-4 py-3 text-right">Played</th>
                    <th className="px-4 py-3 text-right">W</th>
                    <th className="px-4 py-3 text-right">D</th>
                    <th className="px-4 py-3 text-right">L</th>
                    <th className="px-4 py-3 text-right">Win %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topByWinRate.map((e: any) => (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3"><RankBadge rank={e.rank ?? 0} /></td>
                      <td className="px-4 py-3 font-medium text-slate-900">{e.displayName}</td>
                      <td className="px-4 py-3 capitalize text-slate-500">{e.sport}</td>
                      <td className="px-4 py-3 text-right font-bold text-[#1857E0]">{e.eloRating}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{e.matchesPlayed}</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-700">{e.wins}</td>
                      <td className="px-4 py-3 text-right text-slate-500">{e.draws}</td>
                      <td className="px-4 py-3 text-right text-rose-600">{e.losses}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${e.winRate >= 70 ? "text-emerald-700" : e.winRate >= 50 ? "text-[#1857E0]" : "text-slate-600"}`}>
                          {e.winRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Per-config leaderboard tables */}
        {enriched.map(({ config, entries, total }) => (
          <div key={config.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold capitalize text-slate-900">
                  {config.sport} — {config.algorithm === "ELO" ? "ELO Rating" : "Points Table"}
                  {config.scope === "SEASON" ? ` (${config.season ?? "Season"})` : config.scope === "ALL_TIME" ? " (All-time)" : " (Competition)"}
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">{total} rated {config.entryType === "TEAM" ? "teams" : "players"}</p>
              </div>
              <Link
                href={`/rankings?config=${config.id}`}
                className="text-sm font-medium text-[#1857E0] hover:underline"
              >
                View live →
              </Link>
            </div>
            {entries.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-slate-400">
                No entries yet. Ratings update automatically when match results are verified.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Rank</th>
                      <th className="px-4 py-3 text-left">Δ</th>
                      <th className="px-4 py-3 text-left">Name</th>
                      {config.algorithm === "ELO" ? (
                        <>
                          <th className="px-4 py-3 text-right">ELO</th>
                          <th className="px-4 py-3 text-right">P</th>
                          <th className="px-4 py-3 text-right">W</th>
                          <th className="px-4 py-3 text-right">D</th>
                          <th className="px-4 py-3 text-right">L</th>
                          <th className="px-4 py-3 text-left">Status</th>
                        </>
                      ) : (
                        <>
                          <th className="px-4 py-3 text-right">Pts</th>
                          <th className="px-4 py-3 text-right">P</th>
                          <th className="px-4 py-3 text-right">W</th>
                          <th className="px-4 py-3 text-right">D</th>
                          <th className="px-4 py-3 text-right">L</th>
                          <th className="px-4 py-3 text-right">GD</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {entries.slice(0, 20).map((e: any) => (
                      <tr key={e.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3"><RankBadge rank={e.rank ?? 0} /></td>
                        <td className="px-4 py-3"><RankChange change={e.rankChange} /></td>
                        <td className="px-4 py-3 font-medium text-slate-900">{e.displayName}</td>
                        {config.algorithm === "ELO" ? (
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
                            <td className={`px-4 py-3 text-right font-semibold ${e.goalDifference > 0 ? "text-emerald-700" : e.goalDifference < 0 ? "text-rose-600" : "text-slate-500"}`}>
                              {e.goalDifference > 0 ? `+${e.goalDifference}` : e.goalDifference}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {total > 20 && (
                  <div className="border-t border-slate-100 px-6 py-3 text-sm text-slate-400">
                    Showing top 20 of {total} — <Link href={`/rankings?config=${config.id}`} className="text-[#1857E0] hover:underline">view all ratings</Link>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

      </div>
    </PortalLayout>
  )
}
