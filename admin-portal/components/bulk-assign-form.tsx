"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search, X, CheckCircle2, AlertCircle } from "lucide-react"

type Plan = {
  id: string
  name?: string | null
  membershipType?: string | null
  price?: number | null
  currency?: string | null
}

type Customer = {
  id: string
  firstName?: string | null
  lastName?: string | null
  email?: string | null
}

interface Props {
  plans: Plan[]
  customers: Customer[]
}

function customerName(c: Customer) {
  return `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "Unnamed"
}

function matchesCustomer(c: Customer, q: string) {
  const low = q.toLowerCase()
  return (
    customerName(c).toLowerCase().includes(low) ||
    (c.email ?? "").toLowerCase().includes(low)
  )
}

export function BulkAssignForm({ plans, customers }: Props) {
  const router = useRouter()
  const [planId, setPlanId] = useState("")
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [memberRole, setMemberRole] = useState("")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const filtered = search.trim().length >= 1
    ? customers.filter((c) => matchesCustomer(c, search))
    : []

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function removeSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  async function handleSubmit() {
    if (!planId || selected.size === 0) return
    setSubmitting(true)
    setError(null)
    setResults(null)

    try {
      const res = await fetch("/api/memberships/bulk-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          customerIds: Array.from(selected),
          startDate,
          memberRole: memberRole || undefined,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.message ?? json?.error ?? `Error ${res.status}`)
        return
      }
      setResults(json)
      setSelected(new Set())
      router.refresh()
    } catch (e: any) {
      setError(e?.message ?? "Unknown error")
    } finally {
      setSubmitting(false)
    }
  }

  const selectedCustomers = customers.filter((c) => selected.has(c.id))
  const selectedPlan = plans.find((p) => p.id === planId)

  return (
    <div className="space-y-6">
      {/* Plan + date */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Step 1 — Choose plan</h3>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">Membership plan</label>
            <select
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#1832A8] focus:ring-4 focus:ring-blue-100"
            >
              <option value="">— Select a plan —</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#1832A8] focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">Member role <span className="font-normal text-slate-400">(optional)</span></label>
            <select
              value={memberRole}
              onChange={(e) => setMemberRole(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#1832A8] focus:ring-4 focus:ring-blue-100"
            >
              <option value="">No role specified</option>
              <option value="player">Player</option>
              <option value="junior">Junior</option>
              <option value="coach">Coach</option>
              <option value="parent">Parent / Guardian</option>
              <option value="manager">Manager</option>
              <option value="admin">Administrator</option>
              <option value="volunteer">Volunteer</option>
            </select>
          </div>
        </div>
      </div>

      {/* People search */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Step 2 — Select people</h3>

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 outline-none focus:border-[#1832A8] focus:ring-4 focus:ring-blue-100"
          />
        </div>

        {/* Search results dropdown */}
        {filtered.length > 0 && (
          <div className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            {filtered.slice(0, 20).map((c) => {
              const isChecked = selected.has(c.id)
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggle(c.id)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50 ${isChecked ? "bg-blue-50/60" : ""}`}
                >
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${isChecked ? "border-blue-600 bg-blue-600" : "border-slate-300"}`}>
                    {isChecked && <span className="text-white text-xs">✓</span>}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900">{customerName(c)}</div>
                    {c.email && <div className="text-xs text-slate-400">{c.email}</div>}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Selected chips */}
        {selectedCustomers.length > 0 && (
          <div className="mt-4">
            <div className="text-xs font-medium text-slate-500 mb-2">{selectedCustomers.length} selected</div>
            <div className="flex flex-wrap gap-2">
              {selectedCustomers.map((c) => (
                <div key={c.id} className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-900">
                  {customerName(c)}
                  <button type="button" onClick={() => removeSelected(c.id)} className="ml-0.5 text-blue-500 hover:text-blue-800">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Summary + submit */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Step 3 — Confirm</h3>

        {planId && selectedCustomers.length > 0 ? (
          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Assign <strong>{selectedPlan?.name}</strong> to <strong>{selectedCustomers.length} people</strong>,
            starting <strong>{startDate}</strong>
            {memberRole ? `, role: ${memberRole}` : ""}.
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-400">Select a plan and at least one person to continue.</p>
        )}

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {results && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {results.success} membership{results.success !== 1 ? "s" : ""} created
            {results.failed > 0 ? `, ${results.failed} failed` : ""}.
          </div>
        )}

        <div className="mt-4">
          <button
            onClick={handleSubmit}
            disabled={!planId || selected.size === 0 || submitting}
            className="rounded-xl bg-[#1832A8] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0F1B3D] disabled:opacity-40"
          >
            {submitting ? "Assigning…" : `Assign to ${selected.size || 0} people`}
          </button>
        </div>
      </div>
    </div>
  )
}
