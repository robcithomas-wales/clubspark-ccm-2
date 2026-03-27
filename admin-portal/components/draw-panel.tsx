"use client"

import { useState } from "react"
import { Shuffle, Trash2, RefreshCw } from "lucide-react"
import Link from "next/link"

interface Props {
  competitionId: string
  competition: any
  division: any
  initialMatches: any[]
  entries: any[]
}

const STATUS_COLOURS: Record<string, string> = {
  SCHEDULED: "bg-blue-50 text-blue-700",
  IN_PROGRESS: "bg-amber-50 text-amber-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  WALKOVER: "bg-slate-100 text-slate-600",
  BYE: "bg-slate-50 text-slate-400",
  POSTPONED: "bg-orange-50 text-orange-700",
  CANCELLED: "bg-red-50 text-red-600",
}

const RESULT_STATUS: Record<string, string> = {
  SUBMITTED: "bg-amber-100 text-amber-700",
  VERIFIED: "bg-emerald-100 text-emerald-700",
  DISPUTED: "bg-red-100 text-red-700",
}

export function DrawPanel({ competitionId, competition, division, initialMatches, entries }: Props) {
  const [matches, setMatches] = useState<any[]>(initialMatches)
  const [generating, setGenerating] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confirmedEntries = entries.filter(e => e.status === "CONFIRMED")
  const drawExists = matches.length > 0
  const rounds = [...new Set(matches.map(m => m.round))].sort((a, b) => a - b)

  async function generateDraw() {
    if (!division) return
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch(`/api/competitions/${competitionId}/draw?divisionId=${division.id}`, {
        method: "POST",
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? "Failed to generate draw")
      }
      // Refresh matches
      const r2 = await fetch(`/api/competitions/${competitionId}/matches?divisionId=${division.id}`)
      const json = await r2.json()
      setMatches(json.data ?? [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  async function resetDraw() {
    if (!division || !confirm("Reset draw? This will delete all matches and standings.")) return
    setResetting(true)
    setError(null)
    try {
      const res = await fetch(`/api/competitions/${competitionId}/draw?divisionId=${division.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to reset draw")
      setMatches([])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setResetting(false)
    }
  }

  const format = division?.format ?? competition.format

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Division selector */}
      {competition.divisions?.length > 1 && (
        <div className="flex gap-2">
          {competition.divisions.map((d: any) => (
            <Link
              key={d.id}
              href={`/competitions/${competitionId}/draw?divisionId=${d.id}`}
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

      {/* Control panel */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              {division?.name ?? "Draw"} — {format?.replace(/_/g, " ")}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {confirmedEntries.length} confirmed entries
              {drawExists && ` · ${matches.length} matches across ${rounds.length} round${rounds.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {drawExists ? (
              <button
                onClick={resetDraw}
                disabled={resetting}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                {resetting ? "Resetting…" : "Reset draw"}
              </button>
            ) : (
              <button
                onClick={generateDraw}
                disabled={generating || confirmedEntries.length < 2}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1832A8] disabled:opacity-60"
              >
                <Shuffle className="h-4 w-4" />
                {generating ? "Generating…" : "Generate draw"}
              </button>
            )}
          </div>
        </div>

        {!drawExists && confirmedEntries.length < 2 && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            At least 2 confirmed entries are required to generate a draw.{" "}
            <Link href={`/competitions/${competitionId}/entries`} className="font-medium underline">
              Go to Entries →
            </Link>
          </div>
        )}
      </div>

      {/* Match grid by round */}
      {drawExists && rounds.map(round => {
        const roundMatches = matches.filter(m => m.round === round)
        return (
          <div key={round} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-3">
              <h4 className="text-sm font-semibold text-slate-700">
                {format === "KNOCKOUT" ? roundLabel(round, rounds.length) : `Round ${round}`}
                <span className="ml-2 text-xs font-normal text-slate-400">{roundMatches.length} matches</span>
              </h4>
            </div>
            <div className="divide-y divide-slate-50">
              {roundMatches.map((match: any) => (
                <div key={match.id} className="flex items-center gap-4 px-6 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="w-5 text-right text-xs text-slate-400">{match.matchNumber}</span>
                      <span className={`font-medium text-slate-900 ${!match.homeEntry ? "text-slate-400 italic" : ""}`}>
                        {match.homeEntry?.displayName ?? "TBD"}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">vs</span>
                      <span className={`font-medium text-slate-900 ${!match.awayEntry ? "text-slate-400 italic" : ""}`}>
                        {match.awayEntry?.displayName ?? "TBD"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {match.score && (
                      <span className="text-sm font-semibold text-slate-700">
                        {formatScore(match.score, competition.sport)}
                      </span>
                    )}
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${match.resultStatus ? RESULT_STATUS[match.resultStatus] : STATUS_COLOURS[match.status]}`}>
                      {match.resultStatus ?? match.status}
                    </span>
                    <Link
                      href={`/competitions/${competitionId}/fixtures?matchId=${match.id}`}
                      className="text-xs font-medium text-[#1857E0] hover:text-[#1832A8]"
                    >
                      Result →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function roundLabel(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - round
  if (fromEnd === 0) return "Final"
  if (fromEnd === 1) return "Semi-finals"
  if (fromEnd === 2) return "Quarter-finals"
  return `Round of ${Math.pow(2, fromEnd + 1)}`
}

function formatScore(score: any, sport: string): string {
  if (!score) return ""
  if (score.sets && Array.isArray(score.sets)) {
    return score.sets.map((s: any) => `${s.home}-${s.away}`).join(", ")
  }
  if (score.home !== undefined && score.away !== undefined) {
    return `${score.home} – ${score.away}`
  }
  return JSON.stringify(score)
}
