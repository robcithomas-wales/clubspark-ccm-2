import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const COACHING = process.env.NEXT_PUBLIC_COACHING_SERVICE_URL || "http://127.0.0.1:4007"
const VENUE    = process.env.NEXT_PUBLIC_VENUE_SERVICE_URL    || "http://127.0.0.1:4003"
const BOOKING  = process.env.NEXT_PUBLIC_BOOKING_SERVICE_URL  || "http://127.0.0.1:4005"

async function authHeaders() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return {
    "Authorization": `Bearer ${session?.access_token ?? ""}`,
    "Content-Type": "application/json",
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const coachId       = searchParams.get("coachId")
  const date          = searchParams.get("date")          // YYYY-MM-DD
  const durationStr   = searchParams.get("durationMinutes")
  const sport         = searchParams.get("sport")

  if (!coachId || !date || !durationStr) {
    return NextResponse.json({ error: "coachId, date and durationMinutes are required" }, { status: 400 })
  }
  const durationMinutes = Number(durationStr)
  const hdrs = await authHeaders()

  // 1. Get coach slots
  const slotsRes = await fetch(
    `${COACHING}/coaches/${coachId}/availability/slots?date=${date}&durationMinutes=${durationMinutes}`,
    { headers: hdrs, cache: "no-store" },
  )
  if (!slotsRes.ok) return NextResponse.json({ data: [] })
  const { data: rawSlots } = await slotsRes.json() as { data: { startsAt: string; endsAt: string; durationMinutes: number }[] }

  if (rawSlots.length === 0) return NextResponse.json({ data: [] })

  // 2. Get active bookable units for this sport (skip unit check if no sport)
  let suitableUnits: { id: string; name: string; venueId: string; resourceId: string; resource: { id: string; name: string; sport: string | null; venueId: string } }[] = []
  if (sport) {
    const unitsRes = await fetch(
      `${VENUE}/bookable-units?sport=${encodeURIComponent(sport)}`,
      { headers: hdrs, cache: "no-store" },
    )
    if (unitsRes.ok) {
      const { data } = await unitsRes.json()
      suitableUnits = data ?? []
    }
  }

  // If no matching units exist, return slots without unit assignment
  // (club may not have units set up for this sport yet)
  if (suitableUnits.length === 0) {
    return NextResponse.json({
      data: rawSlots.map((s) => ({ ...s, unitId: null, unitName: null, resourceId: null })),
    })
  }

  const unitIds = suitableUnits.map((u) => u.id)

  // 3. Get busy times for those units on this date
  const busyRes = await fetch(
    `${BOOKING}/bookings/unit-busy-times?unitIds=${unitIds.join(",")}&date=${date}`,
    { headers: hdrs, cache: "no-store" },
  )
  const busyTimes: { unitId: string; startsAt: string; endsAt: string }[] =
    busyRes.ok ? ((await busyRes.json()).data ?? []) : []

  // 4. For each slot, find the first unit that is free
  const enriched = rawSlots.flatMap((slot) => {
    const slotStart = new Date(slot.startsAt).getTime()
    const slotEnd   = new Date(slot.endsAt).getTime()

    const freeUnit = suitableUnits.find((unit) => {
      const isBusy = busyTimes.some(
        (b) => b.unitId === unit.id &&
          new Date(b.startsAt).getTime() < slotEnd &&
          new Date(b.endsAt).getTime()   > slotStart,
      )
      return !isBusy
    })

    if (!freeUnit) return []   // no court available — skip this slot
    return [{
      ...slot,
      unitId:     freeUnit.id,
      unitName:   freeUnit.name,
      resourceId: freeUnit.resourceId,
      venueId:    freeUnit.venueId,
    }]
  })

  return NextResponse.json({ data: enriched })
}
