import Link from "next/link"
import { CalendarDays } from "lucide-react"
import { getBookings } from "@/lib/api"

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value))
}

function formatDuration(startsAt: string, endsAt: string) {
  const mins = (new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000
  if (mins < 60) return `${mins}min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

const STATUS_COLOURS: Record<string, string> = {
  active: "bg-blue-50 text-blue-700 ring-blue-600/20",
  pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  cancelled: "bg-red-50 text-red-700 ring-red-600/20",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
}

export async function PersonBookingsPanel({ customerId }: { customerId: string }) {
  let bookings: any[] = []

  try {
    const result = await getBookings(1, 10, { customerId })
    bookings = result.data ?? []
  } catch {
    // non-fatal
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
      <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-4">
        <CalendarDays className="h-5 w-5 text-slate-400" />
        <h3 className="text-base font-semibold text-slate-900">Booking history</h3>
        {bookings.length > 0 && (
          <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            {bookings.length} recent
          </span>
        )}
      </div>

      {bookings.length === 0 ? (
        <p className="px-6 py-6 text-sm text-slate-500">No bookings found for this person.</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {bookings.map((booking) => (
            <Link
              key={booking.id}
              href={`/bookings/${booking.id}`}
              className="flex items-center gap-4 px-6 py-4 transition hover:bg-blue-50/40"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 text-sm">{booking.bookingReference}</span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${STATUS_COLOURS[booking.status] ?? "bg-slate-100 text-slate-600 ring-slate-500/20"}`}
                  >
                    {booking.status}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {formatDateTime(booking.startsAt)} · {formatDuration(booking.startsAt, booking.endsAt)}
                  {booking.unitName && ` · ${booking.unitName}`}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
