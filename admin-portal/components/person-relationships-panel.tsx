"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Users, Plus, X } from "lucide-react"

const RELATIONSHIP_OPTIONS = [
  { value: "parent", label: "Parent of" },
  { value: "guardian", label: "Guardian of" },
  { value: "child", label: "Child of" },
  { value: "sibling", label: "Sibling of" },
  { value: "spouse", label: "Spouse / Partner of" },
  { value: "other", label: "Other" },
]

interface Relationship {
  id: string
  relationship: string
  toCustomer: { id: string; firstName?: string | null; lastName?: string | null }
}

interface Household {
  id: string
  name: string
  members: Array<{
    role: string
    customer: { id: string; firstName?: string | null; lastName?: string | null }
  }>
}

interface PersonRelationshipsPanelProps {
  customerId: string
  initialRelationships: Relationship[]
  initialHouseholds: Household[]
}

function personName(p: { firstName?: string | null; lastName?: string | null }) {
  return `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || "Unnamed"
}

export function PersonRelationshipsPanel({
  customerId,
  initialRelationships,
  initialHouseholds,
}: PersonRelationshipsPanelProps) {
  const router = useRouter()
  const [relationships, setRelationships] = useState<Relationship[]>(initialRelationships)
  const [households, setHouseholds] = useState<Household[]>(initialHouseholds)
  const [addingRel, setAddingRel] = useState(false)
  const [addingHousehold, setAddingHousehold] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [relForm, setRelForm] = useState({ toCustomerId: "", relationship: "parent" })
  const [householdName, setHouseholdName] = useState("")

  async function handleAddRelationship() {
    if (!relForm.toCustomerId.trim()) { setError("Please enter the person ID"); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch(`/api/people/${customerId}/relationships`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(relForm),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d?.message ?? `Error ${res.status}`); return }
      const newRel = await res.json()
      setRelationships((r) => [newRel, ...r])
      setAddingRel(false)
      setRelForm({ toCustomerId: "", relationship: "parent" })
      router.refresh()
    } catch (e: any) {
      setError(e?.message ?? "Unknown error")
    } finally {
      setSaving(false)
    }
  }

  async function handleRemoveRelationship(relId: string) {
    try {
      await fetch(`/api/people/${customerId}/relationships/${relId}`, { method: "DELETE" })
      setRelationships((r) => r.filter((x) => x.id !== relId))
      router.refresh()
    } catch { /* silent */ }
  }

  async function handleCreateHousehold() {
    if (!householdName.trim()) { setError("Please enter a household name"); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch("/api/households", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: householdName, memberIds: [customerId] }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d?.message ?? `Error ${res.status}`); return }
      const newHousehold = await res.json()
      setHouseholds((h) => [newHousehold, ...h])
      setAddingHousehold(false)
      setHouseholdName("")
      router.refresh()
    } catch (e: any) {
      setError(e?.message ?? "Unknown error")
    } finally {
      setSaving(false)
    }
  }

  const relLabel = (r: string) => RELATIONSHIP_OPTIONS.find((o) => o.value === r)?.label ?? r

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
      <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-4">
        <Users className="h-5 w-5 text-slate-400" />
        <h3 className="text-base font-semibold text-slate-900">Relationships &amp; Household</h3>
      </div>

      {/* Relationships */}
      <div className="border-b border-slate-100 px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Relationships</p>
          <button
            onClick={() => { setAddingRel(true); setError(null) }}
            className="inline-flex items-center gap-1 text-xs text-[#1857E0] hover:underline"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>

        {addingRel && (
          <div className="mb-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Relationship type</label>
                <select
                  value={relForm.relationship}
                  onChange={(e) => setRelForm((f) => ({ ...f, relationship: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#1857E0]"
                >
                  {RELATIONSHIP_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Person ID</label>
                <input
                  type="text"
                  placeholder="Paste person UUID"
                  value={relForm.toCustomerId}
                  onChange={(e) => setRelForm((f) => ({ ...f, toCustomerId: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#1857E0]"
                />
              </div>
            </div>
            {error && <p className="text-xs text-rose-600">{error}</p>}
            <div className="flex gap-2">
              <button onClick={handleAddRelationship} disabled={saving}
                className="rounded-xl bg-[#1857E0] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
                {saving ? "Saving…" : "Add"}
              </button>
              <button onClick={() => { setAddingRel(false); setError(null) }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600">
                Cancel
              </button>
            </div>
          </div>
        )}

        {relationships.length === 0 ? (
          <p className="text-sm text-slate-400">No relationships recorded.</p>
        ) : (
          <div className="space-y-1.5">
            {relationships.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <div className="text-sm text-slate-700">
                  <span className="text-slate-400 mr-1">{relLabel(r.relationship)}</span>
                  <Link href={`/people/${r.toCustomer.id}`} className="font-medium text-[#1857E0] hover:underline">
                    {personName(r.toCustomer)}
                  </Link>
                </div>
                <button onClick={() => handleRemoveRelationship(r.id)} className="text-slate-300 hover:text-slate-500">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Households */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Households</p>
          <button
            onClick={() => { setAddingHousehold(true); setError(null) }}
            className="inline-flex items-center gap-1 text-xs text-[#1857E0] hover:underline"
          >
            <Plus className="h-3 w-3" /> New household
          </button>
        </div>

        {addingHousehold && (
          <div className="mb-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <input
              type="text"
              placeholder="Household name (e.g. The Williams Family)"
              value={householdName}
              onChange={(e) => setHouseholdName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#1857E0]"
            />
            {error && <p className="text-xs text-rose-600">{error}</p>}
            <div className="flex gap-2">
              <button onClick={handleCreateHousehold} disabled={saving}
                className="rounded-xl bg-[#1857E0] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
                {saving ? "Creating…" : "Create"}
              </button>
              <button onClick={() => { setAddingHousehold(false); setError(null) }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600">
                Cancel
              </button>
            </div>
          </div>
        )}

        {households.length === 0 ? (
          <p className="text-sm text-slate-400">Not part of any household.</p>
        ) : (
          <div className="space-y-2">
            {households.map((h) => (
              <div key={h.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-sm font-medium text-slate-900">{h.name}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {h.members.map((m) => (
                    <span key={m.customer.id} className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ring-1 ring-inset ${
                      m.customer.id === customerId
                        ? "bg-[#1857E0]/10 text-[#1857E0] ring-[#1857E0]/20"
                        : "bg-slate-100 text-slate-600 ring-slate-200"
                    }`}>
                      {personName(m.customer)}
                      {m.role !== "member" && <span className="ml-1 opacity-60">({m.role})</span>}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
