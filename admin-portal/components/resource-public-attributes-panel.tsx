"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2 } from "lucide-react"

type Entry = { key: string; value: string }

const BUILT_IN_ATTRIBUTES = [
  { key: "surface", label: "Surface" },
  { key: "isIndoor", label: "Indoor / Outdoor" },
  { key: "hasLighting", label: "Floodlighting" },
  { key: "description", label: "Description" },
  { key: "sport", label: "Sport" },
]

function toEntries(obj: Record<string, unknown> | null | undefined): Entry[] {
  if (!obj || typeof obj !== "object") return []
  return Object.entries(obj).map(([key, value]) => ({ key, value: String(value) }))
}

function toRecord(entries: Entry[]): Record<string, string> {
  return Object.fromEntries(entries.filter((e) => e.key.trim()).map((e) => [e.key.trim(), e.value]))
}

export function ResourcePublicAttributesPanel({
  resourceId,
  initial,
  initialVisibleAttributes,
}: {
  resourceId: string
  initial: Record<string, unknown> | null | undefined
  initialVisibleAttributes?: string[]
}) {
  const router = useRouter()
  const [entries, setEntries] = useState<Entry[]>(() => toEntries(initial))
  const [visibleAttributes, setVisibleAttributes] = useState<string[]>(
    () => initialVisibleAttributes ?? ["surface", "isIndoor", "hasLighting", "description", "sport"]
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleVisible(key: string) {
    setVisibleAttributes((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
    setSaved(false)
  }

  function addEntry() {
    setEntries((prev) => [...prev, { key: "", value: "" }])
    setSaved(false)
  }

  function removeEntry(i: number) {
    setEntries((prev) => prev.filter((_, idx) => idx !== i))
    setSaved(false)
  }

  function updateEntry(i: number, field: "key" | "value", val: string) {
    setEntries((prev) => prev.map((e, idx) => idx === i ? { ...e, [field]: val } : e))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch(`/api/resources/${resourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicAttributes: toRecord(entries),
          visibleAttributes,
        }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json?.message ?? "Failed to save attributes")
      }
      setSaved(true)
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
      {/* Visibility toggles */}
      <div>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
          Attribute Visibility
        </h2>
        <p className="mb-4 text-xs text-slate-400">
          Choose which built-in attributes are shown to customers on the booking page and mobile app.
        </p>
        <div className="space-y-2">
          {BUILT_IN_ATTRIBUTES.map(({ key, label }) => (
            <label key={key} className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={visibleAttributes.includes(key)}
                onChange={() => toggleVisible(key)}
                className="h-4 w-4 rounded border-slate-300 accent-[#1857E0]"
              />
              <span className="text-sm text-slate-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Extra public attributes */}
      <div>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
          Extra Public Attributes
        </h2>
        <p className="mb-4 text-xs text-slate-400">
          Additional key-value attributes shown on the public booking view (e.g. net height, parking).
        </p>
        <div className="space-y-2">
          {entries.length === 0 && (
            <p className="text-sm text-slate-400">No extra attributes yet.</p>
          )}
          {entries.map((entry, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={entry.key}
                onChange={(e) => updateEntry(i, "key", e.target.value)}
                placeholder="Attribute name"
                className="h-9 flex-1 rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-[#1857E0]"
              />
              <input
                value={entry.value}
                onChange={(e) => updateEntry(i, "value", e.target.value)}
                placeholder="Value"
                className="h-9 flex-1 rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-[#1857E0]"
              />
              <button
                type="button"
                onClick={() => removeEntry(i)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:border-red-200 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addEntry}
          className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <Plus className="h-4 w-4" />
          Add attribute
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex h-9 items-center rounded-xl bg-[#1857E0] px-4 text-sm font-semibold text-white hover:bg-[#1832A8] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {saved && <span className="text-sm text-emerald-600 font-medium">Saved</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  )
}
