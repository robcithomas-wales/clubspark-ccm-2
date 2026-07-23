"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Props {
  venues: any[]
  resources: any[]
  units: any[]
  existing?: any
}

function toDatetimeLocal(iso?: string) {
  if (!iso) return ""
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function SessionForm({ venues, resources, units, existing }: Props) {
  const router = useRouter()
  const isEdit = !!existing

  const [form, setForm] = useState({
    venueId: existing?.venueId ?? "",
    resourceId: existing?.resourceId ?? "",
    bookableUnitId: existing?.bookableUnitId ?? "",
    name: existing?.name ?? "",
    description: existing?.description ?? "",
    startsAt: toDatetimeLocal(existing?.startsAt),
    endsAt: toDatetimeLocal(existing?.endsAt),
    pricePerParticipant: existing?.pricePerParticipant != null ? String(existing.pricePerParticipant) : "",
    minParticipants: existing?.minParticipants != null ? String(existing.minParticipants) : "",
    maxParticipants: existing?.maxParticipants != null ? String(existing.maxParticipants) : "",
    notes: existing?.notes ?? "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filteredResources = form.venueId
    ? resources.filter((r: any) => r.venueId === form.venueId)
    : resources

  const filteredUnits = form.resourceId
    ? units.filter((u: any) => u.resourceId === form.resourceId && u.isActive !== false)
    : units.filter((u: any) => u.isActive !== false)

  async function save() {
    if (!form.name.trim() || !form.venueId || !form.resourceId || !form.bookableUnitId || !form.startsAt || !form.endsAt) {
      setError("Name, venue, resource, bookable unit, start and end time are all required.")
      return
    }
    setError(null)
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        venueId: form.venueId,
        resourceId: form.resourceId,
        bookableUnitId: form.bookableUnitId,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        pricePerParticipant: form.pricePerParticipant ? parseFloat(form.pricePerParticipant) : undefined,
        minParticipants: form.minParticipants ? parseInt(form.minParticipants, 10) : undefined,
        maxParticipants: form.maxParticipants ? parseInt(form.maxParticipants, 10) : undefined,
        notes: form.notes.trim() || undefined,
      }

      const url = isEdit ? `/api/sessions/${existing.id}` : "/api/sessions"
      const method = isEdit ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(await res.text())
      const json = await res.json()
      const id = json.data?.id ?? existing?.id
      router.push(`/sessions/${id}`)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "An error occurred")
    } finally {
      setSaving(false)
    }
  }

  const inputCls = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]"
  const labelCls = "block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1"

  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

      <div>
        <label className={labelCls}>Session name <span className="text-red-400">*</span></label>
        <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Monday Padel Doubles" className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Description</label>
        <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          rows={2} placeholder="Optional description shown to members" className={inputCls} />
      </div>

      {/* Location */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={labelCls}>Venue <span className="text-red-400">*</span></label>
          <select value={form.venueId}
            onChange={(e) => setForm((f) => ({ ...f, venueId: e.target.value, resourceId: "", bookableUnitId: "" }))}
            className={inputCls}>
            <option value="">— select —</option>
            {venues.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Resource <span className="text-red-400">*</span></label>
          <select value={form.resourceId}
            onChange={(e) => setForm((f) => ({ ...f, resourceId: e.target.value, bookableUnitId: "" }))}
            className={inputCls}>
            <option value="">— select —</option>
            {filteredResources.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Bookable unit <span className="text-red-400">*</span></label>
          <select value={form.bookableUnitId}
            onChange={(e) => setForm((f) => ({ ...f, bookableUnitId: e.target.value }))}
            className={inputCls}>
            <option value="">— select —</option>
            {filteredUnits.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
      </div>

      {/* Time */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Start <span className="text-red-400">*</span></label>
          <input type="datetime-local" value={form.startsAt}
            onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
            className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>End <span className="text-red-400">*</span></label>
          <input type="datetime-local" value={form.endsAt}
            onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
            className={inputCls} />
        </div>
      </div>

      {/* Capacity & Price */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={labelCls}>Price per person (£)</label>
          <input type="number" min="0" step="0.01" value={form.pricePerParticipant}
            onChange={(e) => setForm((f) => ({ ...f, pricePerParticipant: e.target.value }))}
            placeholder="Free" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Min participants</label>
          <input type="number" min="1" value={form.minParticipants}
            onChange={(e) => setForm((f) => ({ ...f, minParticipants: e.target.value }))}
            placeholder="No minimum" className={inputCls} />
          <p className="mt-1 text-xs text-slate-400">Session confirmed when this is reached.</p>
        </div>
        <div>
          <label className={labelCls}>Max participants</label>
          <input type="number" min="1" value={form.maxParticipants}
            onChange={(e) => setForm((f) => ({ ...f, maxParticipants: e.target.value }))}
            placeholder="No limit" className={inputCls} />
          <p className="mt-1 text-xs text-slate-400">Session closes when full.</p>
        </div>
      </div>

      <div>
        <label className={labelCls}>Internal notes</label>
        <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          rows={2} placeholder="Staff-only notes" className={inputCls} />
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex items-center gap-3 pt-1 border-t border-slate-100">
        <button type="button" onClick={save} disabled={saving}
          className="rounded-xl bg-[#1857E0] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#1832A8] transition disabled:opacity-50">
          {saving ? "Saving…" : isEdit ? "Save changes" : "Create session"}
        </button>
        <Link href="/sessions" className="text-sm text-slate-500 hover:text-slate-700 transition">Cancel</Link>
      </div>
    </div>
  )
}
