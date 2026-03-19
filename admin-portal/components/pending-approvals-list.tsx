"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { CheckCircle, XCircle, Clock3, CalendarDays, ChevronRight } from "lucide-react"

function formatDate(v?: string | null) {
  if (!v) return "n/a"
  const d = new Date(v)
  if (isNaN(d.getTime())) return v
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(d)
}

function formatTime(v?: string | null) {
  if (!v) return "n/a"
  const d = new Date(v)
  if (isNaN(d.getTime())) return v
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(d)
}

function getAge(createdAt?: string | null) {
  if (!createdAt) return null
  const mins = Math.round((Date.now() - new Date(createdAt).getTime()) / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function getAgeUrgency(createdAt?: string | null) {
  if (!createdAt) return "text-slate-400"
  const hrs = (Date.now() - new Date(createdAt).getTime()) / 3600000
  if (hrs > 24) return "text-rose-600 font-semibold"
  if (hrs > 4) return "text-amber-600 font-semibold"
  return "text-slate-500"
}

function getCustomerName(b: any) {
  const fn = b.customerFirstName?.trim() || ""
  const ln = b.customerLastName?.trim() || ""
  const full = `${fn} ${ln}`.trim()
  return full || (b.customerId ? "Customer linked" : "Guest / unassigned")
}

interface BookingRowProps {
  booking: any
  unitName: string
}

function BookingApprovalRow({ booking, unitName }: BookingRowProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function handleApprove() {
    setLoading("approve")
    setError(null)
    try {
      const res = await fetch(`/api/bookings/${booking.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvedBy: "admin" }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? "Failed")
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
      const res = await fetch(`/api/bookings/${booking.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason || undefined }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? "Failed")
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(null)
      setShowRejectForm(false)
    }
  }

  const age = getAge(booking.createdAt)
  const ageClass = getAgeUrgency(booking.createdAt)

  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <div className="flex items-start gap-4 px-6 py-4">
        {/* Main info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/bookings/${booking.id}`}
              className="text-sm font-semibold text-slate-900 hover:text-[#1857E0]"
            >
              {booking.bookingReference || `BK-${booking.id.slice(0, 8).toUpperCase()}`}
            </Link>
            <span className="text-sm text-slate-600">{getCustomerName(booking)}</span>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{unitName}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDate(booking.startsAt)}
            </span>
            <span className="flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" />
              {formatTime(booking.startsAt)} – {formatTime(booking.endsAt)}
            </span>
            {age && (
              <span className={`flex items-center gap-1 ${ageClass}`}>
                Waiting {age}
              </span>
            )}
            {booking.notes && (
              <span className="italic text-slate-400 truncate max-w-xs">{booking.notes}</span>
            )}
          </div>

          {error && (
            <p className="mt-2 text-xs text-rose-600">{error}</p>
          )}

          {showRejectForm ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason (optional)"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-400 min-w-0 flex-1 max-w-xs"
              />
              <button
                onClick={handleReject}
                disabled={loading === "reject"}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                <XCircle className="h-3.5 w-3.5" />
                {loading === "reject" ? "Rejecting…" : "Confirm"}
              </button>
              <button
                onClick={() => { setShowRejectForm(false); setRejectReason("") }}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleApprove}
                disabled={loading !== null}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                {loading === "approve" ? "Approving…" : "Approve"}
              </button>
              <button
                onClick={() => setShowRejectForm(true)}
                disabled={loading !== null}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
              >
                <XCircle className="h-3.5 w-3.5" />
                Reject
              </button>
              <Link
                href={`/bookings/${booking.id}`}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                View <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function PendingApprovalsList({
  bookings,
  unitMap,
}: {
  bookings: any[]
  unitMap: Map<string, any>
}) {
  if (bookings.length === 0) {
    return (
      <div className="px-6 py-12 text-center text-sm text-slate-500">
        No pending bookings. All caught up.
      </div>
    )
  }

  return (
    <div>
      {bookings.map((b) => (
        <BookingApprovalRow
          key={b.id}
          booking={b}
          unitName={unitMap.get(b.bookableUnitId)?.name ?? b.bookableUnitId}
        />
      ))}
    </div>
  )
}
