"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, CalendarDays, User, BookOpen, CreditCard } from "lucide-react"

const STATUS_COLOURS: Record<string, string> = {
  scheduled: "bg-blue-50 text-blue-700 ring-blue-600/20",
  confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  completed: "bg-slate-100 text-slate-600 ring-slate-500/20",
  cancelled: "bg-red-50 text-red-700 ring-red-600/20",
  no_show: "bg-amber-50 text-amber-700 ring-amber-600/20",
}

function formatDateTime(v: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(v))
}

export default function SessionDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetch(`/api/coaching/sessions/${params.id}`)
      .then((r) => r.json())
      .then((json) => { setSession(json.data); setLoading(false) })
      .catch(() => { setError("Failed to load session"); setLoading(false) })
  }, [params.id])

  async function updateStatus(status: string, cancellationReason?: string) {
    setUpdating(true)
    const body: any = { status }
    if (cancellationReason) body.cancellationReason = cancellationReason
    const res = await fetch(`/api/coaching/sessions/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (res.ok) setSession(json.data)
    setUpdating(false)
  }

  async function updatePayment(paymentStatus: string) {
    setUpdating(true)
    const res = await fetch(`/api/coaching/sessions/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentStatus }),
    })
    const json = await res.json()
    if (res.ok) setSession(json.data)
    setUpdating(false)
  }

  async function handleDelete() {
    if (!confirm("Delete this session? This cannot be undone.")) return
    await fetch(`/api/coaching/sessions/${params.id}`, { method: "DELETE" })
    router.push("/coaching/sessions")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-sm text-slate-400">Loading session…</p>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-sm text-red-500">{error ?? "Session not found"}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div>
        <Link
          href="/coaching/sessions"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-900"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to sessions
        </Link>
      </div>

      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              {session.lessonType?.name ?? "Lesson session"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {formatDateTime(session.startsAt)} — {formatDateTime(session.endsAt)}
            </p>
          </div>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset capitalize ${STATUS_COLOURS[session.status] ?? "bg-slate-100 text-slate-600 ring-slate-500/20"}`}>
            {session.status.replace("_", " ")}
          </span>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid gap-px bg-slate-200 rounded-2xl overflow-hidden shadow-sm md:grid-cols-2">
        <div className="flex items-start gap-3 bg-white px-6 py-5">
          <User className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Coach</div>
            <div className="mt-1 text-sm font-medium text-slate-900">{session.coach?.displayName ?? "—"}</div>
          </div>
        </div>
        <div className="flex items-start gap-3 bg-white px-6 py-5">
          <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Lesson type</div>
            <div className="mt-1 text-sm font-medium text-slate-900">
              {session.lessonType?.name ?? "—"}
              {session.lessonType?.sport && (
                <span className="ml-1.5 text-xs text-slate-400 capitalize">({session.lessonType.sport})</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-start gap-3 bg-white px-6 py-5">
          <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Duration</div>
            <div className="mt-1 text-sm font-medium text-slate-900">
              {session.lessonType?.durationMinutes
                ? `${session.lessonType.durationMinutes} minutes`
                : `${Math.round((new Date(session.endsAt).getTime() - new Date(session.startsAt).getTime()) / 60000)} minutes`}
            </div>
          </div>
        </div>
        <div className="flex items-start gap-3 bg-white px-6 py-5">
          <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Payment</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm font-medium text-slate-900 capitalize">{session.paymentStatus}</span>
              {session.priceCharged && (
                <span className="text-xs text-slate-400">
                  £{Number(session.priceCharged).toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </div>
        {session.notes && (
          <div className="flex items-start gap-3 bg-white px-6 py-5 md:col-span-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Notes</div>
              <div className="mt-1 text-sm text-slate-700">{session.notes}</div>
            </div>
          </div>
        )}
        {session.cancellationReason && (
          <div className="flex items-start gap-3 bg-white px-6 py-5 md:col-span-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Cancellation reason</div>
              <div className="mt-1 text-sm text-slate-700">{session.cancellationReason}</div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Actions</h2>

        {/* Status transitions */}
        <div>
          <p className="text-xs text-slate-500 mb-2">Update session status</p>
          <div className="flex flex-wrap gap-2">
            {session.status === "scheduled" && (
              <button
                onClick={() => updateStatus("confirmed")}
                disabled={updating}
                className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
              >
                Confirm
              </button>
            )}
            {(session.status === "scheduled" || session.status === "confirmed") && (
              <button
                onClick={() => updateStatus("completed")}
                disabled={updating}
                className="rounded-xl bg-slate-100 border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
              >
                Mark completed
              </button>
            )}
            {(session.status === "scheduled" || session.status === "confirmed") && (
              <button
                onClick={() => updateStatus("no_show")}
                disabled={updating}
                className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-1.5 text-sm font-medium text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
              >
                No show
              </button>
            )}
            {session.status !== "cancelled" && session.status !== "completed" && (
              <button
                onClick={() => {
                  const reason = prompt("Cancellation reason (optional):")
                  updateStatus("cancelled", reason ?? undefined)
                }}
                disabled={updating}
                className="rounded-xl bg-red-50 border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50"
              >
                Cancel session
              </button>
            )}
          </div>
        </div>

        {/* Payment */}
        <div>
          <p className="text-xs text-slate-500 mb-2">Update payment status</p>
          <div className="flex flex-wrap gap-2">
            {session.paymentStatus !== "paid" && (
              <button
                onClick={() => updatePayment("paid")}
                disabled={updating}
                className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
              >
                Mark paid
              </button>
            )}
            {session.paymentStatus !== "unpaid" && (
              <button
                onClick={() => updatePayment("unpaid")}
                disabled={updating}
                className="rounded-xl bg-slate-100 border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
              >
                Mark unpaid
              </button>
            )}
            {session.paymentStatus !== "waived" && (
              <button
                onClick={() => updatePayment("waived")}
                disabled={updating}
                className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
              >
                Waive
              </button>
            )}
          </div>
        </div>

        {/* Delete */}
        <div className="border-t border-slate-100 pt-4">
          <button
            onClick={handleDelete}
            className="text-sm text-red-500 transition hover:text-red-700"
          >
            Delete session
          </button>
        </div>
      </div>
    </div>
  )
}
