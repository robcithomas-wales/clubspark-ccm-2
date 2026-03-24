"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { PortalLayout } from "@/components/portal-layout"

const inputClass =
  "mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]"
const labelClass = "block text-sm font-medium text-slate-700"

export default function EditRosterMemberPage() {
  const router = useRouter()
  const { id: teamId, memberId } = useParams<{ id: string; memberId: string }>()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    displayName: "",
    position: "",
    shirtNumber: "",
    isGuest: false,
    isJunior: false,
    dateOfBirth: "",
    guardianName: "",
    guardianEmail: "",
    guardianPhone: "",
  })
  const set = (f: string, v: string | boolean) => setForm((p) => ({ ...p, [f]: v }))

  useEffect(() => {
    fetch(`/api/teams/${teamId}/roster/${memberId}`)
      .then((r) => r.json())
      .then((r) => {
        const m = r.data
        if (!m) return
        setForm({
          displayName: m.displayName ?? "",
          position: m.position ?? "",
          shirtNumber: m.shirtNumber != null ? String(m.shirtNumber) : "",
          isGuest: m.isGuest ?? false,
          isJunior: m.isJunior ?? false,
          dateOfBirth: m.dateOfBirth ? m.dateOfBirth.split("T")[0] : "",
          guardianName: m.guardianName ?? "",
          guardianEmail: m.guardianEmail ?? "",
          guardianPhone: m.guardianPhone ?? "",
        })
      })
      .catch(() => setError("Could not load player details"))
      .finally(() => setLoading(false))
  }, [teamId, memberId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/teams/${teamId}/roster/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: form.displayName || undefined,
          position: form.position || undefined,
          shirtNumber: form.shirtNumber ? Number(form.shirtNumber) : null,
          isGuest: form.isGuest,
          isJunior: form.isJunior,
          dateOfBirth: form.dateOfBirth || undefined,
          guardianName: form.guardianName || undefined,
          guardianEmail: form.guardianEmail || undefined,
          guardianPhone: form.guardianPhone || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? "Failed to save changes")
      }
      router.push(`/teams/${teamId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <PortalLayout title="Edit player" description="">
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1857E0] border-t-transparent" />
        </div>
      </PortalLayout>
    )
  }

  return (
    <PortalLayout title="Edit player" description="Update this player's team details.">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Player details */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.12em] text-slate-400">
            Player details
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>Display name *</label>
              <input
                required
                value={form.displayName}
                onChange={(e) => set("displayName", e.target.value)}
                placeholder="e.g. Jamie Smith"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Position</label>
              <input
                value={form.position}
                onChange={(e) => set("position", e.target.value)}
                placeholder="e.g. Goalkeeper, Midfielder"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Shirt number</label>
              <input
                type="number"
                min="1"
                max="99"
                value={form.shirtNumber}
                onChange={(e) => set("shirtNumber", e.target.value)}
                placeholder="e.g. 10"
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2 flex flex-wrap items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isJunior}
                  onChange={(e) => set("isJunior", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#1857E0] focus:ring-[#1857E0]"
                />
                <span className="text-sm font-medium text-slate-700">Junior player (under 18)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isGuest}
                  onChange={(e) => set("isGuest", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#1857E0] focus:ring-[#1857E0]"
                />
                <span className="text-sm font-medium text-slate-700">Guest / one-off player</span>
              </label>
            </div>
          </div>
        </section>

        {/* Guardian section — only for juniors */}
        {form.isJunior && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-[0.12em] text-amber-700">
              Guardian details
            </h2>
            <p className="mb-4 text-sm text-amber-600">
              All match notifications for this player will be sent to their guardian.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Date of birth</label>
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => set("dateOfBirth", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Guardian name</label>
                <input
                  value={form.guardianName}
                  onChange={(e) => set("guardianName", e.target.value)}
                  placeholder="Parent / guardian full name"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Guardian email</label>
                <input
                  type="email"
                  value={form.guardianEmail}
                  onChange={(e) => set("guardianEmail", e.target.value)}
                  placeholder="guardian@example.com"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Guardian phone</label>
                <input
                  type="tel"
                  value={form.guardianPhone}
                  onChange={(e) => set("guardianPhone", e.target.value)}
                  placeholder="07700 900000"
                  className={inputClass}
                />
              </div>
            </div>
          </section>
        )}

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
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </PortalLayout>
  )
}
