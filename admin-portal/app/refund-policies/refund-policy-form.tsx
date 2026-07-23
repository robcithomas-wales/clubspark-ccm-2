"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface Props {
  existing?: {
    id: string
    name: string
    venueId?: string | null
    hoursBeforeStart: number
    refundPct: number
    priority: number
    isActive: boolean
  }
}

export function RefundPolicyForm({ existing }: Props) {
  const router = useRouter()
  const [name, setName] = useState(existing?.name ?? "")
  const [venueId, setVenueId] = useState(existing?.venueId ?? "")
  const [hoursBeforeStart, setHoursBeforeStart] = useState(String(existing?.hoursBeforeStart ?? 24))
  const [refundPct, setRefundPct] = useState(String(existing?.refundPct ?? 100))
  const [priority, setPriority] = useState(String(existing?.priority ?? 100))
  const [isActive, setIsActive] = useState(existing?.isActive ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setError(null)
    setSaving(true)
    try {
      const payload = {
        name,
        venueId: venueId || null,
        hoursBeforeStart: Number(hoursBeforeStart),
        refundPct: Number(refundPct),
        priority: Number(priority),
        ...(existing ? { isActive } : {}),
      }
      const url = existing ? `/api/refund-policies/${existing.id}` : "/api/refund-policies"
      const method = existing ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(err || "Failed to save")
      }
      router.push("/refund-policies")
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "An error occurred")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Policy name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Standard 24h refund, No refund, Full refund"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
            Minimum notice (hours)
          </label>
          <input
            type="number"
            min={0}
            value={hoursBeforeStart}
            onChange={(e) => setHoursBeforeStart(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]"
          />
          <p className="mt-1 text-xs text-slate-400">Cancelled ≥ this many hours before start → refund applies</p>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
            Refund % (0–100)
          </label>
          <input
            type="number"
            min={0}
            max={100}
            value={refundPct}
            onChange={(e) => setRefundPct(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
            Venue ID <span className="font-normal normal-case text-slate-400">(optional — blank = all venues)</span>
          </label>
          <input
            type="text"
            value={venueId}
            onChange={(e) => setVenueId(e.target.value)}
            placeholder="UUID of specific venue"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0] font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Priority (lower wins)</label>
          <input
            type="number"
            min={0}
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]"
          />
        </div>
      </div>

      {existing && (
        <label className="flex cursor-pointer items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={isActive}
            onClick={() => setIsActive(!isActive)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
              isActive ? "bg-[#1857E0]" : "bg-slate-300"
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              isActive ? "translate-x-6" : "translate-x-1"
            }`} />
          </button>
          <span className="text-sm font-medium text-slate-700">Active</span>
        </label>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={save}
          disabled={saving || !name.trim()}
          className="rounded-xl bg-[#1857E0] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#1832A8] transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving…" : existing ? "Save changes" : "Create policy"}
        </button>
        <a href="/refund-policies" className="text-sm text-slate-500 hover:text-slate-700 transition">Cancel</a>
      </div>
    </div>
  )
}
