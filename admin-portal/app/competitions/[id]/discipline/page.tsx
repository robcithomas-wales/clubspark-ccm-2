"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { PortalLayout } from "@/components/portal-layout"
import { ShieldAlert, Plus, ChevronDown, ChevronUp } from "lucide-react"

const STATUS_COLOURS: Record<string, string> = {
  OPEN: "bg-red-100 text-red-700",
  UNDER_REVIEW: "bg-amber-100 text-amber-700",
  RESOLVED: "bg-green-100 text-green-700",
  APPEALED: "bg-purple-100 text-purple-700",
  CLOSED: "bg-slate-100 text-slate-600",
}

const OUTCOME_LABELS: Record<string, string> = {
  WARNING: "Warning",
  FINE: "Fine",
  MATCH_BAN: "Match ban",
  COMPETITION_BAN: "Competition ban",
  SUSPENSION: "Suspension",
  DISQUALIFICATION: "Disqualification",
  NO_ACTION: "No action",
}

export default function CompetitionDisciplinePage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const [cases, setCases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ displayName: "", description: "" })
  const [actionForm, setActionForm] = useState<{ caseId: string; outcome: string; banMatches?: string; notes?: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadCases() {
    const res = await fetch(`/api/discipline?competitionId=${id}`)
    const json = await res.json()
    setCases(json.data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadCases() }, [id])

  async function createCase(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/discipline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, competitionId: id }),
      })
      if (!res.ok) throw new Error("Failed to create case")
      setShowForm(false)
      setForm({ displayName: "", description: "" })
      await loadCases()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function addAction(e: React.FormEvent) {
    e.preventDefault()
    if (!actionForm) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/discipline/${actionForm.caseId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outcome: actionForm.outcome,
          banMatches: actionForm.banMatches ? parseInt(actionForm.banMatches) : undefined,
          notes: actionForm.notes,
        }),
      })
      if (!res.ok) throw new Error("Failed to add action")
      setActionForm(null)
      await loadCases()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function updateStatus(caseId: string, status: string) {
    await fetch(`/api/discipline/${caseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    await loadCases()
  }

  return (
    <PortalLayout
      title="Discipline"
      description="Manage disciplinary cases for this competition."
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">{cases.length} case(s)</p>
          <button
            onClick={() => setShowForm(v => !v)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1032A8]"
          >
            <Plus className="h-4 w-4" />
            New case
          </button>
        </div>

        {showForm && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Open a new case</h3>
            <form onSubmit={createCase} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Player / Team name</label>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1857E0]/30"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1857E0]/30"
                  required
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={submitting} className="rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1032A8] disabled:opacity-50">
                  {submitting ? "Creating…" : "Create case"}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : cases.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-slate-400">
            <ShieldAlert className="h-8 w-8" />
            <p className="text-sm">No disciplinary cases</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cases.map((c: any) => (
              <div key={c.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div
                  className="flex items-center justify-between gap-4 p-4 cursor-pointer hover:bg-slate-50"
                  onClick={() => setExpanded(e => e === c.id ? null : c.id)}
                >
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="h-5 w-5 text-red-500 shrink-0" />
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{c.displayName}</p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{c.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOURS[c.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {c.status.replace(/_/g, " ")}
                    </span>
                    {expanded === c.id ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  </div>
                </div>

                {expanded === c.id && (
                  <div className="border-t border-slate-100 p-4 space-y-4">
                    {/* Actions taken */}
                    {c.actions?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Actions</p>
                        <div className="space-y-2">
                          {c.actions.map((a: any) => (
                            <div key={a.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                              <span className="font-medium text-slate-800">{OUTCOME_LABELS[a.outcome] ?? a.outcome}</span>
                              {a.banMatches && <span className="text-slate-500">· {a.banMatches} match ban</span>}
                              {a.suspendedUntil && <span className="text-slate-500">· until {new Date(a.suspendedUntil).toLocaleDateString()}</span>}
                              {a.notes && <span className="text-slate-500">· {a.notes}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add action form */}
                    {actionForm?.caseId === c.id ? (
                      <form onSubmit={addAction} className="space-y-3 rounded-xl border border-slate-200 p-4">
                        <p className="text-sm font-semibold text-slate-800">Add action</p>
                        <select
                          value={actionForm.outcome}
                          onChange={e => setActionForm(f => f ? { ...f, outcome: e.target.value } : null)}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        >
                          {Object.entries(OUTCOME_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                        {(actionForm.outcome === "MATCH_BAN") && (
                          <input
                            type="number"
                            placeholder="Number of matches"
                            value={actionForm.banMatches ?? ""}
                            onChange={e => setActionForm(f => f ? { ...f, banMatches: e.target.value } : null)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          />
                        )}
                        <input
                          type="text"
                          placeholder="Notes (optional)"
                          value={actionForm.notes ?? ""}
                          onChange={e => setActionForm(f => f ? { ...f, notes: e.target.value } : null)}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setActionForm(null)} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-600">Cancel</button>
                          <button type="submit" disabled={submitting} className="rounded-xl bg-[#1857E0] px-3 py-1.5 text-xs font-semibold text-white">Add</button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setActionForm({ caseId: c.id, outcome: "WARNING" })}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          + Add action
                        </button>
                        {c.status === "OPEN" && (
                          <button onClick={() => updateStatus(c.id, "UNDER_REVIEW")} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100">
                            Mark under review
                          </button>
                        )}
                        {c.status !== "RESOLVED" && c.status !== "CLOSED" && (
                          <button onClick={() => updateStatus(c.id, "RESOLVED")} className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100">
                            Resolve
                          </button>
                        )}
                        {c.status === "RESOLVED" && (
                          <button onClick={() => updateStatus(c.id, "CLOSED")} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                            Close
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  )
}
