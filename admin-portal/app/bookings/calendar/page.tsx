import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { PortalLayout } from "@/components/portal-layout"
import { getBookableUnits, getBookings } from "@/lib/api"

// 30-minute slot labels from 06:00 to 22:00
const SLOT_LABELS: string[] = []
for (let h = 6; h < 22; h++) {
  SLOT_LABELS.push(`${String(h).padStart(2, "0")}:00`)
  SLOT_LABELS.push(`${String(h).padStart(2, "0")}:30`)
}

function addDays(dateStr: string, delta: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

function formatDateDisplay(dateStr: string): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "full" }).format(
    new Date(`${dateStr}T00:00:00Z`),
  )
}

export default async function BookingCalendarPage({
  searchParams,
}: {
  searchParams: { date?: string }
}) {
  const today = new Date().toISOString().slice(0, 10)
  const date = searchParams.date ?? today

  const fromDate = `${date}T00:00:00Z`
  const toDate = `${addDays(date, 1)}T00:00:00Z`

  const [unitsRes, bookingsRes] = await Promise.allSettled([
    getBookableUnits(),
    getBookings(1, 200, { fromDate, toDate }),
  ])

  const units: any[] = unitsRes.status === "fulfilled" ? (unitsRes.value as any[]) : []
  const bookingsData = bookingsRes.status === "fulfilled" ? bookingsRes.value : null
  const bookings: any[] = Array.isArray(bookingsData)
    ? bookingsData
    : (bookingsData as any)?.data ?? []

  const activeUnits = units.filter((u) => u.isActive !== false)

  // Map: unitId → bookings
  const bookingsByUnit = new Map<string, any[]>()
  for (const unit of activeUnits) {
    bookingsByUnit.set(unit.id, [])
  }
  for (const booking of bookings) {
    if (booking.status === "cancelled") continue
    const list = bookingsByUnit.get(booking.bookableUnitId)
    if (list) list.push(booking)
  }

  // For each cell (unit × slot), check if a booking covers it
  function bookingForCell(unitId: string, slotLabel: string): any | null {
    const [h, m] = slotLabel.split(":").map(Number)
    const slotMinutes = h * 60 + m
    const list = bookingsByUnit.get(unitId) ?? []
    for (const b of list) {
      const start = new Date(b.startsAt)
      const end = new Date(b.endsAt)
      const startMin = start.getUTCHours() * 60 + start.getUTCMinutes()
      const endMin = end.getUTCHours() * 60 + end.getUTCMinutes()
      if (slotMinutes >= startMin && slotMinutes < endMin) return b
    }
    return null
  }

  const statusColour: Record<string, string> = {
    active: "bg-blue-100 text-blue-800 border-blue-200",
    pending: "bg-amber-100 text-amber-800 border-amber-200",
  }

  const prevDate = addDays(date, -1)
  const nextDate = addDays(date, 1)

  return (
    <PortalLayout
      title="Booking Calendar"
      description="Day view of booked slots across all active bookable units."
    >
      {/* Date navigation */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href={`/bookings/calendar?date=${prevDate}`}
          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-[#1857E0]/30 hover:text-[#1857E0]"
        >
          <ChevronLeft className="h-4 w-4" />
          {prevDate}
        </Link>

        <div className="text-center">
          <h2 className="text-lg font-semibold text-slate-900">{formatDateDisplay(date)}</h2>
          {date !== today && (
            <Link
              href="/bookings/calendar"
              className="mt-1 inline-block text-xs text-[#1857E0] hover:underline"
            >
              Back to today
            </Link>
          )}
        </div>

        <Link
          href={`/bookings/calendar?date=${nextDate}`}
          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-[#1857E0]/30 hover:text-[#1857E0]"
        >
          {nextDate}
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {activeUnits.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No active bookable units found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-md">
          <table className="min-w-full text-xs">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr>
                <th className="w-16 border-b border-r border-slate-200 px-3 py-3 text-left font-semibold text-slate-500">
                  Time
                </th>
                {activeUnits.map((unit) => (
                  <th
                    key={unit.id}
                    className="min-w-[120px] border-b border-r border-slate-200 px-3 py-3 text-left font-semibold text-slate-700"
                  >
                    {unit.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {SLOT_LABELS.map((slot) => (
                <tr key={slot} className="hover:bg-slate-50/60">
                  <td className="border-r border-slate-200 px-3 py-1.5 font-mono text-slate-400">
                    {slot}
                  </td>
                  {activeUnits.map((unit) => {
                    const booking = bookingForCell(unit.id, slot)
                    return (
                      <td key={unit.id} className="border-r border-slate-200 px-1.5 py-1">
                        {booking ? (
                          <Link
                            href={`/bookings/${booking.id}`}
                            className={`block rounded-lg border px-2 py-1 leading-tight transition hover:opacity-80 ${statusColour[booking.status] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}
                          >
                            <div className="font-semibold">
                              {booking.bookingReference}
                            </div>
                            {(booking.customerFirstName || booking.customerLastName) && (
                              <div className="truncate text-[10px] opacity-75">
                                {[booking.customerFirstName, booking.customerLastName]
                                  .filter(Boolean)
                                  .join(" ")}
                              </div>
                            )}
                          </Link>
                        ) : null}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PortalLayout>
  )
}
