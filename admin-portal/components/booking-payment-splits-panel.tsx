"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CreditCard, PlusCircle, Trash2 } from "lucide-react"

interface PaymentSplit {
  id: string
  payerName: string
  payerEmail: string | null
  payerPersonId: string | null
  amountDue: number
  amountPaid: number
  currency: string
  paymentStatus: string
  notes: string | null
  createdAt: string
}

interface Props {
  bookingId: string
  initialSplits: PaymentSplit[]
  isCancelled: boolean
}

const inputCls =
  "rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0] w-full"

const statusBadge: Record<string, string> = {
  unpaid: "bg-amber-100 text-amber-700",
  partial: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  refunded: "bg-slate-100 text-slate-600",
}

export function BookingPaymentSplitsPanel({ bookingId, initialSplits, isCancelled }: Props) {
  const router = useRouter()
  const [splits, setSplits] = useState<PaymentSplit[]>(initialSplits)
  const [payerName, setPayerName] = useState("")
  const [payerEmail, setPayerEmail] = useState("")
  const [amountDue, setAmountDue] = useState("")
  const [notes, setNotes] = useState("")
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function add() {
    if (!payerName.trim()) { setError("Payer name is required"); return }
    const amount = parseFloat(amountDue)
    if (isNaN(amount) || amount <= 0) { setError("A valid amount is required"); return }
    setError(null)
    setAdding(true)
    try {
      const res = await fetch(`/api/bookings/${bookingId}/payment-splits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payerName: payerName.trim(),
          payerEmail: payerEmail.trim() || undefined,
          amountDue: amount,
          notes: notes.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const json = await res.json()
      setSplits((prev) => [...prev, json.data])
      setPayerName(""); setPayerEmail(""); setAmountDue(""); setNotes("")
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to add split")
    } finally {
      setAdding(false)
    }
  }

  async function remove(splitId: string) {
    setRemoving(splitId)
    try {
      await fetch(`/api/bookings/${bookingId}/payment-splits/${splitId}`, { method: "DELETE" })
      setSplits((prev) => prev.filter((s) => s.id !== splitId))
      router.refresh()
    } finally {
      setRemoving(null)
    }
  }

  const totalDue = splits.reduce((sum, s) => sum + Number(s.amountDue), 0)
  const totalPaid = splits.reduce((sum, s) => sum + Number(s.amountPaid), 0)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900">
            Payment splits ({splits.length})
          </h3>
        </div>
        {splits.length > 0 && (
          <div className="text-xs text-slate-500">
            £{totalPaid.toFixed(2)} / £{totalDue.toFixed(2)} collected
          </div>
        )}
      </div>

      {splits.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-slate-400">
          No payment splits configured.
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {splits.map((s) => (
            <div key={s.id} className="flex items-center gap-4 px-5 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900">{s.payerName}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[s.paymentStatus] ?? "bg-slate-100 text-slate-600"}`}
                  >
                    {s.paymentStatus}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5 space-x-2">
                  <span>
                    £{Number(s.amountDue).toFixed(2)} due
                    {s.amountPaid > 0 && ` · £${Number(s.amountPaid).toFixed(2)} paid`}
                  </span>
                  {s.payerEmail && <span>{s.payerEmail}</span>}
                  {s.notes && <span className="italic text-slate-400">{s.notes}</span>}
                </div>
              </div>
              {!isCancelled && (
                <button
                  onClick={() => remove(s.id)}
                  disabled={removing === s.id}
                  className="shrink-0 text-slate-400 hover:text-red-600 transition disabled:opacity-40"
                  title="Remove split"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!isCancelled && (
        <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/50">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
            Add payer
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Payer name *</label>
              <input
                type="text"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                placeholder="Full name"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Email</label>
              <input
                type="email"
                value={payerEmail}
                onChange={(e) => setPayerEmail(e.target.value)}
                placeholder="email@example.com"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Amount due (£) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amountDue}
                onChange={(e) => setAmountDue(e.target.value)}
                placeholder="0.00"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Paying half"
                className={inputCls}
              />
            </div>
          </div>
          {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
          <button
            onClick={add}
            disabled={adding}
            className="mt-3 flex items-center gap-2 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-medium text-white hover:bg-[#1832A8] transition disabled:opacity-50"
          >
            <PlusCircle className="h-4 w-4" />
            {adding ? "Adding…" : "Add payer"}
          </button>
        </div>
      )}
    </div>
  )
}
