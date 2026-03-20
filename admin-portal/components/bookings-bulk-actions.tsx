"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CalendarDays, Clock3, ChevronRight, Trash2, Download } from "lucide-react"

function formatDate(value?: string | null) {
  if (!value) return "n/a"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date)
}

function formatTime(value?: string | null) {
  if (!value) return "n/a"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(date)
}

function getDurationLabel(start?: string | null, end?: string | null) {
  if (!start || !end) return "n/a"
  const minutes = Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000))
  if (minutes < 60) return `${minutes} mins`
  const h = Math.floor(minutes / 60), m = minutes % 60
  return m === 0 ? `${h} hr` : `${h} hr ${m} mins`
}

function shortId(v?: string | null) { return v ? v.slice(0, 8).toUpperCase() : "n/a" }

function getStatusClasses(status?: string | null) {
  switch ((status || "").toLowerCase()) {
    case "active": return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
    case "cancelled": return "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
    case "pending": return "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
    default: return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
  }
}

function getUnitTypeClasses(unitType?: string | null) {
  switch ((unitType || "").toLowerCase()) {
    case "full": return "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
    case "half": return "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
    default: return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
  }
}

function getSourceLabel(source?: string | null) {
  if (!source) return "Manual"
  return source === "walk_in" ? "Walk in" : source.charAt(0).toUpperCase() + source.slice(1)
}

function getSourceClasses(source?: string | null) {
  switch ((source || "").toLowerCase()) {
    case "phone": return "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
    case "admin": return "bg-violet-50 text-violet-700 ring-1 ring-violet-200"
    case "app": return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
    case "walk_in": return "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
    default: return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
  }
}

function getPaymentStatusClasses(status?: string | null) {
  switch ((status || "").toLowerCase()) {
    case "paid": return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
    case "unpaid": return "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
    case "part_paid": return "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
    case "free": return "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
    default: return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
  }
}

function getCustomerName(booking: any) {
  const fn = booking.customerFirstName?.trim() || ""
  const ln = booking.customerLastName?.trim() || ""
  const full = `${fn} ${ln}`.trim()
  if (full) return full
  if (booking.customerId) return "Customer linked"
  return "Guest / unassigned"
}

export function BookingsBulkActions({
  bookings,
  unitMap,
}: {
  bookings: any[]
  unitMap: Map<string, any>
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allCancellable = bookings.filter((b) => b.status !== "cancelled")
  const allSelected = allCancellable.length > 0 && allCancellable.every((b) => selected.has(b.id))

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(allCancellable.map((b) => b.id)))
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleBulkCancel() {
    if (selected.size === 0) return
    setCancelling(true)
    setError(null)
    try {
      const res = await fetch(`/api/bookings/bulk-cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      })
      if (!res.ok) throw new Error("Bulk cancel failed")
      setSelected(new Set())
      router.refresh()
    } catch {
      setError("Some cancellations failed. Please refresh and try again.")
    } finally {
      setCancelling(false)
    }
  }

  function handleExport() {
    const rows = bookings.filter((b) => selected.size === 0 || selected.has(b.id))
    const headers = ["Reference", "Customer", "Unit", "Date", "Start", "End", "Status", "Payment", "Source"]
    const csv = [
      headers.join(","),
      ...rows.map((b) => {
        const unit = unitMap.get(b.bookableUnitId)
        return [
          b.bookingReference || shortId(b.id),
          getCustomerName(b),
          unit?.name || b.bookableUnitId,
          formatDate(b.startsAt),
          formatTime(b.startsAt),
          formatTime(b.endsAt),
          b.status || "",
          b.paymentStatus || "",
          getSourceLabel(b.bookingSource),
        ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
      }),
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `bookings-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-[#1857E0]/5 border-b border-[#1857E0]/10 px-6 py-3">
          <span className="text-sm font-medium text-[#1857E0]">{selected.size} selected</span>
          <button
            onClick={handleBulkCancel}
            disabled={cancelling}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {cancelling ? "Cancelling…" : "Cancel selected"}
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export selected
          </button>
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
      )}

      {selected.size === 0 && (
        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 px-6 py-2">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export all
          </button>
        </div>
      )}

      {/* Column headers — must mirror the flex+inner-grid structure of data rows */}
      <div className="hidden lg:flex items-center border-b border-slate-200 bg-slate-100 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        <div className="flex w-10 shrink-0 items-center justify-center pl-6">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="h-4 w-4 rounded border-slate-300 text-[#1857E0]"
          />
        </div>
        <div className="flex-1 px-4 grid grid-cols-9 gap-3 items-center">
          <div>Booking</div>
          <div>Customer</div>
          <div>Unit</div>
          <div className="text-center">Date</div>
          <div className="text-center">Time</div>
          <div className="text-center">Duration</div>
          <div className="text-center">Source</div>
          <div className="text-center">Status</div>
          <div className="text-center">Payment</div>
        </div>
      </div>

      <div className="divide-y divide-slate-200">
        {bookings.map((booking: any) => {
          const unit = unitMap.get(booking.bookableUnitId)
          const isChecked = selected.has(booking.id)
          const isCancellable = booking.status !== "cancelled"

          return (
            <div
              key={booking.id}
              className={`flex items-center gap-0 transition ${isChecked ? "bg-blue-50/60" : "hover:bg-blue-50/30"}`}
            >
              <div className="flex w-10 shrink-0 items-center justify-center pl-6 py-5">
                {isCancellable && (
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleOne(booking.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 rounded border-slate-300 text-[#1857E0]"
                  />
                )}
              </div>
              <Link
                href={`/bookings/${booking.id}`}
                className="flex-1 px-4 py-5"
              >
                <div className="grid gap-3 lg:grid-cols-9 lg:items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                      <span className="truncate">{booking.bookingReference || `BK-${shortId(booking.id)}`}</span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400">ID {shortId(booking.id)}</div>
                  </div>

                  <div className="min-w-0">
                    <div className="truncate font-medium text-slate-800">{getCustomerName(booking)}</div>
                    <div className="mt-0.5 truncate text-xs text-slate-400">
                      {booking.customerEmail || booking.customerPhone || (booking.customerId ? booking.customerId : "No customer details")}
                    </div>
                  </div>

                  <div className="min-w-0 truncate font-medium text-slate-800">
                    {unit?.name || booking.bookableUnitId}
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 text-sm text-slate-700">
                      <CalendarDays className="h-4 w-4 text-slate-400" />
                      {formatDate(booking.startsAt)}
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 text-sm text-slate-700">
                      <Clock3 className="h-4 w-4 text-slate-400" />
                      <span>{formatTime(booking.startsAt)} – {formatTime(booking.endsAt)}</span>
                    </div>
                  </div>

                  <div className="text-center text-sm text-slate-700">
                    {getDurationLabel(booking.startsAt, booking.endsAt)}
                  </div>

                  <div className="text-center">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getSourceClasses(booking.bookingSource)}`}>
                      {getSourceLabel(booking.bookingSource)}
                    </span>
                  </div>

                  <div className="text-center">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClasses(booking.status)}`}>
                      {booking.status || "unknown"}
                    </span>
                  </div>

                  <div className="text-center">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getPaymentStatusClasses(booking.paymentStatus)}`}>
                      {booking.paymentStatus || "unpaid"}
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
