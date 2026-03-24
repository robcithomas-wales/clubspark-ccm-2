"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { PortalLayout } from "@/components/portal-layout"

export default function NewRosterMemberPage() {
  const router = useRouter()
  const { id: teamId } = useParams<{ id: string }>()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isJunior, setIsJunior] = useState(false)

  const [form, setForm] = useState({
    displayName: "",
    email: "",
    phone: "",
    position: "",
    shirtNumber: "",
    isGuest: false,
    dateOfBirth: "",
    guardianName: "",
    guardianEmail: "",
    guardianPhone: "",
  })

  const set = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const inputClass =
    "mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]"
  const labelClass = "block text-sm font-medium text-slate-700"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/teams/${teamId}/roster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: form.displayName,
          email: form.email || undefined,
          phone: form.phone || undefined,
          position: form.position || undefined,
          shirtNumber: form.shirtNumber ? Number(form.shirtNumber) : undefined,
          isGuest: form.isGuest,
          isJunior,
          dateOfBirth: form.dateOfBirth || undefined,
          guardianName: form.guardianName || undefined,
          guardianEmail: form.guardianEmail || undefined,
          guardianPhone: form.guardianPhone || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? "Failed to add player")
      }
      router.push(`/teams/${teamId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add player")
    } finally {
      setSaving(false)
    }
  }

  return (
    <PortalLayout title="Add player" description="Add a player to this team's roster.">
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
              <label className={labelClass}>Full name *</label>
              <input
                required
                value={form.displayName}
                onChange={(e) => set("displayName", e.target.value)}
                placeholder="e.g. Jamie Smith"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="player@example.com"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="07700 900000"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Position</label>
              <input
                value={form.position}
                onChange={(e) => set("position", e.target.value)}
                placeholder="e.g. Midfielder"
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

            <div className="sm:col-span-2 flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isJunior}
                  onChange={(e) => setIsJunior(e.target.checked)}
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
                <span className="text-sm font-medium text-slate-700">Guest player</span>
              </label>
            </div>
          </div>
        </section>

        {/* Guardian details — only shown for juniors */}
        {isJunior && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-[0.12em] text-amber-700">
              Guardian details
            </h2>
            <p className="mb-4 text-sm text-amber-600">
              Required for junior players. All notifications will be sent to the guardian.
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
            {saving ? "Adding…" : "Add player"}
          </button>
        </div>
      </form>
    </PortalLayout>
  )
}
