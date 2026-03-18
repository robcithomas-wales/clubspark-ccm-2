"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  type PaymentStatus,
  getPaymentStatusClasses,
  getPaymentStatusLabel,
} from "@/lib/payment-status"

export { getPaymentStatusClasses, getPaymentStatusLabel }

export function PaymentStatusButton({
  bookingId,
  paymentStatus,
}: {
  bookingId: string
  paymentStatus: string
}) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function update(newStatus: PaymentStatus) {
    setError(null)
    setIsUpdating(true)
    try {
      const res = await fetch(`/api/bookings/${bookingId}/payment-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: newStatus }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.message ?? "Failed to update payment status.")
        return
      }
      router.refresh()
    } catch {
      setError("Something went wrong.")
    } finally {
      setIsUpdating(false)
    }
  }

  const current = paymentStatus as PaymentStatus
  const isCancellable = current !== "free"

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Payment status
        </span>
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getPaymentStatusClasses(current)}`}>
          {getPaymentStatusLabel(current)}
        </span>
      </div>

      {isCancellable && (
        <div className="flex flex-wrap gap-2">
          {current !== "paid" && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => update("paid")}
              className="inline-flex h-9 items-center rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              Record payment
            </button>
          )}
          {current !== "pending" && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => update("pending")}
              className="inline-flex h-9 items-center rounded-xl border border-violet-300 bg-violet-50 px-4 text-sm font-medium text-violet-700 transition hover:bg-violet-100 disabled:opacity-50"
            >
              Send payment request
            </button>
          )}
          {current !== "refunded" && current === "paid" && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => update("refunded")}
              className="inline-flex h-9 items-center rounded-xl border border-sky-300 bg-sky-50 px-4 text-sm font-medium text-sky-700 transition hover:bg-sky-100 disabled:opacity-50"
            >
              Mark refunded
            </button>
          )}
          <button
              type="button"
              disabled={isUpdating}
              onClick={() => update("free")}
              className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Mark free
            </button>
        </div>
      )}

      {error && (
        <p className="text-sm text-rose-600">{error}</p>
      )}
    </div>
  )
}
