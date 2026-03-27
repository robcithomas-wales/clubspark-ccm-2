"use client"

import { useState } from "react"
import { CheckCircle2, AlertCircle, Clock } from "lucide-react"

interface Props {
  competitionId: string
  competition: any
  initialMatches: any[]
  focusMatchId?: string
}

const RESULT_BADGE: Record<string, { colour: string; label: string }> = {
  SUBMITTED: { colour: "bg-amber-50 text-amber-700 ring-amber-600/20", label: "Submitted — needs verification" },
  VERIFIED: { colour: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", label: "Verified" },
  DISPUTED: { colour: "bg-red-50 text-red-700 ring-red-600/20", label: "Disputed" },
}

export function FixturesPanel({ competitionId, competition, initialMatches, focusMatchId }: Props) {
  const [matches, setMatches] = useState<any[]>(initialMatches)
  const [activeMatch, setActiveMatch] = useState<string | null>(focusMatchId ?? null)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resultForm, setResultForm] = useState<Record<string, { homeScore: string; awayScore: string; winnerId: string; notes: string }>>({})

  const sport = competition.sport
  const isSetsSport = ["tennis", "padel"].includes(sport)
  const isGamesSport = ["squash", "badminton"].includes(sport)

  function getForm(matchId: string) {
    return resultForm[matchId] ?? { homeScore: "", awayScore: "", winnerId: "", notes: "" }
  }

  function setForm(matchId: string, field: string, value: string) {
    setResultForm(prev => ({ ...prev, [matchId]: { ...getForm(matchId), [field]: value } }))
  }

  async function submitResult(match: any, adminVerify: boolean) {
    const form = getForm(match.id)
    if (!form.homeScore && !form.awayScore && !form.winnerId) return

    setSaving(match.id)
    setError(null)
    try {
      const homeScore = Number(form.homeScore) || 0
      const awayScore = Number(form.awayScore) || 0
      const winnerId = form.winnerId || (homeScore > awayScore ? match.homeEntryId : homeScore < awayScore ? match.awayEntryId : undefined)
      const sportMatchPoints = sport === "football" || sport === "hockey" || sport === "netball" ? { win: 3, draw: 1, loss: 0 } : { win: 1, draw: 0, loss: 0 }
      const homePoints = winnerId === match.homeEntryId ? sportMatchPoints.win : winnerId === match.awayEntryId ? sportMatchPoints.loss : sportMatchPoints.draw
      const awayPoints = winnerId === match.awayEntryId ? sportMatchPoints.win : winnerId === match.homeEntryId ? sportMatchPoints.loss : sportMatchPoints.draw

      const body: Record<string, unknown> = {
        score: isSetsSport || isGamesSport
          ? { sets: [{ home: homeScore, away: awayScore }] }
          : { home: homeScore, away: awayScore },
        homePoints,
        awayPoints,
        adminVerify,
        notes: form.notes || undefined,
      }
      if (winnerId) body.winnerId = winnerId

      const res = await fetch(`/api/competitions/${competitionId}/matches/${match.id}/result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? "Failed to submit result")
      }
      const json = await res.json()
      setMatches(prev => prev.map(m => m.id === match.id ? { ...m, ...json.data } : m))
      setActiveMatch(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(null)
    }
  }

  async function verifyResult(matchId: string) {
    setSaving(matchId)
    try {
      const res = await fetch(`/api/competitions/${competitionId}/matches/${matchId}/result/verify`, {
        method: "POST",
      })
      if (!res.ok) throw new Error("Failed to verify")
      const json = await res.json()
      setMatches(prev => prev.map(m => m.id === matchId ? { ...m, ...json.data } : m))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(null)
    }
  }

  async function disputeResult(matchId: string) {
    setSaving(matchId)
    try {
      const res = await fetch(`/api/competitions/${competitionId}/matches/${matchId}/result/dispute`, {
        method: "POST",
      })
      if (!res.ok) throw new Error("Failed to dispute")
      const json = await res.json()
      setMatches(prev => prev.map(m => m.id === matchId ? { ...m, ...json.data } : m))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(null)
    }
  }

  const scheduledMatches = matches.filter(m => m.status === "SCHEDULED" || m.status === "IN_PROGRESS" || m.resultStatus === "DISPUTED")
  const submittedMatches = matches.filter(m => m.resultStatus === "SUBMITTED")
  const completedMatches = matches.filter(m => m.status === "COMPLETED" && m.resultStatus === "VERIFIED")

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Pending verification */}
      {submittedMatches.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-600" />
            <h3 className="text-base font-semibold text-amber-900">Awaiting verification ({submittedMatches.length})</h3>
          </div>
          <div className="space-y-2">
            {submittedMatches.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between rounded-xl border border-amber-200 bg-white px-4 py-3">
                <div>
                  <span className="font-medium text-slate-900">{m.homeEntry?.displayName ?? "TBD"}</span>
                  <span className="mx-2 text-slate-400">vs</span>
                  <span className="font-medium text-slate-900">{m.awayEntry?.displayName ?? "TBD"}</span>
                  {m.score && (
                    <span className="ml-3 text-sm font-semibold text-slate-700">
                      {m.score.home !== undefined ? `${m.score.home} – ${m.score.away}` : JSON.stringify(m.score)}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => verifyResult(m.id)}
                    disabled={saving === m.id}
                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Verify
                  </button>
                  <button
                    onClick={() => disputeResult(m.id)}
                    disabled={saving === m.id}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-60"
                  >
                    <AlertCircle className="h-3.5 w-3.5" /> Dispute
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scheduled matches — result entry */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-semibold text-slate-900">Enter results ({scheduledMatches.length} matches)</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {scheduledMatches.length === 0 && (
            <p className="px-6 py-8 text-center text-sm text-slate-400">No scheduled matches. Generate a draw first.</p>
          )}
          {scheduledMatches.map((match: any) => {
            const isOpen = activeMatch === match.id
            const form = getForm(match.id)
            return (
              <div key={match.id}>
                <button
                  type="button"
                  onClick={() => setActiveMatch(isOpen ? null : match.id)}
                  className="flex w-full items-center justify-between px-6 py-4 text-left transition hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">R{match.round}/{match.matchNumber}</span>
                    <span className="font-medium text-slate-900">{match.homeEntry?.displayName ?? "TBD"}</span>
                    <span className="text-xs font-semibold text-slate-400">vs</span>
                    <span className="font-medium text-slate-900">{match.awayEntry?.displayName ?? "TBD"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {match.resultStatus && (
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${RESULT_BADGE[match.resultStatus]?.colour ?? ""}`}>
                        {RESULT_BADGE[match.resultStatus]?.label}
                      </span>
                    )}
                    <span className="text-xs font-medium text-[#1857E0]">{isOpen ? "Close" : "Enter result"}</span>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-50 bg-slate-50 px-6 py-4">
                    <div className="flex flex-wrap items-end gap-4">
                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <div className="mb-1 text-xs font-medium text-slate-600">{match.homeEntry?.displayName ?? "Home"}</div>
                          <input
                            type="number" min={0}
                            value={form.homeScore}
                            onChange={e => setForm(match.id, "homeScore", e.target.value)}
                            className="w-16 rounded-xl border border-slate-200 bg-white px-2 py-2 text-center text-lg font-bold outline-none focus:border-[#1857E0]"
                          />
                        </div>
                        <span className="pb-2 text-sm font-semibold text-slate-400">—</span>
                        <div className="text-center">
                          <div className="mb-1 text-xs font-medium text-slate-600">{match.awayEntry?.displayName ?? "Away"}</div>
                          <input
                            type="number" min={0}
                            value={form.awayScore}
                            onChange={e => setForm(match.id, "awayScore", e.target.value)}
                            className="w-16 rounded-xl border border-slate-200 bg-white px-2 py-2 text-center text-lg font-bold outline-none focus:border-[#1857E0]"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-slate-600">Notes</label>
                        <input
                          value={form.notes}
                          onChange={e => setForm(match.id, "notes", e.target.value)}
                          placeholder="Optional notes"
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#1857E0]"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => submitResult(match, true)}
                          disabled={saving === match.id}
                          className="rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1832A8] disabled:opacity-60"
                        >
                          {saving === match.id ? "Saving…" : "Save & verify"}
                        </button>
                        <button
                          onClick={() => submitResult(match, false)}
                          disabled={saving === match.id}
                          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white disabled:opacity-60"
                        >
                          Submit for review
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Completed */}
      {completedMatches.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-semibold text-slate-900">Completed results ({completedMatches.length})</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {completedMatches.map((m: any) => (
              <div key={m.id} className="flex items-center gap-4 px-6 py-3">
                <span className="text-xs text-slate-400">R{m.round}/{m.matchNumber}</span>
                <span className={`font-medium ${m.winnerId === m.homeEntryId ? "text-slate-900 font-semibold" : "text-slate-500"}`}>
                  {m.homeEntry?.displayName ?? "TBD"}
                </span>
                {m.score && (
                  <span className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">
                    {m.score.home !== undefined ? `${m.score.home} – ${m.score.away}` : ""}
                    {m.score.sets ? m.score.sets.map((s: any) => `${s.home}-${s.away}`).join(", ") : ""}
                  </span>
                )}
                <span className={`font-medium ${m.winnerId === m.awayEntryId ? "text-slate-900 font-semibold" : "text-slate-500"}`}>
                  {m.awayEntry?.displayName ?? "TBD"}
                </span>
                <span className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                  ✓ Verified
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
