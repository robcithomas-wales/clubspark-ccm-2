"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CreditCard } from "lucide-react"

interface Props {
  membershipId: string
  currentPaymentStatus: string
  paymentRecordedAt?: string | null
  paymentReference?: string | null
  paymentMethod?: string | null
  paymentAmount?: number | null
}

const PAYMENT_STATUSES = [
  { value: "paid", label: "Paid" },
  { value: "part_paid", label: "Part paid" },
  { value: "unpaid", label: "Unpaid" },
  { value: "failed", label: "Failed" },
  { value: "waived", label: "Waived" },
]

const PAYMENT_METHODS = [
  "Cash",
  "Card",
  "Bank transfer",
  "Cheque",
  "Online",
  "Other",
]

function formatDateTime(value?: string | null) {
  if (!value) return null
  const d = new Date(value)
  if (isNaN(d.getTime())) return value
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(d)
}

function formatLabel(value?: string | null) {
  if (!value) return "—"
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

const PAYMENT_BADGE: Record<string, string> = {
  paid:      "bg-emerald-100 text-emerald-700",
  part_paid: "bg-amber-100 text-amber-700",
  failed:    "bg-rose-100 text-rose-700",
  waived:    "bg-sky-100 text-sky-700",
  unpaid:    "bg-slate-100 text-slate-600",
}

export function RecordPaymentPanel({
  membershipId,
  currentPaymentStatus,
  paymentRecordedAt,
  paymentReference,
  paymentMethod,
  paymentAmount,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    paymentStatus: currentPaymentStatus,
    paymentMethod: paymentMethod ?? "",
    paymentReference: paymentReference ?? "",
    paymentAmount: paymentAmount != null ? String(paymentAmount) : "",
  })

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/memberships/${membershipId}/record-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentStatus: form.paymentStatus,
          paymentMethod: form.paymentMethod || undefined,
          paymentReference: form.paymentReference || undefined,
          paymentAmount: form.paymentAmount ? Number(form.paymentAmount) : undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.message ?? `Error ${res.status}`)
        return
      }
      setOpen(false)
      router.refresh()
    } catch (e: any) {
      setError(e?.message ?? "Unknown error")
    } finally {
      setSaving(false)
    }
  }

  const badgeCls = PAYMENT_BADGE[currentPaymentStatus] ?? "bg-slate-100 text-slate-600"

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Payment</h3>
          <p className="mt-0.5 text-xs text-slate-500">Record or update payment details for this membership.</p>
        </div>
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <CreditCard className="h-4 w-4" />
            Record payment
          </button>
        )}
      </div>

      {!open && (
        <div className="grid gap-4 px-6 py-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Status</div>
            <div className="mt-1">
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeCls}`}>
                {formatLabel(currentPaymentStatus)}
              </span>
            </div>
          </div>
          {paymentMethod && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Method</div>
              <div className="mt-1 text-sm text-slate-700">{paymentMethod}</div>
            </div>
          )}
          {paymentReference && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Reference</div>
              <div className="mt-1 text-sm font-mono text-slate-700">{paymentReference}</div>
            </div>
          )}
          {paymentAmount != null && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Amount</div>
              <div className="mt-1 text-sm text-slate-700">£{Number(paymentAmount).toFixed(2)}</div>
            </div>
          )}
          {paymentRecordedAt && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Recorded</div>
              <div className="mt-1 text-sm text-slate-700">{formatDateTime(paymentRecordedAt)}</div>
            </div>
          )}
        </div>
      )}

      {open && (
        <div className="space-y-4 px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Payment status</label>
              <select
                value={form.paymentStatus}
                onChange={(e) => setForm((f) => ({ ...f, paymentStatus: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600"
              >
                {PAYMENT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Payment method</label>
              <select
                value={form.paymentMethod}
                onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600"
              >
                <option value="">— Select method —</option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Reference</label>
              <input
                type="text"
                placeholder="e.g. TXN-12345"
                value={form.paymentReference}
                onChange={(e) => setForm((f) => ({ ...f, paymentReference: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Amount (£)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="0.00"
                value={form.paymentAmount}
                onChange={(e) => setForm((f) => ({ ...f, paymentAmount: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save payment"}
            </button>
            <button
              onClick={() => { setOpen(false); setError(null) }}
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
