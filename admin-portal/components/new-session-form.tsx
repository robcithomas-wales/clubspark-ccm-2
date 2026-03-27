"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export function NewSessionForm() {
  const router = useRouter()
  const [coaches, setCoaches] = useState<any[]>([])
  const [lessonTypes, setLessonTypes] = useState<any[]>([])
  const [form, setForm] = useState({
    coachId: "",
    lessonTypeId: "",
    customerId: "",
    startsAt: "",
    endsAt: "",
    notes: "",
    paymentStatus: "unpaid",
    priceCharged: "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/coaching/coaches?limit=100")
      .then((r) => r.json())
      .then((r) => {
        const data = r.data ?? []
        setCoaches(data)
        if (data.length > 0) setForm((f) => ({ ...f, coachId: data[0].id }))
      })
      .catch(() => {})

    fetch("/api/coaching/lesson-types?limit=100")
      .then((r) => r.json())
      .then((r) => {
        const data = r.data ?? []
        setLessonTypes(data)
        if (data.length > 0) setForm((f) => ({ ...f, lessonTypeId: data[0].id }))
      })
      .catch(() => {})
  }, [])

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload: Record<string, unknown> = {
        coachId: form.coachId,
        lessonTypeId: form.lessonTypeId,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        paymentStatus: form.paymentStatus,
      }
      if (form.customerId.trim()) payload.customerId = form.customerId.trim()
      if (form.notes.trim()) payload.notes = form.notes.trim()
      if (form.priceCharged) payload.priceCharged = parseFloat(form.priceCharged)

      const res = await fetch("/api/coaching/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.message ?? "Failed to create session")
      router.push(`/coaching/sessions/${json.data.id}`)
    } catch (e: any) {
      setError(e.message)
      setSaving(false)
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-2 focus:ring-[#1857E0]/10"
  const labelClass = "block text-sm font-medium text-slate-700 mb-1"

  return (
    <div className="space-y-4">
      <Link
        href="/coaching/sessions"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-900"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to sessions
      </Link>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Session details</h2>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className={labelClass}>Coach *</label>
              <select
                required
                value={form.coachId}
                onChange={(e) => set("coachId", e.target.value)}
                className={inputClass}
              >
                <option value="">Select coach…</option>
                {coaches.map((c) => (
                  <option key={c.id} value={c.id}>{c.displayName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Lesson type *</label>
              <select
                required
                value={form.lessonTypeId}
                onChange={(e) => set("lessonTypeId", e.target.value)}
                className={inputClass}
              >
                <option value="">Select lesson type…</option>
                {lessonTypes.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}{t.sport ? ` (${t.sport})` : ""}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Start date & time *</label>
              <input
                type="datetime-local"
                required
                value={form.startsAt}
                onChange={(e) => set("startsAt", e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>End date & time *</label>
              <input
                type="datetime-local"
                required
                value={form.endsAt}
                onChange={(e) => set("endsAt", e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Customer ID <span className="text-slate-400 font-normal">(optional)</span></label>
              <input
                type="text"
                value={form.customerId}
                onChange={(e) => set("customerId", e.target.value)}
                placeholder="People record UUID"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Price charged (£) <span className="text-slate-400 font-normal">(optional)</span></label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.priceCharged}
                onChange={(e) => set("priceCharged", e.target.value)}
                placeholder="e.g. 35.00"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Payment status</label>
              <select
                value={form.paymentStatus}
                onChange={(e) => set("paymentStatus", e.target.value)}
                className={inputClass}
              >
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
                <option value="waived">Waived</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Notes <span className="text-slate-400 font-normal">(optional)</span></label>
              <textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={3}
                placeholder="Any notes for this session…"
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-10 items-center rounded-xl bg-[#1857E0] px-5 text-sm font-semibold text-white transition hover:bg-[#1832A8] disabled:opacity-50"
          >
            {saving ? "Booking…" : "Book session"}
          </button>
          <Link
            href="/coaching/sessions"
            className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
