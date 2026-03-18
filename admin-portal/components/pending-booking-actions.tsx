"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle, XCircle } from "lucide-react"

export function PendingBookingActions({ bookingId }: { bookingId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null)
  const [showReject, setShowReject] = useState(false)
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function approve() {
    setLoading("approve")
    setError(null)
    try {
      const res = await fetch(`/api/bookings/${bookingId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvedBy: "admin" }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json?.message ?? "Failed to approve")
      }
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(null)
    }
  }

  async function reject() {
    setLoading("reject")
    setError(null)
    try {
      const res = await fetch(`/api/bookings/${bookingId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || undefined }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json?.message ?? "Failed to reject")
      }
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(null)
      setShowReject(false)
    }
  }

  if (showReject) {
    return (
      <div className="flex flex-col gap-2 min-w-[200px]">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional)"
          rows={2}
          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-900 focus:outline-none"
        />
        <div className="flex gap-2">
          <button
            onClick={reject}
            disabled={loading === "reject"}
            className="flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            <XCircle className="h-3 w-3" />
            {loading === "reject" ? "Rejecting…" : "Confirm"}
          </button>
          <button
            onClick={() => { setShowReject(false); setReason("") }}
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <button
          onClick={approve}
          disabled={loading !== null}
          className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          <CheckCircle className="h-3 w-3" />
          {loading === "approve" ? "Approving…" : "Approve"}
        </button>
        <button
          onClick={() => setShowReject(true)}
          disabled={loading !== null}
          className="flex items-center gap-1 rounded-lg border border-red-300 bg-white px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          <XCircle className="h-3 w-3" />
          Reject
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
