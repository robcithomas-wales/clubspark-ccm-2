"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { InternalShell } from "@/components/internal-shell"
import { UserX, AlertTriangle } from "lucide-react"

type Session = {
  id: string
  staffEmail?: string | null
  tenantId: string
  targetEmail?: string | null
  targetUserId: string
  reason: string
  startedAt: string
  endedAt?: string | null
  status: string
  organisation?: { name: string }
}

function fmt(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso))
}

export default function ImpersonationPage() {
  const searchParams = useSearchParams()
  const filterTenant = searchParams.get("tenantId") ?? ""

  const [sessions, setSessions] = React.useState<Session[]>([])
  const [total, setTotal] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [ending, setEnding] = React.useState<string | null>(null)

  // Start impersonation form
  const [startTenantId, setStartTenantId] = React.useState(filterTenant)
  const [targetUserId, setTargetUserId] = React.useState("")
  const [targetEmail, setTargetEmail] = React.useState("")
  const [reason, setReason] = React.useState("")
  const [starting, setStarting] = React.useState(false)
  const [startError, setStartError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const qs = filterTenant ? `?tenantId=${filterTenant}` : ""
    fetch(`/api/impersonation${qs}`)
      .then(r => r.json())
      .then(j => { setSessions(j.data ?? []); setTotal(j.pagination?.total ?? 0); setLoading(false) })
      .catch(() => setLoading(false))
  }, [filterTenant])

  async function endSession(sessionId: string) {
    if (!confirm("End this impersonation session?")) return
    setEnding(sessionId)
    try {
      await fetch(`/api/impersonation/${sessionId}/end`, { method: "POST" })
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: "ended", endedAt: new Date().toISOString() } : s))
    } finally {
      setEnding(null)
    }
  }

  async function startSession(e: React.FormEvent) {
    e.preventDefault()
    if (!reason) { setStartError("Reason is required."); return }
    setStartError(null)
    setStarting(true)
    try {
      const res = await fetch(`/api/accounts/${startTenantId}/impersonate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId, targetEmail: targetEmail || undefined, reason }),
      })
      const j = await res.json()
      if (!res.ok) { setStartError(j?.message ?? "Failed to start session."); return }
      setSessions(prev => [j.data, ...prev])
      setTargetUserId(""); setTargetEmail(""); setReason("")
    } finally {
      setStarting(false)
    }
  }

  const active = sessions.filter(s => s.status === "active")
  const historical = sessions.filter(s => s.status !== "active")

  return (
    <InternalShell title="Impersonation" description="Start and manage impersonation sessions. Every session is audit-logged.">
      <div className="space-y-6">
        {/* Warning banner */}
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div className="text-sm text-amber-800">
            <strong>High-privilege action.</strong> Impersonation sessions are fully audit-logged with your staff identity, the target account, and your stated reason. Only use this for authorised support or debugging purposes.
          </div>
        </div>

        {/* Start session form */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Start impersonation session</h2>
          <form onSubmit={startSession} className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Tenant ID *</label>
                <input
                  required value={startTenantId} onChange={e => setStartTenantId(e.target.value)}
                  placeholder="uuid of the organisation tenant"
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-orange-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Target user ID *</label>
                <input
                  required value={targetUserId} onChange={e => setTargetUserId(e.target.value)}
                  placeholder="Supabase user UUID"
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-orange-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Target email (optional)</label>
                <input
                  type="email" value={targetEmail} onChange={e => setTargetEmail(e.target.value)}
                  placeholder="admin@theirclub.com"
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-orange-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Reason *</label>
                <input
                  required value={reason} onChange={e => setReason(e.target.value)}
                  placeholder="e.g. Support ticket #1234 — user cannot access bookings"
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-orange-400"
                />
              </div>
            </div>
            {startError && <p className="text-sm text-red-600">{startError}</p>}
            <button
              type="submit" disabled={starting}
              className="h-9 rounded-xl bg-orange-500 px-5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60 transition"
            >
              {starting ? "Starting…" : "Start session"}
            </button>
          </form>
        </div>

        {/* Active sessions */}
        {active.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm">
            <div className="border-b border-red-100 bg-red-50 px-5 py-3.5">
              <span className="text-sm font-semibold text-red-700">{active.length} active session{active.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="divide-y divide-slate-50">
              {active.map(s => (
                <SessionRow key={s.id} session={s} onEnd={() => endSession(s.id)} ending={ending === s.id} />
              ))}
            </div>
          </div>
        )}

        {/* History */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-3.5">
            <span className="text-sm font-semibold text-slate-700">{total} total session{total !== 1 ? "s" : ""}</span>
          </div>
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-400">Loading…</div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-sm text-slate-400">
              <UserX className="h-10 w-10 text-slate-200" />
              No sessions recorded
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {historical.map(s => (
                <SessionRow key={s.id} session={s} onEnd={() => endSession(s.id)} ending={ending === s.id} />
              ))}
            </div>
          )}
        </div>
      </div>
    </InternalShell>
  )
}

function SessionRow({ session: s, onEnd, ending }: { session: Session; onEnd: () => void; ending: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-4 text-sm hover:bg-slate-50 transition">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.status === "active" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"}`}>
            {s.status}
          </span>
          <Link href={`/accounts/${s.tenantId}`} className="text-xs font-medium text-orange-600 hover:text-orange-800">
            {s.organisation?.name ?? s.tenantId.slice(0, 8)}
          </Link>
        </div>
        <div className="text-slate-700">
          <span className="font-medium">{s.staffEmail ?? s.id.slice(0, 8)}</span>
          {" → "}
          <span>{s.targetEmail ?? s.targetUserId.slice(0, 12)}</span>
        </div>
        <div className="mt-0.5 text-xs text-slate-500">Reason: {s.reason}</div>
        <div className="mt-0.5 text-xs text-slate-400">
          Started {fmt(s.startedAt)}
          {s.endedAt && ` · Ended ${fmt(s.endedAt)}`}
        </div>
      </div>
      {s.status === "active" && (
        <button
          onClick={onEnd}
          disabled={ending}
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60 transition"
        >
          {ending ? "Ending…" : "End session"}
        </button>
      )}
    </div>
  )
}
