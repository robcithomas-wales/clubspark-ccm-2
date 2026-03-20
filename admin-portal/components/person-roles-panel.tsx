"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { UserCheck, Plus, X } from "lucide-react"

const ROLE_OPTIONS = [
  { value: "coach", label: "Coach" },
  { value: "committee_member", label: "Committee Member" },
  { value: "team_captain", label: "Team Captain" },
  { value: "team_manager", label: "Team Manager" },
  { value: "parent", label: "Parent / Guardian" },
  { value: "volunteer", label: "Volunteer" },
  { value: "junior", label: "Junior" },
  { value: "other", label: "Other" },
]

const ROLE_COLOURS: Record<string, string> = {
  coach: "bg-purple-50 text-purple-700 ring-purple-600/20",
  committee_member: "bg-blue-50 text-blue-700 ring-blue-600/20",
  team_captain: "bg-amber-50 text-amber-700 ring-amber-600/20",
  team_manager: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  parent: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  volunteer: "bg-teal-50 text-teal-700 ring-teal-600/20",
  junior: "bg-pink-50 text-pink-700 ring-pink-600/20",
  other: "bg-slate-100 text-slate-600 ring-slate-500/20",
}

function roleLabel(role: string) {
  return ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role
}

interface PersonRole {
  id: string
  role: string
  status: string
  contextLabel?: string | null
  startsAt?: string | null
  endsAt?: string | null
}

interface PersonRolesPanelProps {
  customerId: string
  initialRoles: PersonRole[]
}

export function PersonRolesPanel({ customerId, initialRoles }: PersonRolesPanelProps) {
  const router = useRouter()
  const [roles, setRoles] = useState<PersonRole[]>(initialRoles)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ role: "coach", contextLabel: "", startsAt: "", endsAt: "" })

  async function handleAdd() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/people/${customerId}/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: form.role,
          contextLabel: form.contextLabel || undefined,
          startsAt: form.startsAt || undefined,
          endsAt: form.endsAt || undefined,
        }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d?.message ?? `Error ${res.status}`); return }
      const newRole = await res.json()
      setRoles((r) => [newRole, ...r])
      setAdding(false)
      setForm({ role: "coach", contextLabel: "", startsAt: "", endsAt: "" })
      router.refresh()
    } catch (e: any) {
      setError(e?.message ?? "Unknown error")
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(roleId: string) {
    try {
      await fetch(`/api/people/${customerId}/roles/${roleId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "inactive" }),
      })
      setRoles((r) => r.filter((x) => x.id !== roleId))
      router.refresh()
    } catch { /* silent */ }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
      <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-4">
        <UserCheck className="h-5 w-5 text-slate-400" />
        <h3 className="text-base font-semibold text-slate-900">Roles</h3>
        {roles.length > 0 && (
          <span className="ml-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            {roles.length}
          </span>
        )}
        <button
          onClick={() => { setAdding(true); setError(null) }}
          className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Add role
        </button>
      </div>

      {adding && (
        <div className="border-b border-slate-100 bg-slate-50 px-6 py-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]"
              >
                {ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Context (optional — e.g. team name)</label>
              <input
                type="text"
                placeholder="e.g. First Team, U14s"
                value={form.contextLabel}
                onChange={(e) => setForm((f) => ({ ...f, contextLabel: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Start date (optional)</label>
              <input
                type="date"
                value={form.startsAt}
                onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">End date (optional)</label>
              <input
                type="date"
                value={form.endsAt}
                onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]"
              />
            </div>
          </div>
          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={saving}
              className="inline-flex items-center rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#174ED0] disabled:opacity-50"
            >
              {saving ? "Saving…" : "Assign role"}
            </button>
            <button
              onClick={() => { setAdding(false); setError(null) }}
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {roles.length === 0 && !adding ? (
        <p className="px-6 py-6 text-sm text-slate-500">No roles assigned to this person.</p>
      ) : (
        <div className="flex flex-wrap gap-2 px-6 py-4">
          {roles.map((r) => (
            <div
              key={r.id}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${ROLE_COLOURS[r.role] ?? ROLE_COLOURS.other}`}
            >
              {roleLabel(r.role)}
              {r.contextLabel && <span className="opacity-70">· {r.contextLabel}</span>}
              <button
                onClick={() => handleDeactivate(r.id)}
                className="ml-1 rounded-full hover:opacity-60"
                title="Remove role"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
