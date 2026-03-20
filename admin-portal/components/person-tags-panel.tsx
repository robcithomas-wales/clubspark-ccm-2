"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Tag, Plus, X } from "lucide-react"

type PersonTag = {
  tagId: string
  tag: { id: string; name: string; colour?: string | null }
}

type CatalogueTag = {
  id: string
  name: string
  colour?: string | null
}

interface PersonTagsPanelProps {
  customerId: string
  personTags: PersonTag[]
  catalogueTags: CatalogueTag[]
}

function tagStyle(colour?: string | null) {
  if (colour) {
    return { backgroundColor: colour + "20", color: colour, outline: `1px solid ${colour}40` }
  }
  return undefined
}

export function PersonTagsPanel({ customerId, personTags, catalogueTags }: PersonTagsPanelProps) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [selectedTagId, setSelectedTagId] = useState("")
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const appliedTagIds = new Set(personTags.map((pt) => pt.tagId))
  const available = catalogueTags.filter((t) => !appliedTagIds.has(t.id))

  async function handleApply() {
    if (!selectedTagId) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/customers/${customerId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId: selectedTagId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.message ?? `Error ${res.status}`)
        return
      }
      setAdding(false)
      setSelectedTagId("")
      router.refresh()
    } catch (e: any) {
      setError(e?.message ?? "Unknown error")
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(tagId: string) {
    setRemoving(tagId)
    setError(null)
    try {
      const res = await fetch(`/api/customers/${customerId}/tags/${tagId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.message ?? `Error ${res.status}`)
        return
      }
      router.refresh()
    } catch (e: any) {
      setError(e?.message ?? "Unknown error")
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-3">
          <Tag className="h-5 w-5 text-slate-400" />
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Tags</h2>
            <p className="mt-0.5 text-xs text-slate-500">Labels for segmentation and filtering.</p>
          </div>
        </div>
        {!adding && available.length > 0 && (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
            Add tag
          </button>
        )}
      </div>

      <div className="px-6 py-5 space-y-4">
        {personTags.length === 0 && !adding ? (
          <p className="text-sm text-slate-500">No tags applied yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {personTags.map((pt) => (
              <span
                key={pt.tagId}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset"
                style={tagStyle(pt.tag.colour) ?? { backgroundColor: "#f1f5f9", color: "#475569", outline: "1px solid #cbd5e1" }}
              >
                {pt.tag.name}
                <button
                  onClick={() => handleRemove(pt.tagId)}
                  disabled={removing === pt.tagId}
                  className="opacity-60 transition hover:opacity-100 disabled:opacity-30"
                  aria-label={`Remove ${pt.tag.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {adding && (
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Choose tag</label>
              <select
                value={selectedTagId}
                onChange={(e) => setSelectedTagId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]"
              >
                <option value="">Select a tag…</option>
                {available.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleApply}
              disabled={saving || !selectedTagId}
              className="inline-flex items-center rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#174ED0] disabled:opacity-50"
            >
              {saving ? "Adding…" : "Add"}
            </button>
            <button
              onClick={() => { setAdding(false); setSelectedTagId(""); setError(null) }}
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        )}
      </div>
    </div>
  )
}
