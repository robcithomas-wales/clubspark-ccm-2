"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2 } from "lucide-react"

type Entry = { key: string; value: string }

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
}: {
  resourceId: string
  initial: Record<string, unknown> | null | undefined
}) {
  const router = useRouter()
  const [entries, setEntries] = useState<Entry[]>(() => toEntries(initial))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        body: JSON.stringify({ publicAttributes: toRecord(entries) }),
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
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
        Public Attributes
      </h2>
      <p className="mb-5 text-xs text-slate-400">
        Key-value attributes visible on the public booking view (e.g. surface, net height, parking).
      </p>

      <div className="space-y-2">
        {entries.length === 0 && (
          <p className="text-sm text-slate-400">No attributes yet.</p>
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

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={addEntry}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <Plus className="h-4 w-4" />
          Add attribute
        </button>
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
