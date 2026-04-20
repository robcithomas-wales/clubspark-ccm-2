"use client"

import { useEffect, useState } from "react"
import { Brain, TrendingUp, AlertTriangle, Clock, RefreshCw } from "lucide-react"
import type { MemberScore } from "@/lib/api"

function ChurnBadge({ band }: { band: "low" | "medium" | "high" }) {
  const colours = {
    low: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    medium: "bg-amber-50 text-amber-700 ring-amber-600/20",
    high: "bg-red-50 text-red-700 ring-red-600/20",
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset capitalize ${colours[band]}`}>
      {band} risk
    </span>
  )
}

function ScoreBar({ value, max = 100, colour }: { value: number; max?: number; colour: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${colour}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-7 text-right text-xs font-semibold tabular-nums text-slate-700">{value}</span>
    </div>
  )
}

function FactorList({ factors }: { factors: Record<string, number> }) {
  const entries = Object.entries(factors).filter(([, v]) => v !== 0)
  if (entries.length === 0) return <p className="text-xs text-slate-400">No contributing factors</p>
  return (
    <ul className="space-y-1">
      {entries.map(([key, val]) => (
        <li key={key} className="flex items-center justify-between text-xs">
          <span className="text-slate-500 capitalize">{key.replace(/([A-Z])/g, " $1").toLowerCase()}</span>
          <span className={`font-semibold tabular-nums ${val > 0 ? "text-red-600" : "text-emerald-600"}`}>
            {val > 0 ? `+${val}` : val}
          </span>
        </li>
      ))}
    </ul>
  )
}

export function AiInsightsPanel({ personId }: { personId: string }) {
  const [score, setScore] = useState<MemberScore | null>(null)
  const [loading, setLoading] = useState(true)
  const [computing, setComputing] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/proxy/analytics/v1/scores/${personId}`, { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setScore(data)
      }
    } finally {
      setLoading(false)
    }
  }

  async function recompute() {
    setComputing(true)
    try {
      await fetch(`/api/proxy/analytics/v1/scores/compute`, { method: "POST" })
      await new Promise(r => setTimeout(r, 1500))
      await load()
    } finally {
      setComputing(false)
    }
  }

  useEffect(() => { load() }, [personId])

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-[#1857E0]" />
          <h3 className="text-base font-semibold text-slate-900">AI Insights</h3>
        </div>
        <button
          onClick={recompute}
          disabled={computing || loading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${computing ? "animate-spin" : ""}`} />
          {computing ? "Computing…" : "Recompute"}
        </button>
      </div>

      {loading ? (
        <div className="px-6 py-10 text-center text-sm text-slate-400">Loading scores…</div>
      ) : !score ? (
        <div className="px-6 py-10 text-center">
          <p className="text-sm text-slate-500">No scores computed yet.</p>
          <button
            onClick={recompute}
            disabled={computing}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1832A8] disabled:opacity-60"
          >
            <Brain className="h-4 w-4" />
            {computing ? "Computing…" : "Compute now"}
          </button>
        </div>
      ) : (
        <div className="grid gap-px bg-slate-100 md:grid-cols-2">

          {/* Churn risk */}
          <div className="space-y-3 bg-white px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-700">Churn risk</span>
              </div>
              <ChurnBadge band={score.churnBand} />
            </div>
            <ScoreBar value={score.churnRisk} colour={
              score.churnBand === "high" ? "bg-red-500" :
              score.churnBand === "medium" ? "bg-amber-400" : "bg-emerald-500"
            } />
            <FactorList factors={score.churnFactors} />
          </div>

          {/* LTV */}
          <div className="space-y-3 bg-white px-6 py-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">Lifetime value</span>
            </div>
            <div className="text-2xl font-bold tracking-tight text-slate-900">{score.ltvScoreFormatted}</div>
            <p className="text-xs text-slate-500">Estimated annual value</p>
            <FactorList factors={Object.fromEntries(
              Object.entries(score.ltvFactors).filter(([k]) => k !== "retentionMultiplier")
            )} />
            {score.ltvFactors.retentionMultiplier != null && (
              <p className="text-xs text-slate-400">
                Retention multiplier: ×{score.ltvFactors.retentionMultiplier}
              </p>
            )}
          </div>

          {/* Default risk */}
          <div className="space-y-3 bg-white px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-700">Payment default risk</span>
              </div>
              <ChurnBadge band={score.defaultBand} />
            </div>
            <ScoreBar value={score.defaultRisk} colour={
              score.defaultBand === "high" ? "bg-red-500" :
              score.defaultBand === "medium" ? "bg-amber-400" : "bg-emerald-500"
            } />
            <FactorList factors={score.defaultFactors} />
          </div>

          {/* Optimal send hour */}
          <div className="space-y-3 bg-white px-6 py-5">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">Best time to contact</span>
            </div>
            {score.optimalSendHour != null ? (
              <>
                <div className="text-2xl font-bold tracking-tight text-slate-900">
                  {String(score.optimalSendHour).padStart(2, "0")}:00
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[#1857E0]"
                      style={{ width: `${Math.round((score.sendHourConfidence ?? 0) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500">
                    {Math.round((score.sendHourConfidence ?? 0) * 100)}% confidence
                  </span>
                </div>
                <p className="text-xs text-slate-500">Based on email open history (UTC)</p>
              </>
            ) : (
              <p className="text-sm text-slate-400">Not enough email data</p>
            )}
          </div>

        </div>
      )}

      {score && (
        <div className="border-t border-slate-100 px-6 py-2 text-right">
          <span className="text-xs text-slate-400">
            Last computed {new Date(score.computedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        </div>
      )}
    </div>
  )
}
