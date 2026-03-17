"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

type AvailabilityConflict = {
  id: string
  bookableUnitId: string
  bookingReference?: string | null
  startsAt?: string | null
  endsAt?: string | null
}

type AvailabilitySlot = {
  startsAt: string
  endsAt: string
  isAvailable: boolean
  conflicts: AvailabilityConflict[]
}

type BookableUnit = {
  id: string
  name: string
  unitType?: string | null
  slots?: AvailabilitySlot[]
}

function formatTimeLabel(hour: number) {
  return `${hour.toString().padStart(2, "0")}:00`
}

function toDateTime(date: string, hour: number) {
  return new Date(`${date}T${hour.toString().padStart(2, "0")}:00:00Z`)
}

function getUnitTypeClasses(unitType?: string | null) {
  switch ((unitType || "").toLowerCase()) {
    case "full":
      return "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
    case "half":
      return "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
    case "quarter":
      return "bg-violet-50 text-violet-700 ring-1 ring-violet-200"
    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
  }
}

function getUnitTypeLabel(unitType?: string | null) {
  if (!unitType) return "Unknown"
  return unitType.charAt(0).toUpperCase() + unitType.slice(1)
}

function formatDateLabel(date: string) {
  const value = new Date(`${date}T00:00:00Z`)

  if (Number.isNaN(value.getTime())) return date

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value)
}

function isSameUtcDay(date: Date, ymd: string) {
  const year = date.getUTCFullYear()
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0")
  const day = `${date.getUTCDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}` === ymd
}

function getConflictTitle(slot?: AvailabilitySlot, hour?: number) {
  const firstConflict = slot?.conflicts?.[0]

  if (!firstConflict) {
    return `Booked${typeof hour === "number" ? ` • ${formatTimeLabel(hour)}` : ""}`
  }

  return `${firstConflict.bookingReference || "Booked"}${typeof hour === "number" ? ` • ${formatTimeLabel(hour)}` : ""}`
}

function getConflictSubtitle(slot?: AvailabilitySlot) {
  const firstConflict = slot?.conflicts?.[0]

  if (!firstConflict) return "Booked"
  if (firstConflict.bookingReference) return firstConflict.bookingReference
  return "Booked"
}

export function AvailabilityBoard({
  selectedDate,
  units,
}: {
  selectedDate: string
  units: BookableUnit[]
}) {
  const router = useRouter()

  const hours = React.useMemo(
    () => Array.from({ length: 15 }, (_, index) => index + 8),
    []
  )

  const [now, setNow] = React.useState<Date>(new Date())

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date())
    }, 60000)

    return () => window.clearInterval(interval)
  }, [])

  const handleFreeSlotClick = (
    unitId: string,
    start: Date,
    end: Date
  ) => {
    const startIso = start.toISOString()
    const endIso = end.toISOString()

    router.push(
      `/create-booking?unit=${unitId}&start=${startIso}&end=${endIso}`
    )
  }

  const handleBookedSlotClick = (slot?: AvailabilitySlot) => {
    const bookingId = slot?.conflicts?.[0]?.id

    if (!bookingId) return

    router.push(`/bookings/${bookingId}`)
  }

  const minTableWidth = 1100
  const unitColumnWidth = 260
  const slotCount = hours.length
  const slotColumnWidth = (minTableWidth - unitColumnWidth) / slotCount

  const showNowLine =
    isSameUtcDay(now, selectedDate) &&
    now.getUTCHours() >= hours[0] &&
    now.getUTCHours() < hours[hours.length - 1] + 1

  const nowMinutesFromStart =
    (now.getUTCHours() - hours[0]) * 60 + now.getUTCMinutes()

  const nowLeft =
    unitColumnWidth + (nowMinutesFromStart / 60) * slotColumnWidth

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Availability board
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Visual availability by bookable unit for {formatDateLabel(selectedDate)}.
          </p>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
            Available
          </span>
          <span className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 ring-1 ring-rose-200">
            Booked
          </span>
          {showNowLine ? (
            <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700 ring-1 ring-red-200">
              Live now
            </span>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="relative min-w-[1100px]">
          {showNowLine ? (
            <div
              className="pointer-events-none absolute bottom-0 top-0 z-10"
              style={{ left: `${nowLeft}px` }}
            >
              <div className="absolute left-1/2 top-0 -translate-x-1/2 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white shadow-sm">
                Now
              </div>
              <div className="absolute bottom-0 top-6 left-1/2 w-0.5 -translate-x-1/2 bg-red-500/80" />
            </div>
          ) : null}

          <div className="grid grid-cols-[260px_repeat(15,minmax(64px,1fr))] border-b border-slate-200 bg-slate-50">
            <div className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Unit
            </div>

            {hours.map((hour) => (
              <div
                key={hour}
                className="border-l border-slate-200 px-2 py-4 text-center text-xs font-semibold uppercase tracking-[0.12em] text-slate-500"
              >
                {formatTimeLabel(hour)}
              </div>
            ))}
          </div>

          <div className="divide-y divide-slate-200">
            {units.map((unit) => {
              const unitSlots = Array.isArray(unit.slots) ? unit.slots : []

              return (
                <div
                  key={unit.id}
                  className="grid grid-cols-[260px_repeat(15,minmax(64px,1fr))] hover:bg-slate-50/70"
                >
                  <div className="px-6 py-4">
                    <div className="font-bold text-slate-900">{unit.name}</div>
                    <div className="mt-2">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getUnitTypeClasses(
                          unit.unitType
                        )}`}
                      >
                        {getUnitTypeLabel(unit.unitType)}
                      </span>
                    </div>
                  </div>

                  {hours.map((hour) => {
                    const slotStart = toDateTime(selectedDate, hour)
                    const slotEnd = toDateTime(selectedDate, hour + 1)

                    const matchingSlot = unitSlots.find((slot) => {
                      return new Date(slot.startsAt).getTime() === slotStart.getTime()
                    })

                    const isAvailable = matchingSlot
                      ? matchingSlot.isAvailable
                      : true

                    return (
                      <div
                        key={`${unit.id}-${hour}`}
                        className="border-l border-slate-200 p-2"
                      >
                        {!isAvailable ? (
                          <button
                            type="button"
                            onClick={() => handleBookedSlotClick(matchingSlot)}
                            className="flex h-14 w-full flex-col items-start justify-center rounded-xl border border-rose-200 bg-rose-50 px-2 text-left transition hover:bg-rose-100"
                            title={getConflictTitle(matchingSlot, hour)}
                          >
                            <div className="w-full truncate text-xs font-semibold text-rose-800">
                              Booked
                            </div>
                            <div className="mt-0.5 w-full truncate text-[11px] text-rose-600">
                              {getConflictSubtitle(matchingSlot)}
                            </div>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              handleFreeSlotClick(
                                unit.id,
                                slotStart,
                                slotEnd
                              )
                            }
                            className="flex h-14 w-full items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                            title={`Available • ${formatTimeLabel(hour)}`}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}