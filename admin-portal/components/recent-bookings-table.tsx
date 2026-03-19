"use client"

function formatDateTime(value?: string) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

type Booking = {
  id: string
  bookingReference?: string
  customerFirstName?: string
  customerLastName?: string
  startsAt?: string
  status?: string
}

type Tone = "emerald" | "slate" | "amber" | "red"

function StatusPill({ label, tone }: { label: string; tone: Tone }) {
  const colours: Record<Tone, string> = {
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    slate:   "bg-slate-100  text-slate-600  ring-slate-500/20",
    amber:   "bg-amber-50   text-amber-700  ring-amber-600/20",
    red:     "bg-red-50     text-red-700    ring-red-600/20",
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${colours[tone]}`}>
      {label}
    </span>
  )
}

export function RecentBookingsTable({ bookings }: { bookings: Booking[] }) {
  if (bookings.length === 0) {
    return <div className="text-sm text-slate-500">No bookings found.</div>
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-100">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Reference</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Customer</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Start</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {bookings.map((booking) => (
            <tr key={booking.id} className="transition hover:bg-blue-50/40">
              <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                {booking.bookingReference || booking.id}
              </td>
              <td className="px-4 py-3 text-sm text-slate-700">
                {booking.customerFirstName || booking.customerLastName
                  ? `${booking.customerFirstName || ""} ${booking.customerLastName || ""}`.trim()
                  : "Walk in / not linked"}
              </td>
              <td className="px-4 py-3 text-sm text-slate-700">
                {formatDateTime(booking.startsAt)}
              </td>
              <td className="px-4 py-3">
                <StatusPill
                  label={booking.status || "unknown"}
                  tone={booking.status === "active" ? "emerald" : "slate"}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
