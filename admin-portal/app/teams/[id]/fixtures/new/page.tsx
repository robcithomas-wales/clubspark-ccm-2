"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { PortalLayout } from "@/components/portal-layout"

export default function NewFixturePage() {
  const router = useRouter()
  const { id: teamId } = useParams<{ id: string }>()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    opponent: "",
    kickoffDate: "",
    kickoffTime: "15:00",
    homeAway: "home",
    venue: "",
    meetTime: "",
    durationMinutes: "90",
    matchType: "",
    notes: "",
  })

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const inputClass =
    "mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]"
  const labelClass = "block text-sm font-medium text-slate-700"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      // Combine date + time into an ISO string
      const kickoffAt = new Date(`${form.kickoffDate}T${form.kickoffTime}:00`).toISOString()

      let meetTime: string | undefined
      if (form.meetTime) {
        meetTime = new Date(`${form.kickoffDate}T${form.meetTime}:00`).toISOString()
      }

      const res = await fetch(`/api/teams/${teamId}/fixtures`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opponent: form.opponent,
          kickoffAt,
          homeAway: form.homeAway || undefined,
          venue: form.venue || undefined,
          meetTime,
          durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : undefined,
          matchType: form.matchType || undefined,
          notes: form.notes || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? "Failed to create fixture")
      }
      const { data } = await res.json()
      router.push(`/teams/${teamId}/fixtures/${data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create fixture")
    } finally {
      setSaving(false)
    }
  }

  return (
    <PortalLayout title="Add fixture" description="Schedule a new match for this team.">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Match details */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.12em] text-slate-400">
            Match details
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>Opponent *</label>
              <input
                required
                value={form.opponent}
                onChange={(e) => set("opponent", e.target.value)}
                placeholder="e.g. Town FC"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Date *</label>
              <input
                required
                type="date"
                value={form.kickoffDate}
                onChange={(e) => set("kickoffDate", e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Kick-off time *</label>
              <input
                required
                type="time"
                value={form.kickoffTime}
                onChange={(e) => set("kickoffTime", e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Home / Away</label>
              <select
                value={form.homeAway}
                onChange={(e) => set("homeAway", e.target.value)}
                className={inputClass}
              >
                <option value="home">Home</option>
                <option value="away">Away</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Match type</label>
              <input
                value={form.matchType}
                onChange={(e) => set("matchType", e.target.value)}
                placeholder="e.g. League, Cup, Friendly"
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>Venue</label>
              <input
                value={form.venue}
                onChange={(e) => set("venue", e.target.value)}
                placeholder="Ground name or address"
                className={inputClass}
              />
            </div>
          </div>
        </section>

        {/* Logistics */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.12em] text-slate-400">
            Logistics
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Meet time</label>
              <input
                type="time"
                value={form.meetTime}
                onChange={(e) => set("meetTime", e.target.value)}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-slate-400">When players should arrive (before kick-off)</p>
            </div>

            <div>
              <label className={labelClass}>Duration (minutes)</label>
              <input
                type="number"
                min="1"
                value={form.durationMinutes}
                onChange={(e) => set("durationMinutes", e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={3}
                placeholder="Travel instructions, kit colour, etc."
                className={inputClass}
              />
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[#1857E0] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1832A8] disabled:opacity-50"
          >
            {saving ? "Saving…" : "Add fixture"}
          </button>
        </div>
      </form>
    </PortalLayout>
  )
}
