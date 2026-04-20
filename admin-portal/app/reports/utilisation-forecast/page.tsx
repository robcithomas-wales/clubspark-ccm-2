"use client"

import { useEffect, useState } from "react"
import { PortalLayout } from "@/components/portal-layout"
import { TrendingUp, RefreshCw, AlertTriangle, Clock, Target } from "lucide-react"
import type { DeadSlotSummary } from "@/lib/api"

function OccupancyBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const colour = pct < 30 ? "bg-red-500" : pct < 60 ? "bg-amber-400" : "bg-emerald-500"
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${colour}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right text-xs font-semibold tabular-nums text-slate-700">{pct}%</span>
    </div>
  )
}

function formatSlotTime(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`
}

export default function UtilisationForecastPage() {
  const [deadSlots, setDeadSlots] = useState<DeadSlotSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [computing, setComputing] = useState(false)
  const [result, setResult] = useState<{ slotsComputed: number; deadSlots: number } | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/proxy/analytics/v1/forecasts/dead-slots", { cache: "no-store" })
      if (res.ok) setDeadSlots(await res.json())
    } finally {
      setLoading(false)
    }
  }

  async function compute() {
    setComputing(true)
    setResult(null)
    try {
      const res = await fetch("/api/proxy/analytics/v1/forecasts/compute", { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        setResult(data)
        await load()
      }
    } finally {
      setComputing(false)
    }
  }

  useEffect(() => { load() }, [])

  const totalDeadSlots = deadSlots.reduce((s, u) => s + u.deadSlotCount, 0)

  return (
    <PortalLayout
      title="Utilisation Forecast"
      description="7–14 day occupancy predictions by unit. Dead slots (predicted <30%) are highlighted for proactive action."
    >
      <div className="space-y-6">

        {/* Stats + controls */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Units with dead slots</div>
              <div className="mt-2 text-3xl font-bold text-slate-900">{deadSlots.length}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total dead slot hours</div>
              <div className="mt-2 text-3xl font-bold text-red-600">{totalDeadSlots}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Forecast horizon</div>
              <div className="mt-2 text-3xl font-bold text-slate-900">14 days</div>
            </div>
          </div>
          <button
            onClick={compute}
            disabled={computing}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1832A8] disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${computing ? "animate-spin" : ""}`} />
            {computing ? "Computing…" : "Recompute forecasts"}
          </button>
        </div>

        {result && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Forecast complete — {result.slotsComputed} slots computed, {result.deadSlots} dead slots identified.
          </div>
        )}

        {/* How it works */}
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-[#1857E0]" />
            <div>
              <div className="text-sm font-semibold text-slate-900">How forecasting works</div>
              <div className="mt-1 text-sm text-slate-600">
                Rolling 4-week average occupancy by unit, day-of-week and hour. Dead slots are defined as &lt;30% predicted occupancy.
                Computed nightly at 02:00 UTC. Use "Previous bookers" to identify the right audience for a targeted campaign on slow slots.
              </div>
            </div>
          </div>
        </div>

        {/* Dead slots by unit */}
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-400 shadow-sm">
            Loading forecast data…
          </div>
        ) : deadSlots.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
            <Target className="mx-auto h-8 w-8 text-emerald-500" />
            <p className="mt-3 text-sm font-medium text-slate-700">No dead slots in the next 14 days</p>
            <p className="mt-1 text-sm text-slate-400">All units are predicted above 30% occupancy, or forecasts haven't been computed yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {deadSlots.map((unit) => (
              <div key={unit.unitId} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        Unit <span className="font-mono text-xs text-slate-500">{unit.unitId.slice(0, 8)}…</span>
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {unit.deadSlotCount} dead slot{unit.deadSlotCount !== 1 ? "s" : ""} · lowest {Math.round(unit.lowestOccupancy * 100)}% occupancy
                      </div>
                    </div>
                  </div>
                  <DeadSlotActions unitId={unit.unitId} />
                </div>
                <div className="divide-y divide-slate-50">
                  {unit.slots.map((slot) => (
                    <div key={`${slot.forecastDate}-${slot.hourSlot}`} className="flex items-center justify-between gap-4 px-6 py-3">
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                        <div>
                          <span className="text-sm font-medium text-slate-900">
                            {new Date(slot.forecastDate).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                          </span>
                          <span className="ml-2 text-sm text-slate-500">{formatSlotTime(slot.hourSlot)}</span>
                        </div>
                      </div>
                      <OccupancyBar value={slot.predictedOccupancy} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  )
}

function DeadSlotActions({ unitId }: { unitId: string }) {
  const [bookers, setBookers] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(false)

  async function loadBookers() {
    setLoading(true)
    try {
      const res = await fetch(`/api/proxy/analytics/v1/forecasts/dead-slots/${unitId}/bookers`)
      if (res.ok) setBookers(await res.json())
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {bookers !== null ? (
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-[#1857E0]">
          {bookers.length} previous booker{bookers.length !== 1 ? "s" : ""}
        </span>
      ) : (
        <button
          onClick={loadBookers}
          disabled={loading}
          className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? "Loading…" : "Show bookers"}
        </button>
      )}
    </div>
  )
}
