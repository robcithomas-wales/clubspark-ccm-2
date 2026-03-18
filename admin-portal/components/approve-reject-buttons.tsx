"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle, XCircle } from "lucide-react"

export function ApproveRejectButtons({ bookingId }: { bookingId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleApprove() {
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
        throw new Error(json?.message ?? "Failed to approve booking")
      }
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(null)
    }
  }

  async function handleReject() {
    setLoading("reject")
    setError(null)
    try {
      const res = await fetch(`/api/bookings/${bookingId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason || undefined }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json?.message ?? "Failed to reject booking")
      }
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(null)
      setShowRejectForm(false)
    }
  }

  return (
    <div className="border-t border-slate-200 pt-6">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 mb-3">
        Approval
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-4">
        <p className="text-sm text-amber-800">
          This booking is pending approval. Review the details and approve or reject below.
        </p>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {showRejectForm ? (
          <div className="space-y-3">
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional)"
              rows={3}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none resize-none"
            />
            <div className="flex gap-3">
              <button
                onClick={handleReject}
                disabled={loading === "reject"}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                {loading === "reject" ? "Rejecting…" : "Confirm rejection"}
              </button>
              <button
                onClick={() => { setShowRejectForm(false); setRejectReason("") }}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={handleApprove}
              disabled={loading !== null}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" />
              {loading === "approve" ? "Approving…" : "Approve"}
            </button>
            <button
              onClick={() => setShowRejectForm(true)}
              disabled={loading !== null}
              className="flex items-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" />
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
