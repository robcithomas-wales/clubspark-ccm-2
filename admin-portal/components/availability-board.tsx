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
  releasesAt?: string | null
  conflicts: AvailabilityConflict[]
}

type BookableUnit = {
  id: string
  name: string
  unitType?: string | null
  slots?: AvailabilitySlot[]
}

function formatTimeLabel(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(iso))
}

function formatReleasesAt(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(iso))
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

function getUnitTypeClasses(unitType?: string | null) {
  switch ((unitType || "").toLowerCase()) {
    case "full":   return "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
    case "half":   return "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
    case "quarter": return "bg-violet-50 text-violet-700 ring-1 ring-violet-200"
    default:       return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
  }
}

function getUnitTypeLabel(unitType?: string | null) {
  if (!unitType) return "Unknown"
  return unitType.charAt(0).toUpperCase() + unitType.slice(1)
}

function getConflictTitle(slot?: AvailabilitySlot) {
  const firstConflict = slot?.conflicts?.[0]
  return firstConflict?.bookingReference
    ? `${firstConflict.bookingReference} • ${formatTimeLabel(slot!.startsAt)}`
    : `Booked • ${slot ? formatTimeLabel(slot.startsAt) : ""}`
}

function getConflictSubtitle(slot?: AvailabilitySlot) {
  return slot?.conflicts?.[0]?.bookingReference ?? "Booked"
}

export function AvailabilityBoard({
  selectedDate,
  units,
}: {
  selectedDate: string
  units: BookableUnit[]
}) {
  const router = useRouter()

  // Derive slot column keys from the actual slot data so the board always
  // reflects the configured opensAt/closesAt/slotDuration rather than hardcoded hours.
  const slotKeys = React.useMemo<string[]>(() => {
    const seen = new Set<string>()
    for (const unit of units) {
      for (const slot of unit.slots ?? []) {
        seen.add(slot.startsAt)
      }
    }
    return Array.from(seen).sort()
  }, [units])

  const [now, setNow] = React.useState<Date>(new Date())

  React.useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(interval)
  }, [])

  const handleFreeSlotClick = (unitId: string, slot: AvailabilitySlot) => {
    router.push(
      `/create-booking?unit=${unitId}&start=${slot.startsAt}&end=${slot.endsAt}`,
    )
  }

  const handleBookedSlotClick = (slot?: AvailabilitySlot) => {
    const bookingId = slot?.conflicts?.[0]?.id
    if (bookingId) router.push(`/bookings/${bookingId}`)
  }

  // "now" line position
  const firstSlotMs = slotKeys.length > 0 ? new Date(slotKeys[0]).getTime() : 0
  const lastSlotMs  = slotKeys.length > 0 ? new Date(slotKeys[slotKeys.length - 1]).getTime() : 0
  const nowMs = now.getTime()

  const showNowLine =
    isSameUtcDay(now, selectedDate) &&
    slotKeys.length > 0 &&
    nowMs >= firstSlotMs &&
    nowMs <= lastSlotMs

  const unitColumnWidth = 260
  const slotColumnWidth = slotKeys.length > 0 ? Math.floor((1100 - unitColumnWidth) / slotKeys.length) : 64
  const totalWidth = Math.max(1100, unitColumnWidth + slotColumnWidth * slotKeys.length)

  const nowLeft = showNowLine
    ? unitColumnWidth + ((nowMs - firstSlotMs) / (lastSlotMs - firstSlotMs || 1)) *
      (slotColumnWidth * (slotKeys.length - 1))
    : 0

  // First releasesAt across any slot (all slots share the same release time)
  const firstUnreleased = units
    .flatMap((u) => u.slots ?? [])
    .find((s) => !s.isAvailable && s.releasesAt)
  const releasesAt = firstUnreleased?.releasesAt ?? null

  const gridColsStyle = `${unitColumnWidth}px repeat(${slotKeys.length}, minmax(${slotColumnWidth}px, 1fr))`

  if (slotKeys.length === 0) {
    return (
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="px-6 py-12 text-center text-sm text-slate-400">
          No availability data for this date.
        </div>
      </section>
    )
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Availability board</h2>
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
          {releasesAt && (
            <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
              Not yet released
            </span>
          )}
          {showNowLine && (
            <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700 ring-1 ring-red-200">
              Live now
            </span>
          )}
        </div>
      </div>

      {releasesAt && (
        <div className="border-b border-amber-200 bg-amber-50 px-6 py-3">
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Slots not yet released.</span>{" "}
            Bookings for this date open at{" "}
            <span className="font-semibold">{formatReleasesAt(releasesAt)}</span>.
          </p>
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="relative" style={{ minWidth: `${totalWidth}px` }}>
          {showNowLine && (
            <div
              className="pointer-events-none absolute bottom-0 top-0 z-10"
              style={{ left: `${nowLeft}px` }}
            >
              <div className="absolute left-1/2 top-0 -translate-x-1/2 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white shadow-sm">
                Now
              </div>
              <div className="absolute bottom-0 top-6 left-1/2 w-0.5 -translate-x-1/2 bg-red-500/80" />
            </div>
          )}

          {/* Header row */}
          <div
            className="grid border-b border-slate-200 bg-slate-50"
            style={{ gridTemplateColumns: gridColsStyle }}
          >
            <div className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Unit
            </div>
            {slotKeys.map((startsAt) => (
              <div
                key={startsAt}
                className="border-l border-slate-200 px-2 py-4 text-center text-xs font-semibold uppercase tracking-[0.12em] text-slate-500"
              >
                {formatTimeLabel(startsAt)}
              </div>
            ))}
          </div>

          {/* Unit rows */}
          <div className="divide-y divide-slate-200">
            {units.map((unit) => {
              const slotMap = new Map<string, AvailabilitySlot>()
              for (const slot of unit.slots ?? []) {
                slotMap.set(slot.startsAt, slot)
              }

              return (
                <div
                  key={unit.id}
                  className="grid hover:bg-slate-50/70"
                  style={{ gridTemplateColumns: gridColsStyle }}
                >
                  <div className="px-6 py-4">
                    <div className="font-bold text-slate-900">{unit.name}</div>
                    <div className="mt-2">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getUnitTypeClasses(unit.unitType)}`}
                      >
                        {getUnitTypeLabel(unit.unitType)}
                      </span>
                    </div>
                  </div>

                  {slotKeys.map((startsAt) => {
                    const slot = slotMap.get(startsAt)
                    const isAvailable = slot?.isAvailable ?? true
                    const isUnreleased = slot != null && !isAvailable && !!slot.releasesAt

                    return (
                      <div key={startsAt} className="border-l border-slate-200 p-2">
                        {isUnreleased ? (
                          <div className="flex h-14 w-full flex-col items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-2">
                            <div className="text-xs font-semibold text-amber-700">Not released</div>
                          </div>
                        ) : !isAvailable ? (
                          <button
                            type="button"
                            onClick={() => handleBookedSlotClick(slot)}
                            className="flex h-14 w-full flex-col items-start justify-center rounded-xl border border-rose-200 bg-rose-50 px-2 text-left transition hover:bg-rose-100"
                            title={getConflictTitle(slot)}
                          >
                            <div className="w-full truncate text-xs font-semibold text-rose-800">
                              Booked
                            </div>
                            <div className="mt-0.5 w-full truncate text-[11px] text-rose-600">
                              {getConflictSubtitle(slot)}
                            </div>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => slot && handleFreeSlotClick(unit.id, slot)}
                            className="flex h-14 w-full items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                            title={slot ? `Available • ${formatTimeLabel(slot.startsAt)}` : "Available"}
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
