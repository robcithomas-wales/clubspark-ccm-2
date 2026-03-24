"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PortalLayout } from "@/components/portal-layout"

const SPORTS = ["tennis", "padel", "squash", "badminton", "pickleball", "other"]

export default function NewLessonTypePage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: "",
    description: "",
    sport: "",
    durationMinutes: 60,
    maxParticipants: 1,
    pricePerSession: 0,
    currency: "GBP",
  })

  const set = (field: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/coaching/lesson-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || undefined,
          sport: form.sport || undefined,
          durationMinutes: Number(form.durationMinutes),
          maxParticipants: Number(form.maxParticipants),
          pricePerSession: Number(form.pricePerSession),
          currency: form.currency,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? "Failed to create lesson type")
      }
      router.push("/coaching/lesson-types")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create lesson type")
    } finally {
      setSaving(false)
    }
  }

  return (
    <PortalLayout title="New Lesson Type" description="Define a new type of lesson or session.">
      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Name *</label>
              <input
                required
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Junior Tennis 1-to-1"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Sport</label>
              <select
                value={form.sport}
                onChange={(e) => set("sport", e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]"
              >
                <option value="">— Select —</option>
                {SPORTS.map((s) => (
                  <option key={s} value={s} className="capitalize">{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Duration (minutes) *</label>
              <input
                type="number"
                required
                min={5}
                step={5}
                value={form.durationMinutes}
                onChange={(e) => set("durationMinutes", e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Max participants</label>
              <input
                type="number"
                min={1}
                value={form.maxParticipants}
                onChange={(e) => set("maxParticipants", e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Price per session</label>
              <div className="mt-1 flex">
                <span className="inline-flex items-center rounded-l-xl border border-r-0 border-slate-200 bg-slate-100 px-3 text-sm text-slate-500">
                  {form.currency}
                </span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.pricePerSession}
                  onChange={(e) => set("pricePerSession", e.target.value)}
                  className="w-full rounded-r-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1832A8] disabled:opacity-50"
            >
              {saving ? "Creating…" : "Create lesson type"}
            </button>
          </div>
        </form>
    </PortalLayout>
  )
}
