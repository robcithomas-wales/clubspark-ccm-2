"use client"

import { useEffect, useState } from "react"
import { PortalLayout } from "@/components/portal-layout"
import { AlertTriangle, ShieldAlert, RefreshCw, CheckCircle2, Info } from "lucide-react"
import type { AnomalyFlag } from "@/lib/api"

const RULE_LABELS: Record<string, string> = {
  dormant_spike: "Dormant account spike",
  payment_failure_spike: "Payment failure spike",
  court_hoarding: "Court hoarding",
  booking_duration_extreme: "Extreme booking duration",
}

function SeverityBadge({ severity }: { severity: string }) {
  return severity === "alert" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-600/20">
      <ShieldAlert className="h-3 w-3" />
      Alert
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
      <AlertTriangle className="h-3 w-3" />
      Warning
    </span>
  )
}

export default function AnomaliesPage() {
  const [flags, setFlags] = useState<AnomalyFlag[]>([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1, limit: 50 })
  const [loading, setLoading] = useState(true)
  const [detecting, setDetecting] = useState(false)
  const [detectResult, setDetectResult] = useState<{ flagged: number } | null>(null)
  const [resolving, setResolving] = useState<Set<string>>(new Set())
  const [severity, setSeverity] = useState<string>("")

  async function load(page = 1) {
    setLoading(true)
    try {
      const qs = new URLSearchParams({ page: String(page), unresolvedOnly: "true" })
      if (severity) qs.set("severity", severity)
      const res = await fetch(`/api/proxy/analytics/v1/anomalies?${qs}`, { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setFlags(data.data)
        setPagination(data.pagination)
      }
    } finally {
      setLoading(false)
    }
  }

  async function detect() {
    setDetecting(true)
    setDetectResult(null)
    try {
      const res = await fetch("/api/proxy/analytics/v1/anomalies/detect", { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        setDetectResult(data)
        await load()
      }
    } finally {
      setDetecting(false)
    }
  }

  async function resolve(id: string) {
    setResolving(prev => new Set(prev).add(id))
    try {
      await fetch(`/api/proxy/analytics/v1/anomalies/${id}/resolve`, { method: "PATCH" })
      setFlags(prev => prev.filter(f => f.id !== id))
    } finally {
      setResolving(prev => { const s = new Set(prev); s.delete(id); return s })
    }
  }

  useEffect(() => { load() }, [severity])

  const alertCount = flags.filter(f => f.severity === "alert").length
  const warningCount = flags.filter(f => f.severity === "warning").length

  return (
    <PortalLayout
      title="Anomaly Flags"
      description="Rule-based detection of unusual patterns in bookings and payments. Runs nightly at 03:00 UTC."
    >
      <div className="space-y-6">

        {/* Stats + controls */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-red-100 bg-red-50 p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-red-600">Alerts</div>
              <div className="mt-2 text-3xl font-bold text-red-700">{alertCount}</div>
              <div className="mt-1 text-xs text-red-500">Require attention</div>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-amber-600">Warnings</div>
              <div className="mt-2 text-3xl font-bold text-amber-700">{warningCount}</div>
              <div className="mt-1 text-xs text-amber-500">Worth reviewing</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total unresolved</div>
              <div className="mt-2 text-3xl font-bold text-slate-900">{pagination.total}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={severity}
              onChange={e => setSeverity(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
            >
              <option value="">All severity</option>
              <option value="alert">Alerts only</option>
              <option value="warning">Warnings only</option>
            </select>
            <button
              onClick={detect}
              disabled={detecting}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1832A8] disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${detecting ? "animate-spin" : ""}`} />
              {detecting ? "Scanning…" : "Run detection"}
            </button>
          </div>
        </div>

        {detectResult && (
          <div className={`rounded-xl border px-4 py-3 text-sm ${detectResult.flagged > 0 ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
            Detection complete — {detectResult.flagged} new flag{detectResult.flagged !== 1 ? "s" : ""} raised.
          </div>
        )}

        {/* Rules legend */}
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#1857E0]" />
            <div>
              <div className="text-sm font-semibold text-slate-900">Detection rules</div>
              <ul className="mt-2 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
                <li><span className="font-medium text-red-600">Alert</span> — Dormant account spike: 60+ days inactive → 5+ bookings in 24h</li>
                <li><span className="font-medium text-red-600">Alert</span> — Payment failure spike: 3+ failures in 24 hours</li>
                <li><span className="font-medium text-amber-600">Warning</span> — Court hoarding: same unit booked 7+ times in 7 days</li>
                <li><span className="font-medium text-amber-600">Warning</span> — Extreme duration: booking &gt;6 hours</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Flag list */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-semibold text-slate-900">Unresolved flags</h3>
          </div>

          {loading ? (
            <div className="px-6 py-10 text-center text-sm text-slate-400">Loading anomalies…</div>
          ) : flags.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
              <p className="mt-3 text-sm font-medium text-slate-700">No unresolved anomalies</p>
            </div>
          ) : (
            <>
              <div className="hidden grid-cols-5 gap-4 border-b border-slate-100 bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 lg:grid">
                <div>Rule</div>
                <div>Description</div>
                <div>Person</div>
                <div>Detected</div>
                <div>Action</div>
              </div>
              <div className="divide-y divide-slate-100">
                {flags.map((flag) => (
                  <div key={flag.id} className="grid gap-4 px-6 py-4 lg:grid-cols-5 lg:items-center">
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={flag.severity} />
                      <span className="hidden text-xs text-slate-500 lg:block">{RULE_LABELS[flag.ruleId] ?? flag.ruleId}</span>
                    </div>
                    <div className="text-sm text-slate-700">{flag.description}</div>
                    <div className="font-mono text-xs text-slate-400">
                      {flag.personId ? flag.personId.slice(0, 8) + "…" : "—"}
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(flag.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div>
                      <button
                        onClick={() => resolve(flag.id)}
                        disabled={resolving.has(flag.id)}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {resolving.has(flag.id) ? "Resolving…" : "Resolve"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </PortalLayout>
  )
}
