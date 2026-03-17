"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

type Booking = {
  id: string
  bookingReference: string
  startsAt: string
  status: string
}

type Props = {
  seriesId: string
  bookings: Booking[]
}

export function BookingSeriesActions({ seriesId, bookings }: Props) {
  const router = useRouter()
  const [activePanel, setActivePanel] = React.useState<"cancel" | "edit" | null>(null)
  const [cancelMode, setCancelMode] = React.useState<"all" | "from_date" | "single">("all")
  const [editMode, setEditMode] = React.useState<"all" | "from_date" | "single">("all")
  const [fromDate, setFromDate] = React.useState("")
  const [bookingId, setBookingId] = React.useState("")
  const [editFromDate, setEditFromDate] = React.useState("")
  const [editBookingId, setEditBookingId] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const activeBookings = bookings.filter((b) => b.status !== "cancelled")

  async function handleCancel() {
    setError(null)
    if (cancelMode === "from_date" && !fromDate) {
      setError("Please select a date.")
      return
    }
    if (cancelMode === "single" && !bookingId) {
      setError("Please select an occurrence.")
      return
    }
    setIsLoading(true)
    try {
      const res = await fetch(`/api/booking-series/${seriesId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: cancelMode,
          fromDate: cancelMode === "from_date" ? fromDate : undefined,
          bookingId: cancelMode === "single" ? bookingId : undefined,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d?.message ?? "Failed to cancel.")
        return
      }
      router.refresh()
      setActivePanel(null)
    } catch {
      setError("Something went wrong.")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleEdit() {
    setError(null)
    if (editMode === "from_date" && !editFromDate) {
      setError("Please select a date.")
      return
    }
    if (editMode === "single" && !editBookingId) {
      setError("Please select an occurrence.")
      return
    }
    if (!notes.trim()) {
      setError("Please enter updated notes (or any field to update).")
      return
    }
    setIsLoading(true)
    try {
      const res = await fetch(`/api/booking-series/${seriesId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: editMode,
          fromDate: editMode === "from_date" ? editFromDate : undefined,
          bookingId: editMode === "single" ? editBookingId : undefined,
          notes: notes.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d?.message ?? "Failed to update.")
        return
      }
      router.refresh()
      setActivePanel(null)
      setNotes("")
    } catch {
      setError("Something went wrong.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setActivePanel(activePanel === "edit" ? null : "edit")}
          className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Edit series
        </button>
        <button
          type="button"
          onClick={() => setActivePanel(activePanel === "cancel" ? null : "cancel")}
          className="inline-flex h-9 items-center rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
        >
          Cancel series
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {activePanel === "cancel" && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 space-y-4">
          <div className="font-semibold text-rose-800">Cancel bookings</div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Mode</label>
            <div className="flex flex-wrap gap-2">
              {(["all", "from_date", "single"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setCancelMode(m)}
                  className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                    cancelMode === m
                      ? "bg-rose-600 text-white"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {m === "all" ? "All" : m === "from_date" ? "From date" : "Single occurrence"}
                </button>
              ))}
            </div>
          </div>
          {cancelMode === "from_date" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">From date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
              />
            </div>
          )}
          {cancelMode === "single" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Occurrence</label>
              <select
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="">Select an occurrence</option>
                {activeBookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {new Date(b.startsAt).toLocaleDateString("en-GB")} — {b.bookingReference}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className="inline-flex h-9 items-center rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
            >
              {isLoading ? "Cancelling..." : "Confirm cancel"}
            </button>
            <button
              type="button"
              onClick={() => setActivePanel(null)}
              className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {activePanel === "edit" && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
          <div className="font-semibold text-slate-800">Update bookings</div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Mode</label>
            <div className="flex flex-wrap gap-2">
              {(["all", "from_date", "single"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setEditMode(m)}
                  className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                    editMode === m
                      ? "bg-[#1832A8] text-white"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {m === "all" ? "All" : m === "from_date" ? "From date" : "Single occurrence"}
                </button>
              ))}
            </div>
          </div>
          {editMode === "from_date" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">From date</label>
              <input
                type="date"
                value={editFromDate}
                onChange={(e) => setEditFromDate(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
              />
            </div>
          )}
          {editMode === "single" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Occurrence</label>
              <select
                value={editBookingId}
                onChange={(e) => setEditBookingId(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="">Select an occurrence</option>
                {activeBookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {new Date(b.startsAt).toLocaleDateString("en-GB")} — {b.bookingReference}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Updated notes for the selected bookings"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleEdit}
              disabled={isLoading}
              className="inline-flex h-9 items-center rounded-xl bg-[#1832A8] px-4 text-sm font-semibold text-white transition hover:bg-[#142a8c] disabled:opacity-60"
            >
              {isLoading ? "Saving..." : "Save changes"}
            </button>
            <button
              type="button"
              onClick={() => setActivePanel(null)}
              className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
