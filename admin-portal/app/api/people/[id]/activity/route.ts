import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const PEOPLE_SERVICE = process.env.NEXT_PUBLIC_PEOPLE_SERVICE_URL || "http://127.0.0.1:4004"
const BOOKING_SERVICE = process.env.NEXT_PUBLIC_BOOKING_SERVICE_URL || "http://127.0.0.1:4005"
const MEMBERSHIP_SERVICE = process.env.NEXT_PUBLIC_MEMBERSHIP_SERVICE_URL || "http://127.0.0.1:4010"

async function getAuthHeaders() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("Not authenticated")
  return { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const headers = await getAuthHeaders()

    const [bookingsRes, membershipsRes, personRes] = await Promise.allSettled([
      fetch(`${BOOKING_SERVICE}/bookings?customerId=${id}&limit=30`, { headers, cache: "no-store" }),
      fetch(`${MEMBERSHIP_SERVICE}/memberships?customerId=${id}&limit=50`, { headers, cache: "no-store" }),
      fetch(`${PEOPLE_SERVICE}/people/${id}`, { headers, cache: "no-store" }),
    ])

    const events: Array<{
      id: string
      type: string
      title: string
      description: string
      date: string
      metadata?: Record<string, unknown>
    }> = []

    // Bookings
    if (bookingsRes.status === "fulfilled" && bookingsRes.value.ok) {
      const json = await bookingsRes.value.json()
      const bookings: any[] = json.data ?? []
      for (const b of bookings) {
        events.push({
          id: `booking-${b.id}`,
          type: b.status === "cancelled" ? "booking_cancelled" : "booking_created",
          title: b.status === "cancelled" ? "Booking cancelled" : "Booking created",
          description: `${b.bookableUnitName ?? b.resourceName ?? "Facility"} — ${new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(b.startsAt))}`,
          date: b.cancelledAt ?? b.createdAt,
          metadata: { bookingId: b.id, status: b.status, reference: b.bookingReference },
        })
        if (b.status === "approved" && b.approvedAt) {
          events.push({
            id: `booking-approved-${b.id}`,
            type: "booking_approved",
            title: "Booking approved",
            description: `${b.bookableUnitName ?? b.resourceName ?? "Facility"} — ${new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(b.startsAt))}`,
            date: b.approvedAt,
            metadata: { bookingId: b.id, reference: b.bookingReference },
          })
        }
      }
    }

    // Memberships
    if (membershipsRes.status === "fulfilled" && membershipsRes.value.ok) {
      const json = await membershipsRes.value.json()
      const memberships: any[] = json.data ?? []
      for (const m of memberships) {
        events.push({
          id: `membership-${m.id}`,
          type: "membership_created",
          title: "Membership created",
          description: `${m.planName ?? m.schemeName ?? "Membership plan"} — ${m.status}`,
          date: m.createdAt,
          metadata: { membershipId: m.id, planName: m.planName, status: m.status },
        })
        if (m.activatedAt) {
          events.push({
            id: `membership-activated-${m.id}`,
            type: "membership_activated",
            title: "Membership activated",
            description: `${m.planName ?? "Membership"}`,
            date: m.activatedAt,
            metadata: { membershipId: m.id },
          })
        }
        if (m.cancelledAt) {
          events.push({
            id: `membership-cancelled-${m.id}`,
            type: "membership_cancelled",
            title: "Membership cancelled",
            description: `${m.planName ?? "Membership"}`,
            date: m.cancelledAt,
            metadata: { membershipId: m.id },
          })
        }
        if (m.expiredAt) {
          events.push({
            id: `membership-expired-${m.id}`,
            type: "membership_expired",
            title: "Membership expired",
            description: `${m.planName ?? "Membership"}`,
            date: m.expiredAt,
            metadata: { membershipId: m.id },
          })
        }
      }
    }

    // Lifecycle history from person record
    if (personRes.status === "fulfilled" && personRes.value.ok) {
      const json = await personRes.value.json()
      const person = json.data ?? json
      const history: any[] = person.lifecycleHistory ?? []
      for (const h of history) {
        events.push({
          id: `lifecycle-${h.id}`,
          type: "lifecycle_changed",
          title: "Lifecycle state changed",
          description: `${h.fromState ?? "—"} → ${h.toState}${h.reason ? ` (${h.reason})` : ""}`,
          date: h.changedAt,
          metadata: { from: h.fromState, to: h.toState, changedBy: h.changedBy },
        })
      }
    }

    // Sort newest first
    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json({ data: events })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
