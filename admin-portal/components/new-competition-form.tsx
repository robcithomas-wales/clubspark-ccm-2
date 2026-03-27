"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

const SPORTS = [
  { value: "tennis", label: "Tennis" },
  { value: "padel", label: "Padel" },
  { value: "squash", label: "Squash" },
  { value: "badminton", label: "Badminton" },
  { value: "football", label: "Football" },
  { value: "hockey", label: "Hockey" },
  { value: "netball", label: "Netball" },
  { value: "cricket", label: "Cricket" },
  { value: "basketball", label: "Basketball" },
  { value: "rugby_union", label: "Rugby Union" },
]

const FORMATS = [
  { value: "LEAGUE", label: "League", desc: "Round-robin — every entry plays every other entry over multiple rounds." },
  { value: "KNOCKOUT", label: "Knockout", desc: "Single elimination bracket — lose once and you're out." },
  { value: "ROUND_ROBIN", label: "Round Robin", desc: "All entries play each other once; shorter version of a league." },
  { value: "GROUP_KNOCKOUT", label: "Group + Knockout", desc: "Group stage feeding into a knockout bracket." },
]

const ENTRY_TYPES = [
  { value: "INDIVIDUAL", label: "Individual" },
  { value: "TEAM", label: "Team" },
  { value: "DOUBLES", label: "Doubles" },
  { value: "MIXED_DOUBLES", label: "Mixed Doubles" },
]

export function NewCompetitionForm() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: "",
    description: "",
    sport: "tennis",
    format: "LEAGUE",
    entryType: "INDIVIDUAL",
    season: "",
    maxEntries: "",
    entryFee: "",
    registrationOpensAt: "",
    registrationClosesAt: "",
    startDate: "",
    endDate: "",
    isPublic: true,
  })

  const set = (field: string, value: unknown) => setForm(f => ({ ...f, [field]: value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        sport: form.sport,
        format: form.format,
        entryType: form.entryType,
        isPublic: form.isPublic,
      }
      if (form.description) body.description = form.description
      if (form.season) body.season = form.season
      if (form.maxEntries) body.maxEntries = Number(form.maxEntries)
      if (form.entryFee) body.entryFee = Number(form.entryFee)
      if (form.registrationOpensAt) body.registrationOpensAt = form.registrationOpensAt
      if (form.registrationClosesAt) body.registrationClosesAt = form.registrationClosesAt
      if (form.startDate) body.startDate = form.startDate
      if (form.endDate) body.endDate = form.endDate

      const res = await fetch("/api/competitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? "Failed to create competition")
      }
      const json = await res.json()
      router.push(`/competitions/${json.data.id}`)
    } catch (err: any) {
      setError(err.message ?? "Something went wrong")
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Basic info */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-slate-900">Basic information</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Competition name *</label>
            <input
              required
              value={form.name}
              onChange={e => set("name", e.target.value)}
              placeholder="e.g. Summer Tennis League 2026"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
            <textarea
              value={form.description}
              onChange={e => set("description", e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Sport *</label>
            <select
              value={form.sport}
              onChange={e => set("sport", e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#1857E0]"
            >
              {SPORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Season</label>
            <input
              value={form.season}
              onChange={e => set("season", e.target.value)}
              placeholder="e.g. 2026 Spring"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]"
            />
          </div>
        </div>
      </div>

      {/* Format */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-slate-900">Competition format</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {FORMATS.map(f => (
            <button
              key={f.value}
              type="button"
              onClick={() => set("format", f.value)}
              className={`rounded-xl border-2 p-4 text-left transition ${
                form.format === f.value
                  ? "border-[#1857E0] bg-blue-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="font-semibold text-slate-900">{f.label}</div>
              <div className="mt-1 text-xs text-slate-500">{f.desc}</div>
            </button>
          ))}
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Entry type</label>
          <div className="flex flex-wrap gap-2">
            {ENTRY_TYPES.map(et => (
              <button
                key={et.value}
                type="button"
                onClick={() => set("entryType", et.value)}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                  form.entryType === et.value
                    ? "border-[#1857E0] bg-[#1857E0] text-white"
                    : "border-slate-200 text-slate-700 hover:border-slate-300"
                }`}
              >
                {et.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Registration & dates */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-slate-900">Registration & dates</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Registration opens</label>
            <input type="datetime-local" value={form.registrationOpensAt} onChange={e => set("registrationOpensAt", e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Registration closes</label>
            <input type="datetime-local" value={form.registrationClosesAt} onChange={e => set("registrationClosesAt", e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Competition starts</label>
            <input type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Competition ends</label>
            <input type="date" value={form.endDate} onChange={e => set("endDate", e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Max entries</label>
            <input type="number" min={2} value={form.maxEntries} onChange={e => set("maxEntries", e.target.value)}
              placeholder="Leave blank for unlimited"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Entry fee (£)</label>
            <input type="number" min={0} step={0.01} value={form.entryFee} onChange={e => set("entryFee", e.target.value)}
              placeholder="0.00 for free"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <input
            type="checkbox"
            id="isPublic"
            checked={form.isPublic}
            onChange={e => set("isPublic", e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-[#1857E0]"
          />
          <label htmlFor="isPublic" className="text-sm text-slate-700">Visible on customer portal</label>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={() => router.back()} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="rounded-xl bg-[#1857E0] px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1832A8] disabled:opacity-60">
          {saving ? "Creating…" : "Create competition"}
        </button>
      </div>
    </form>
  )
}
