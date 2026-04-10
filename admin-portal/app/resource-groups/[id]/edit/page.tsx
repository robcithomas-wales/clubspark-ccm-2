"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { PortalLayout } from "@/components/portal-layout"

export default function EditResourceGroupPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [venues, setVenues] = useState<{ id: string; name: string }[]>([])

  const [form, setForm] = useState({
    name: "",
    venueId: "",
    sport: "",
    colour: "#1857E0",
    description: "",
    sortOrder: 0,
  })

  useEffect(() => {
    Promise.all([
      fetch(`/api/resource-groups/${id}`).then((r) => r.json()),
      fetch("/api/venues").then((r) => r.json()),
    ]).then(([groupJson, venuesJson]) => {
      const g = groupJson?.data ?? groupJson
      setVenues(venuesJson?.data ?? [])
      setForm({
        name: g.name ?? "",
        venueId: g.venueId ?? "",
        sport: g.sport ?? "",
        colour: g.colour ?? "#1857E0",
        description: g.description ?? "",
        sortOrder: g.sortOrder ?? 0,
      })
      setLoading(false)
    }).catch(() => {
      setError("Failed to load group.")
      setLoading(false)
    })
  }, [id])

  function set(field: keyof typeof form, value: any) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/resource-groups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          sport: form.sport || undefined,
          colour: form.colour || undefined,
          description: form.description.trim() || undefined,
          sortOrder: Number(form.sortOrder),
        }),
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(`Failed to save: ${res.status} ${err}`)
      }
      router.push(`/resource-groups/${id}`)
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.")
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <PortalLayout title="Edit Resource Group">
        <div className="flex items-center justify-center py-24 text-sm text-slate-400">Loading…</div>
      </PortalLayout>
    )
  }

  const venue = venues.find((v) => v.id === form.venueId)

  return (
    <PortalLayout title={`Edit: ${form.name}`} description="Update resource group details.">
      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">Group details</h2>
          </div>
          <div className="space-y-5 p-6">

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-2 focus:ring-[#1857E0]/20 transition"
              />
            </div>

            {/* Venue (read-only — can't reassign a group to a different venue) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Venue</label>
              <div className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500">
                {venue?.name ?? form.venueId ?? "—"}
              </div>
              <p className="mt-1 text-xs text-slate-400">Venue cannot be changed after creation.</p>
            </div>

            {/* Sport + Sort order */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Sport</label>
                <select
                  value={form.sport}
                  onChange={(e) => set("sport", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#1857E0] bg-white"
                >
                  <option value="">Not specified</option>
                  {["tennis","padel","football","cricket","squash","badminton","basketball","swimming","rugby","hockey","other"].map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Sort order</label>
                <input
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={(e) => set("sortOrder", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-2 focus:ring-[#1857E0]/20 transition"
                />
                <p className="mt-1 text-xs text-slate-400">Lower numbers appear first.</p>
              </div>
            </div>

            {/* Colour */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Colour</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.colour}
                  onChange={(e) => set("colour", e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded-lg border border-slate-200 p-1"
                />
                <span className="text-xs text-slate-400">Used to visually distinguish the group on the availability board.</span>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Optional notes about this group"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#1857E0] transition"
              />
            </div>

          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving || !form.name.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1445c0] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/resource-groups/${id}`)}
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>

      </form>
    </PortalLayout>
  )
}
