"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"

const SCOPE_TYPES = [
  { value: "venue", label: "Venue (all resources)" },
  { value: "resource_group", label: "Resource group" },
  { value: "resource", label: "Specific resource" },
]

const DOW_OPTIONS = [
  { value: "", label: "Every day (catch-all)" },
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
]

const inputCls =
  "rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0] w-full"

export function SeasonLinkedConfigsPanel({
  scheduleId,
  venues,
}: {
  scheduleId: string
  venues: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [scopeType, setScopeType] = useState("venue")
  const [scopeId, setScopeId] = useState(venues[0]?.id ?? "")
  const [dow, setDow] = useState("")
  const [opensAt, setOpensAt] = useState("08:00")
  const [closesAt, setClosesAt] = useState("22:00")
  const [slotDuration, setSlotDuration] = useState("60")
  const [newDayRelease, setNewDayRelease] = useState("")

  async function save() {
    if (!scopeId.trim()) { setError("Scope ID is required"); return }
    setError(null)
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        scopeType,
        scopeId: scopeId.trim(),
        seasonalScheduleId: scheduleId,
        opensAt: opensAt || undefined,
        closesAt: closesAt || undefined,
        slotDurationMinutes: slotDuration ? parseInt(slotDuration) : undefined,
        newDayReleaseTime: newDayRelease || undefined,
        isActive: true,
      }
      if (dow !== "") body.dayOfWeek = parseInt(dow)

      const res = await fetch("/api/availability-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json?.message ?? "Failed to create config")
      }
      setOpen(false)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border-t border-slate-100 bg-slate-50/50">
      {!open ? (
        <div className="px-5 py-3">
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#1857E0] hover:text-[#1832A8] transition"
          >
            <Plus className="h-4 w-4" />
            Add availability config for this season
          </button>
        </div>
      ) : (
        <div className="px-5 py-4 space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            New linked availability config
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Scope type</label>
              <select value={scopeType} onChange={(e) => setScopeType(e.target.value)} className={inputCls}>
                {SCOPE_TYPES.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">
                {scopeType === "venue" ? "Venue" : "Scope ID (UUID)"}
              </label>
              {scopeType === "venue" ? (
                <select value={scopeId} onChange={(e) => setScopeId(e.target.value)} className={inputCls}>
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={scopeId}
                  onChange={(e) => setScopeId(e.target.value)}
                  placeholder="UUID of resource group or resource"
                  className={inputCls}
                />
              )}
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">Day of week</label>
              <select value={dow} onChange={(e) => setDow(e.target.value)} className={inputCls}>
                {DOW_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">Slot duration (mins)</label>
              <input
                type="number"
                min="15"
                step="15"
                value={slotDuration}
                onChange={(e) => setSlotDuration(e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">Opens at (HH:MM)</label>
              <input
                type="time"
                value={opensAt}
                onChange={(e) => setOpensAt(e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">Closes at (HH:MM)</label>
              <input
                type="time"
                value={closesAt}
                onChange={(e) => setClosesAt(e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">New-day release time (HH:MM)</label>
              <input
                type="time"
                value={newDayRelease}
                onChange={(e) => setNewDayRelease(e.target.value)}
                placeholder="e.g. 08:00"
                className={inputCls}
              />
            </div>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="flex items-center gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-medium text-white hover:bg-[#1832A8] transition disabled:opacity-50"
            >
              {saving ? "Saving…" : "Add config"}
            </button>
            <button
              onClick={() => { setOpen(false); setError(null) }}
              className="text-sm text-slate-500 hover:text-slate-700 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
