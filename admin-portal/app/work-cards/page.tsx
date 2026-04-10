"use client"

import { useState, useEffect } from "react"
import { PortalLayout } from "@/components/portal-layout"
import { CreditCard, Plus, Search } from "lucide-react"

export default function WorkCardsPage() {
  const [cards, setCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [sportFilter, setSportFilter] = useState("tennis")
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    personId: "", sport: "tennis", grade: "", category: "", playingLevel: "",
    ltaRating: "", utr: "", ntrp: "", externalRef: "", notes: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    const res = await fetch(`/api/work-cards?sport=${sportFilter}`)
    const json = await res.json()
    setCards(json.data ?? [])
    setLoading(false)
  }

  useEffect(() => { setLoading(true); load() }, [sportFilter])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const payload: any = { ...form }
      if (payload.ltaRating) payload.ltaRating = parseFloat(payload.ltaRating)
      if (payload.utr) payload.utr = parseFloat(payload.utr)
      if (payload.ntrp) payload.ntrp = parseFloat(payload.ntrp)
      Object.keys(payload).forEach(k => { if (payload[k] === "") delete payload[k] })

      const res = await fetch("/api/work-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Failed to save work card")
      setShowForm(false)
      setForm({ personId: "", sport: "tennis", grade: "", category: "", playingLevel: "", ltaRating: "", utr: "", ntrp: "", externalRef: "", notes: "" })
      await load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = cards.filter(c =>
    !search || c.personId?.toLowerCase().includes(search.toLowerCase()) ||
    c.externalRef?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <PortalLayout
      title="Work Cards"
      description="Player grading and eligibility data (LTA rating, UTR, NTRP)."
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by player ID or external ref…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1857E0]/30"
            />
          </div>
          <select
            value={sportFilter}
            onChange={e => setSportFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none"
          >
            {["tennis", "padel", "squash", "badminton"].map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <button
            onClick={() => setShowForm(v => !v)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1032A8]"
          >
            <Plus className="h-4 w-4" />
            Add / update
          </button>
        </div>

        {showForm && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Add or update work card</h3>
            <form onSubmit={handleSave} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { field: "personId", label: "Person ID", required: true },
                { field: "sport", label: "Sport" },
                { field: "grade", label: "Grade" },
                { field: "category", label: "Category (e.g. Adult, Junior)" },
                { field: "playingLevel", label: "Playing level (e.g. County)" },
                { field: "ltaRating", label: "LTA rating", type: "number" },
                { field: "utr", label: "UTR", type: "number" },
                { field: "ntrp", label: "NTRP", type: "number" },
                { field: "externalRef", label: "External ref (LTA Player ID)" },
              ].map(({ field, label, required, type }) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                  <input
                    type={type ?? "text"}
                    step={type === "number" ? "0.01" : undefined}
                    value={(form as any)[field]}
                    onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    required={required}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1857E0]/30"
                  />
                </div>
              ))}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1857E0]/30"
                />
              </div>
              {error && <p className="sm:col-span-2 lg:col-span-3 text-sm text-red-600">{error}</p>}
              <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={submitting} className="rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  {submitting ? "Saving…" : "Save card"}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {loading ? (
            <p className="p-6 text-sm text-slate-500">Loading…</p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-slate-400">
              <CreditCard className="h-8 w-8" />
              <p className="text-sm">No work cards found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Player ID</th>
                  <th className="px-4 py-3">Sport</th>
                  <th className="px-4 py-3">Grade</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">LTA rating</th>
                  <th className="px-4 py-3">UTR</th>
                  <th className="px-4 py-3">Ext. ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{c.personId}</td>
                    <td className="px-4 py-3 capitalize text-slate-600">{c.sport}</td>
                    <td className="px-4 py-3 text-slate-600">{c.grade ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{c.category ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{c.ltaRating != null ? Number(c.ltaRating).toFixed(2) : "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{c.utr != null ? Number(c.utr).toFixed(2) : "—"}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{c.externalRef ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </PortalLayout>
  )
}
