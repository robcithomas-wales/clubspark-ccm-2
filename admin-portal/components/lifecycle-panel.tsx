"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Activity } from "lucide-react"

const LIFECYCLE_STATES = ["prospect", "active", "inactive", "lapsed", "churned"] as const
type LifecycleState = (typeof LIFECYCLE_STATES)[number]

const STATE_STYLES: Record<LifecycleState, string> = {
  prospect: "bg-blue-50 text-blue-700 ring-blue-600/20",
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  inactive: "bg-yellow-50 text-yellow-700 ring-yellow-600/20",
  lapsed: "bg-orange-50 text-orange-700 ring-orange-600/20",
  churned: "bg-rose-50 text-rose-700 ring-rose-600/20",
}

interface LifecyclePanelProps {
  customerId: string
  currentState: LifecycleState
}

export function LifecyclePanel({ customerId, currentState }: LifecyclePanelProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [toState, setToState] = useState<LifecycleState>(currentState)
  const [reason, setReason] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleTransition() {
    if (toState === currentState) { setOpen(false); return }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/customers/${customerId}/lifecycle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toState, reason: reason || undefined }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.message ?? `Error ${res.status}`)
        return
      }
      setOpen(false)
      setReason("")
      router.refresh()
    } catch (e: any) {
      setError(e?.message ?? "Unknown error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 text-slate-400" />
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Lifecycle state</h2>
            <p className="mt-0.5 text-xs text-slate-500">Track where this person is in their journey.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${STATE_STYLES[currentState] ?? "bg-slate-100 text-slate-600 ring-slate-500/20"}`}>
            {currentState}
          </span>
          {!open && (
            <button
              onClick={() => { setOpen(true); setToState(currentState) }}
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Change
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">New state</label>
            <select
              value={toState}
              onChange={(e) => setToState(e.target.value as LifecycleState)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]"
            >
              {LIFECYCLE_STATES.map((s) => (
                <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">Reason (optional)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Rejoined after season break"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]"
            />
          </div>
          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          )}
          <div className="flex gap-3">
            <button
              onClick={handleTransition}
              disabled={saving}
              className="inline-flex items-center rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#174ED0] disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => { setOpen(false); setError(null) }}
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function LifecycleBadge({ state }: { state: string }) {
  const style = STATE_STYLES[state as LifecycleState] ?? "bg-slate-100 text-slate-600 ring-slate-500/20"
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${style}`}>
      {state}
    </span>
  )
}
