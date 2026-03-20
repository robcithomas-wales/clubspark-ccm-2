"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

const POLICY_TYPES = [
  "advance_booking",
  "booking_window",
  "peak_access",
  "discount",
  "resource_access",
  "other",
]

export function EditPolicyPanel({
  policyId,
  initial,
}: {
  policyId: string
  initial: { name: string; description?: string | null; policyType?: string | null; status: string }
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: initial.name,
    description: initial.description ?? "",
    policyType: initial.policyType ?? "",
    status: initial.status,
  })

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/entitlement-policies/${policyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
          policyType: form.policyType || null,
          status: form.status,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.message ?? `Error ${res.status}`)
      }
      setOpen(false)
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
      >
        Edit policy
      </button>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <h2 className="text-sm font-semibold text-slate-900">Edit Policy</h2>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-500">Name</label>
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-500">Policy Type</label>
        <select
          value={form.policyType}
          onChange={(e) => setForm((f) => ({ ...f, policyType: e.target.value }))}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]"
        >
          <option value="">— Select type —</option>
          {POLICY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-500">Description</label>
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-500">Status</label>
        <select
          value={form.status}
          onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex h-9 items-center rounded-xl bg-[#1857E0] px-4 text-sm font-semibold text-white hover:bg-[#1832A8] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={() => { setOpen(false); setError(null) }}
          className="inline-flex h-9 items-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
