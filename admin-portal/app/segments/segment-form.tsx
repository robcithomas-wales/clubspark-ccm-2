"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2 } from "lucide-react"

const FIELD_OPTIONS = [
  { value: "lifecycleState", label: "Lifecycle state" },
  { value: "engagementBand", label: "Engagement band" },
  { value: "source", label: "Source" },
  { value: "country", label: "Country" },
]

const OP_OPTIONS = [
  { value: "eq", label: "equals" },
  { value: "neq", label: "does not equal" },
]

interface Condition {
  field: string
  op: string
  value: string
}

interface Props {
  existing?: {
    id: string
    name: string
    description?: string | null
    type: string
    conditions?: Condition[]
  }
}

const inputCls = "rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0] w-full"
const selectCls = "rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] bg-white"

export function SegmentForm({ existing }: Props) {
  const router = useRouter()
  const [name, setName] = useState(existing?.name ?? "")
  const [description, setDescription] = useState(existing?.description ?? "")
  const [type, setType] = useState<"static" | "dynamic">(
    (existing?.type as "static" | "dynamic") ?? "static"
  )
  const [conditions, setConditions] = useState<Condition[]>(existing?.conditions ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addCondition() {
    setConditions((prev) => [...prev, { field: "lifecycleState", op: "eq", value: "" }])
  }

  function updateCondition(i: number, patch: Partial<Condition>) {
    setConditions((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  }

  function removeCondition(i: number) {
    setConditions((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function save() {
    if (!name.trim()) { setError("Name is required"); return }
    setError(null)
    setSaving(true)
    try {
      const url = existing ? `/api/segments/${existing.id}` : "/api/segments"
      const method = existing ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          type,
          conditions: type === "dynamic" ? conditions : [],
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const json = await res.json()
      const id = json.data?.id ?? existing?.id
      router.push(`/segments/${id}`)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. Active members, VIP players" />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Description (optional)</label>
        <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} placeholder="What this segment represents" />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Type</label>
        <div className="flex gap-3">
          {(["static", "dynamic"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                type === t
                  ? "border-[#1857E0] bg-[#1857E0] text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-slate-400">
          {type === "static"
            ? "Add people manually. Membership doesn't change unless you edit it."
            : "Automatically populated from rules below. Rebuild to refresh membership."}
        </p>
      </div>

      {type === "dynamic" && (
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Conditions (all must match)</label>
          {conditions.length === 0 && (
            <p className="text-xs text-slate-400 mb-2">No conditions — will match everyone. Add at least one condition to narrow the segment.</p>
          )}
          <div className="space-y-2">
            {conditions.map((cond, i) => (
              <div key={i} className="flex items-center gap-2 flex-wrap">
                <select
                  value={cond.field}
                  onChange={(e) => updateCondition(i, { field: e.target.value })}
                  className={selectCls}
                >
                  {FIELD_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
                <select
                  value={cond.op}
                  onChange={(e) => updateCondition(i, { op: e.target.value })}
                  className={selectCls}
                >
                  {OP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <input
                  type="text"
                  value={cond.value}
                  onChange={(e) => updateCondition(i, { value: e.target.value })}
                  placeholder="Value"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] w-36"
                />
                <button onClick={() => removeCondition(i)} className="text-slate-400 hover:text-red-600 transition">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={addCondition}
            className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#1857E0] hover:text-[#1832A8] transition"
          >
            <Plus className="h-3.5 w-3.5" />
            Add condition
          </button>
        </div>
      )}

      {error && <div className="text-sm text-red-600">{error}</div>}

      <button
        onClick={save}
        disabled={saving}
        className="rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-medium text-white hover:bg-[#1832A8] transition disabled:opacity-50"
      >
        {saving ? "Saving…" : (existing ? "Save changes" : "Create segment")}
      </button>
    </div>
  )
}
