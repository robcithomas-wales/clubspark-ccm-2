"use client"

import { useState } from "react"
import { Users, Sparkles, TrendingUp } from "lucide-react"
import type { MatchResult, MatchCandidate } from "@/lib/api"

const SPORTS = ["tennis", "squash", "badminton", "table-tennis", "padel", "pickleball", "football", "rugby"]

function EloBar({ gap, hasElo }: { gap: number | null; hasElo: boolean }) {
  if (!hasElo || gap === null) return <span className="text-xs text-slate-400">No ELO</span>
  const pct = Math.round((1 - gap / 200) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-[#1857E0]" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-500">±{gap}</span>
    </div>
  )
}

export function PlayerMatchingPanel({ personId }: { personId: string }) {
  const [sport, setSport] = useState("tennis")
  const [result, setResult] = useState<MatchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  async function findMatches() {
    setLoading(true)
    setSearched(true)
    try {
      const res = await fetch(`/api/proxy/analytics/v1/match/${personId}?sport=${encodeURIComponent(sport)}`, { cache: "no-store" })
      if (res.ok) setResult(await res.json())
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-[#1857E0]" />
          <h3 className="text-base font-semibold text-slate-900">Player Matching</h3>
        </div>
      </div>

      <div className="px-6 py-5 space-y-4">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Sport</label>
            <select
              value={sport}
              onChange={e => setSport(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
            >
              {SPORTS.map(s => (
                <option key={s} value={s} className="capitalize">{s.replace(/-/g, " ")}</option>
              ))}
            </select>
          </div>
          <button
            onClick={findMatches}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1832A8] disabled:opacity-60"
          >
            <Sparkles className="h-4 w-4" />
            {loading ? "Searching…" : "Find matches"}
          </button>
        </div>

        {result && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                {result.hasElo
                  ? `Matched by ELO rating (${result.seeker.eloRating}) ± 200 points`
                  : "No ELO rating — showing active players by recent booking frequency"}
              </p>
              <span className="text-xs text-slate-400">{result.total} candidate{result.total !== 1 ? "s" : ""}</span>
            </div>

            {result.matches.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                No suitable matches found for this player and sport.
              </p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="hidden grid-cols-4 gap-4 border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:grid">
                  <div>Player</div>
                  <div>ELO</div>
                  <div>Recent activity</div>
                  <div>Match score</div>
                </div>
                <div className="divide-y divide-slate-100">
                  {result.matches.map((c: MatchCandidate, i) => (
                    <div key={c.personId} className="grid gap-3 px-4 py-3 sm:grid-cols-4 sm:items-center">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1857E0] text-xs font-bold text-white">{i + 1}</span>
                        <span className="text-sm font-medium text-slate-900">{c.displayName}</span>
                      </div>
                      <div>
                        {c.eloRating != null ? (
                          <div>
                            <span className="text-sm font-semibold text-slate-700">{c.eloRating}</span>
                            <EloBar gap={c.eloGap} hasElo={result.hasElo} />
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">No rating</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-sm text-slate-600">{c.recentBookingCount} bookings (60d)</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${c.matchScore}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-slate-700">{c.matchScore}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {searched && !result && !loading && (
          <p className="text-sm text-slate-400">No data returned. This person may not be in the system or no matching players exist.</p>
        )}
      </div>
    </div>
  )
}
