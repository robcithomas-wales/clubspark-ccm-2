"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface Venue { id: string; name: string }
interface Season {
  id: string
  venueId: string
  name: string
  startDate: string
  endDate: string
  status: string
  notes?: string | null
}

interface Props {
  venues: Venue[]
  existing?: Season
}

export function SeasonForm({ venues, existing }: Props) {
  const router = useRouter()
  const [venueId, setVenueId] = useState(existing?.venueId ?? venues[0]?.id ?? "")
  const [name, setName] = useState(existing?.name ?? "")
  const [startDate, setStartDate] = useState(existing?.startDate?.slice(0, 10) ?? "")
  const [endDate, setEndDate] = useState(existing?.endDate?.slice(0, 10) ?? "")
  const [status, setStatus] = useState(existing?.status ?? "draft")
  const [notes, setNotes] = useState(existing?.notes ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setError(null)
    setSaving(true)
    try {
      const payload = { venueId, name, startDate, endDate, status, notes: notes || undefined }
      const url = existing ? `/api/seasons/${existing.id}` : "/api/seasons"
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
      router.push("/seasons")
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
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Venue</label>
        <select
          value={venueId}
          onChange={(e) => setVenueId(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0] bg-white"
        >
          {venues.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Season name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Summer 2026, Winter 2025/26"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Start date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">End date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Status</label>
        <div className="flex gap-2">
          {(["draft", "active", "ended"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition border capitalize ${
                status === s
                  ? "bg-[#1857E0] text-white border-[#1857E0]"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
          Notes <span className="font-normal normal-case text-slate-400">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Any notes about this season…"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]"
        />
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={save}
          disabled={saving || !name.trim() || !startDate || !endDate || !venueId}
          className="rounded-xl bg-[#1857E0] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#1832A8] transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving…" : existing ? "Save changes" : "Create season"}
        </button>
        <a href="/seasons" className="text-sm text-slate-500 hover:text-slate-700 transition">Cancel</a>
      </div>
    </div>
  )
}
