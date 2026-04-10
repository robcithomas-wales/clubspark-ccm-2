"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { PortalLayout } from "@/components/portal-layout"
import { VenueGroupSelectors } from "@/components/venue-group-selectors"

export default function EditResourcePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [venues, setVenues] = useState<{ id: string; name: string }[]>([])

  const [form, setForm] = useState({
    name: "",
    resourceType: "court",
    venueId: "",
    groupId: "",
    sport: "",
    surface: "",
    colour: "#1857E0",
    description: "",
    isIndoor: false,
    hasLighting: false,
    isActive: true,
    bookingPurposes: "",
  })

  useEffect(() => {
    Promise.all([
      fetch(`/api/resources/${id}`).then((r) => r.json()),
      fetch("/api/venues").then((r) => r.json()),
    ]).then(([resourceJson, venuesJson]) => {
      const r = resourceJson?.data ?? resourceJson
      const v = venuesJson?.data ?? []
      setVenues(v)
      setForm({
        name: r.name ?? "",
        resourceType: r.resourceType ?? "court",
        venueId: r.venueId ?? "",
        groupId: r.groupId ?? "",
        sport: r.sport ?? "",
        surface: r.surface ?? "",
        colour: r.colour ?? "#1857E0",
        description: r.description ?? "",
        isIndoor: r.isIndoor ?? false,
        hasLighting: r.hasLighting ?? false,
        isActive: r.isActive ?? true,
        bookingPurposes: (r.bookingPurposes ?? []).join(", "),
      })
      setLoading(false)
    }).catch(() => {
      setError("Failed to load resource.")
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
      const res = await fetch(`/api/resources/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          resourceType: form.resourceType,
          groupId: form.groupId || null,
          sport: form.sport || undefined,
          surface: form.surface || undefined,
          colour: form.colour || undefined,
          description: form.description.trim() || undefined,
          isIndoor: form.isIndoor,
          hasLighting: form.hasLighting,
          isActive: form.isActive,
          bookingPurposes: form.bookingPurposes
            ? form.bookingPurposes.split(",").map((s) => s.trim()).filter(Boolean)
            : [],
        }),
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(`Failed to save: ${res.status} ${err}`)
      }
      router.push(`/resources/${id}`)
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.")
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <PortalLayout title="Edit Resource">
        <div className="flex items-center justify-center py-24 text-sm text-slate-400">Loading…</div>
      </PortalLayout>
    )
  }

  return (
    <PortalLayout title={`Edit: ${form.name}`} description="Update resource details.">
      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">Resource details</h2>
          </div>
          <div className="space-y-5 p-6">

            {/* Name + Type */}
            <div className="grid gap-4 sm:grid-cols-2">
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Type <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={form.resourceType}
                  onChange={(e) => set("resourceType", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#1857E0] bg-white"
                >
                  {["court","pitch","pool","lane","table","rink","studio","other"].map((t) => (
                    <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Venue + Group (reactive) */}
            <div className="grid gap-4 sm:grid-cols-2">
              <VenueGroupSelectors
                venues={venues}
                defaultVenueId={form.venueId}
                defaultGroupId={form.groupId}
              />
            </div>

            {/* Sport + Surface */}
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
                    <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Surface</label>
                <select
                  value={form.surface}
                  onChange={(e) => set("surface", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#1857E0] bg-white"
                >
                  <option value="">Not specified</option>
                  {["hard","grass","clay","artificial_grass","carpet","wood","concrete","sand","water","other"].map((s) => (
                    <option key={s} value={s}>{s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Colour + Booking Purposes */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Colour</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.colour}
                    onChange={(e) => set("colour", e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded-lg border border-slate-200 p-1"
                  />
                  <span className="text-xs text-slate-400">Used on the availability board</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Booking Purposes</label>
                <input
                  type="text"
                  value={form.bookingPurposes}
                  onChange={(e) => set("bookingPurposes", e.target.value)}
                  placeholder="match, training, social"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#1857E0] transition"
                />
                <p className="mt-1 text-xs text-slate-400">Comma-separated</p>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Optional notes about this resource"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#1857E0] transition"
              />
            </div>

            {/* Toggles */}
            <div className="space-y-2">
              {[
                { field: "isIndoor" as const, label: "Indoor", desc: "This resource is indoors or covered." },
                { field: "hasLighting" as const, label: "Has lighting", desc: "Floodlights available — can be used as a pricing attribute." },
                { field: "isActive" as const, label: "Active", desc: "Inactive resources are hidden from booking." },
              ].map(({ field, label, desc }) => (
                <label key={field} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form[field] as boolean}
                    onChange={(e) => set(field, e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300"
                  />
                  <div>
                    <div className="text-sm font-medium text-slate-900">{label}</div>
                    <div className="mt-0.5 text-xs text-slate-500">{desc}</div>
                  </div>
                </label>
              ))}
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
            onClick={() => router.push(`/resources/${id}`)}
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </PortalLayout>
  )
}
