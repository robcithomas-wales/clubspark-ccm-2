"use client"

import { useState } from "react"
import { Plus, CheckCircle2, UserMinus, ChevronDown } from "lucide-react"

const STATUS_COLOURS: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-600/20",
  CONFIRMED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  WITHDRAWN: "bg-red-50 text-red-600 ring-red-500/20",
  DISQUALIFIED: "bg-red-100 text-red-700 ring-red-600/20",
}

interface Props {
  competitionId: string
  competition: any
  initialEntries: any[]
}

export function CompetitionEntriesPanel({ competitionId, competition, initialEntries }: Props) {
  const [entries, setEntries] = useState<any[]>(initialEntries)
  const [saving, setSaving] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newEntry, setNewEntry] = useState({ displayName: "", personId: "", seed: "", divisionId: competition.divisions?.[0]?.id ?? "" })
  const [error, setError] = useState<string | null>(null)

  const divisions = competition.divisions ?? []

  async function updateEntry(entryId: string, data: Record<string, unknown>) {
    setSaving(entryId)
    try {
      const res = await fetch(`/api/competitions/${competitionId}/entries/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error("Failed to update entry")
      const json = await res.json()
      setEntries(prev => prev.map(e => e.id === entryId ? { ...e, ...json.data } : e))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(null)
    }
  }

  async function addEntry() {
    if (!newEntry.displayName) return
    setSaving("new")
    setError(null)
    try {
      const body: Record<string, unknown> = { displayName: newEntry.displayName, divisionId: newEntry.divisionId || undefined }
      if (newEntry.personId) body.personId = newEntry.personId
      else body.personId = `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, "0")}`
      if (newEntry.seed) body.seed = Number(newEntry.seed)

      const res = await fetch(`/api/competitions/${competitionId}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error("Failed to add entry")
      const json = await res.json()
      setEntries(prev => [...prev, json.data])
      setNewEntry({ displayName: "", personId: "", seed: "", divisionId: competition.divisions?.[0]?.id ?? "" })
      setShowAddForm(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(null)
    }
  }

  async function bulkConfirm(divisionId: string) {
    setSaving("bulk")
    try {
      const res = await fetch(`/api/competitions/${competitionId}/entries?action=bulk-confirm&divisionId=${divisionId}`, {
        method: "POST",
      })
      if (!res.ok) throw new Error("Failed")
      // Refresh entries
      const r2 = await fetch(`/api/competitions/${competitionId}/entries`)
      const json = await r2.json()
      setEntries(json.data ?? [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(null)
    }
  }

  const pendingCount = entries.filter(e => e.status === "PENDING").length

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Entries ({entries.length})</h3>
            {pendingCount > 0 && (
              <p className="mt-0.5 text-sm text-amber-600">{pendingCount} pending confirmation</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && divisions.length > 0 && (
              <button
                onClick={() => bulkConfirm(divisions[0].id)}
                disabled={saving === "bulk"}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirm all pending
              </button>
            )}
            <button
              onClick={() => setShowAddForm(v => !v)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1857E0] px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1832A8]"
            >
              <Plus className="h-4 w-4" />
              Add entry
            </button>
          </div>
        </div>

        {showAddForm && (
          <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Name *</label>
                <input
                  value={newEntry.displayName}
                  onChange={e => setNewEntry(n => ({ ...n, displayName: e.target.value }))}
                  placeholder="Player or team name"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-[#1857E0]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Seed</label>
                <input
                  type="number" min={1}
                  value={newEntry.seed}
                  onChange={e => setNewEntry(n => ({ ...n, seed: e.target.value }))}
                  placeholder="Optional"
                  className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-[#1857E0]"
                />
              </div>
              {divisions.length > 1 && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Division</label>
                  <select
                    value={newEntry.divisionId}
                    onChange={e => setNewEntry(n => ({ ...n, divisionId: e.target.value }))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-[#1857E0]"
                  >
                    {divisions.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}
              <button
                onClick={addEntry}
                disabled={saving === "new" || !newEntry.displayName}
                className="rounded-xl bg-[#1857E0] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving === "new" ? "Adding…" : "Add"}
              </button>
              <button onClick={() => setShowAddForm(false)} className="text-sm text-slate-500 hover:text-slate-700">Cancel</button>
            </div>
          </div>
        )}

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-6 py-3">Name</th>
              <th className="px-6 py-3">Division</th>
              <th className="px-6 py-3">Seed</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Payment</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-400">No entries yet. Add the first entry above.</td></tr>
            )}
            {entries.map((entry: any) => {
              const div = divisions.find((d: any) => d.id === entry.divisionId)
              return (
                <tr key={entry.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-900">{entry.displayName}</td>
                  <td className="px-6 py-3 text-slate-600">{div?.name ?? "—"}</td>
                  <td className="px-6 py-3 text-slate-600">{entry.seed ?? "—"}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${STATUS_COLOURS[entry.status] ?? "bg-slate-100 text-slate-600 ring-slate-500/20"}`}>
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${entry.paymentStatus === "paid" ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : "bg-amber-50 text-amber-700 ring-amber-600/20"}`}>
                      {entry.paymentStatus}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      {entry.status === "PENDING" && (
                        <button
                          onClick={() => updateEntry(entry.id, { status: "CONFIRMED" })}
                          disabled={saving === entry.id}
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                        >
                          Confirm
                        </button>
                      )}
                      {entry.status !== "WITHDRAWN" && entry.status !== "DISQUALIFIED" && (
                        <button
                          onClick={() => updateEntry(entry.id, { status: "WITHDRAWN" })}
                          disabled={saving === entry.id}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                        >
                          Withdraw
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
