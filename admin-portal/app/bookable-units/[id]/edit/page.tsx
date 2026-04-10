"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { PortalLayout } from "@/components/portal-layout"

export default function EditBookableUnitPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [allUnits, setAllUnits] = useState<{ id: string; name: string }[]>([])
  const [venueName, setVenueName] = useState("")
  const [resourceName, setResourceName] = useState("")

  const [form, setForm] = useState({
    name: "",
    unitType: "full",
    sortOrder: 0,
    capacity: "" as string | number,
    isActive: true,
    isOptionalExtra: false,
    parentUnitId: "",
    // read-only context
    venueId: "",
    resourceId: "",
  })

  useEffect(() => {
    Promise.all([
      fetch(`/api/bookable-units`).then((r) => r.json()),
      fetch(`/api/venues`).then((r) => r.json()),
      fetch(`/api/resources`).then((r) => r.json()),
    ]).then(([unitsJson, venuesJson, resourcesJson]) => {
      const units: any[] = unitsJson?.data ?? []
      const venues: any[] = venuesJson?.data ?? []
      const resources: any[] = resourcesJson?.data ?? []

      const unit = units.find((u) => u.id === id)
      if (!unit) {
        setError("Bookable unit not found.")
        setLoading(false)
        return
      }

      const venue = venues.find((v) => v.id === unit.venueId)
      const resource = resources.find((r) => r.id === unit.resourceId)
      setVenueName(venue?.name ?? unit.venueId ?? "—")
      setResourceName(resource?.name ?? unit.resourceId ?? "—")

      setAllUnits(units.filter((u) => u.id !== id).map((u) => ({ id: u.id, name: u.name })))
      setForm({
        name: unit.name ?? "",
        unitType: unit.unitType ?? "full",
        sortOrder: unit.sortOrder ?? 0,
        capacity: unit.capacity ?? "",
        isActive: unit.isActive ?? true,
        isOptionalExtra: unit.isOptionalExtra ?? false,
        parentUnitId: unit.parentUnitId ?? "",
        venueId: unit.venueId ?? "",
        resourceId: unit.resourceId ?? "",
      })
      setLoading(false)
    }).catch(() => {
      setError("Failed to load bookable unit.")
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
      const res = await fetch(`/api/bookable-units/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          unitType: form.unitType,
          sortOrder: Number(form.sortOrder),
          capacity: form.capacity !== "" ? Number(form.capacity) : null,
          isActive: form.isActive,
          isOptionalExtra: form.isOptionalExtra,
          parentUnitId: form.parentUnitId || null,
        }),
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(`Failed to save: ${res.status} ${err}`)
      }
      router.push(`/bookable-units/${id}`)
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.")
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <PortalLayout title="Edit Bookable Unit">
        <div className="flex items-center justify-center py-24 text-sm text-slate-400">Loading…</div>
      </PortalLayout>
    )
  }

  return (
    <PortalLayout title={`Edit: ${form.name}`} description="Update bookable unit details.">
      <form onSubmit={handleSubmit} className="space-y-6">

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">Unit details</h2>
          </div>
          <div className="p-6">
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

              {/* Name — full width */}
              <div className="md:col-span-2 xl:col-span-3">
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

              {/* Venue (read-only) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Venue</label>
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-700">{venueName}</div>
                <p className="mt-1 text-xs text-slate-400">Cannot be changed after creation.</p>
              </div>

              {/* Resource (read-only) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Resource</label>
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-700">{resourceName}</div>
                <p className="mt-1 text-xs text-slate-400">Cannot be changed after creation.</p>
              </div>

              {/* Unit type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Unit type</label>
                <select
                  value={form.unitType}
                  onChange={(e) => set("unitType", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#1857E0] bg-white"
                >
                  <option value="full">Full</option>
                  <option value="half">Half</option>
                  <option value="third">Third</option>
                  <option value="quarter">Quarter</option>
                  <option value="lane">Lane</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Capacity */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Capacity</label>
                <input
                  type="number"
                  min={1}
                  value={form.capacity}
                  onChange={(e) => set("capacity", e.target.value)}
                  placeholder="e.g. 4"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-2 focus:ring-[#1857E0]/20 transition"
                />
                <p className="mt-1 text-xs text-slate-400">Maximum players/participants.</p>
              </div>

              {/* Sort order */}
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

              {/* Parent unit */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Parent unit</label>
                <select
                  value={form.parentUnitId}
                  onChange={(e) => set("parentUnitId", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#1857E0] bg-white"
                >
                  <option value="">None</option>
                  {allUnits.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-400">Set if this is a sub-division of another unit.</p>
              </div>

              {/* Toggles — full width */}
              <div className="md:col-span-2 xl:col-span-3 grid gap-3 sm:grid-cols-2">
                {[
                  { field: "isActive" as const, label: "Active", desc: "Inactive units are hidden from booking." },
                  { field: "isOptionalExtra" as const, label: "Optional extra", desc: "Shown as an add-on rather than a primary bookable unit." },
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
            onClick={() => router.push(`/bookable-units/${id}`)}
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>

      </form>
    </PortalLayout>
  )
}
