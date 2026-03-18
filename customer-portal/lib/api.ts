import { createClient } from "./supabase/client"

const VENUE_URL = process.env.NEXT_PUBLIC_VENUE_SERVICE_URL!
const BOOKING_URL = process.env.NEXT_PUBLIC_BOOKING_SERVICE_URL!
const CUSTOMER_URL = process.env.NEXT_PUBLIC_CUSTOMER_SERVICE_URL!
const MEMBERSHIP_URL = process.env.NEXT_PUBLIC_MEMBERSHIP_SERVICE_URL!

// ─── Auth headers ─────────────────────────────────────────────────────────────

async function authHeaders(tenantId: string): Promise<Record<string, string>> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("Not authenticated")
  return {
    "Authorization": `Bearer ${session.access_token}`,
    "x-tenant-id": tenantId,
    "Content-Type": "application/json",
  }
}

// ─── Organisation (public) ────────────────────────────────────────────────────

export type Org = {
  id: string
  tenantId: string
  name: string
  slug: string
  primaryColour: string
  logoUrl: string | null
  about: string | null
  address: string | null
  phone: string | null
  email: string | null
  mapsEmbedUrl: string | null
  isPublished: boolean
}

export async function fetchOrgBySlug(slug: string): Promise<Org | null> {
  const res = await fetch(`${VENUE_URL}/organisations/public/by-slug?slug=${encodeURIComponent(slug)}`, {
    cache: "no-store",
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error("Failed to fetch organisation")
  const json = await res.json()
  return json.data
}

// ─── Auth / registration ──────────────────────────────────────────────────────

export async function registerCustomer(data: {
  tenantId: string
  email: string
  password: string
  firstName: string
  lastName: string
}): Promise<{ message: string }> {
  const res = await fetch(`${VENUE_URL}/organisations/public/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json?.message ?? "Registration failed")
  return json.data
}

// ─── Venues ───────────────────────────────────────────────────────────────────

export type Venue = {
  id: string
  name: string
  city: string | null
  timezone: string
}

export async function fetchVenues(tenantId: string): Promise<Venue[]> {
  const headers = await authHeaders(tenantId)
  const res = await fetch(`${VENUE_URL}/venues`, { headers, cache: "no-store" })
  if (!res.ok) throw new Error("Failed to fetch venues")
  const json = await res.json()
  return json.data ?? []
}

// ─── Resources ────────────────────────────────────────────────────────────────

export type Resource = {
  id: string
  name: string
  resourceType: string
  sport: string | null
  surface: string | null
  isIndoor: boolean | null
  colour: string | null
  description: string | null
  isActive: boolean
}

export async function fetchResources(tenantId: string, venueId: string): Promise<Resource[]> {
  const headers = await authHeaders(tenantId)
  const res = await fetch(`${VENUE_URL}/resources?venueId=${venueId}&isActive=true`, { headers, cache: "no-store" })
  if (!res.ok) throw new Error("Failed to fetch resources")
  const json = await res.json()
  return json.data ?? []
}

// ─── Availability ─────────────────────────────────────────────────────────────

export type Slot = {
  start: string
  end: string
  available: boolean
  unitId: string
  unitName: string
}

export async function fetchAvailability(
  tenantId: string,
  venueId: string,
  resourceId: string,
  date: string,
): Promise<Slot[]> {
  const headers = await authHeaders(tenantId)

  const [unitsRes, availRes] = await Promise.all([
    fetch(`${VENUE_URL}/venues/${venueId}/units`, { headers, cache: "no-store" }),
    fetch(`${BOOKING_URL}/availability/day?venueId=${venueId}&date=${date}`, { headers, cache: "no-store" }),
  ])

  if (!unitsRes.ok || !availRes.ok) throw new Error("Failed to fetch availability")

  const unitsJson = await unitsRes.json()
  const availJson = await availRes.json()

  const allUnits: { id: string; name: string; resourceId: string; isActive: boolean }[] = unitsJson.data ?? []
  const resourceUnitIds = new Set(allUnits.filter((u) => u.resourceId === resourceId && u.isActive).map((u) => u.id))

  const units: { id: string; name: string; slots: { startsAt: string; endsAt: string; isAvailable: boolean }[] }[] =
    availJson.data?.units ?? []

  const slots: Slot[] = []
  for (const unit of units) {
    if (!resourceUnitIds.has(unit.id)) continue
    for (const slot of unit.slots) {
      slots.push({ start: slot.startsAt, end: slot.endsAt, available: slot.isAvailable, unitId: unit.id, unitName: unit.name })
    }
  }
  return slots
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

export type Booking = {
  id: string
  startsAt: string
  endsAt: string
  status: string
  venueName: string | null
  resourceName: string | null
  unitName: string | null
}

export async function fetchMyBookings(tenantId: string, customerId: string): Promise<Booking[]> {
  const headers = await authHeaders(tenantId)
  const res = await fetch(`${BOOKING_URL}/bookings?customerId=${customerId}`, { headers, cache: "no-store" })
  if (!res.ok) throw new Error("Failed to fetch bookings")
  const json = await res.json()
  return json.data ?? []
}

export async function createBooking(tenantId: string, data: {
  venueId: string
  resourceId: string
  unitId: string
  startTime: string
  endTime: string
  customerId: string
  notes?: string
}): Promise<Booking> {
  const headers = await authHeaders(tenantId)
  const res = await fetch(`${BOOKING_URL}/bookings`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      venueId: data.venueId,
      resourceId: data.resourceId,
      bookableUnitId: data.unitId,
      startsAt: data.startTime,
      endsAt: data.endTime,
      customerId: data.customerId,
      notes: data.notes,
      source: "web",
    }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json?.message ?? "Booking failed")
  return json.data
}

export async function cancelBooking(tenantId: string, bookingId: string): Promise<void> {
  const headers = await authHeaders(tenantId)
  const res = await fetch(`${BOOKING_URL}/bookings/${bookingId}/cancel`, { method: "POST", headers, body: "{}" })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json?.message ?? "Failed to cancel booking")
  }
}

// ─── Memberships ──────────────────────────────────────────────────────────────

export type MembershipPlan = {
  id: string
  name: string
  description: string | null
  price: string
  currency: string
  billingPeriod: string
}

export type Membership = {
  id: string
  planName: string
  status: string
  startDate: string
  endDate: string | null
  price: string
  currency: string
}

export async function fetchMembershipPlans(tenantId: string): Promise<MembershipPlan[]> {
  const headers = await authHeaders(tenantId)
  const res = await fetch(`${MEMBERSHIP_URL}/membership-plans?status=active`, { headers, cache: "no-store" })
  if (!res.ok) return []
  const json = await res.json()
  return json.data ?? []
}

export async function joinMembership(tenantId: string, planId: string, customerId: string): Promise<Membership> {
  const headers = await authHeaders(tenantId)
  const res = await fetch(`${MEMBERSHIP_URL}/memberships`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      planId,
      customerId,
      startDate: new Date().toISOString().split("T")[0],
      status: "active",
      paymentStatus: "paid",
      source: "web",
    }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json?.message ?? "Failed to join membership")
  return json.data
}

export async function fetchMyMembership(tenantId: string, customerId: string): Promise<Membership | null> {
  const headers = await authHeaders(tenantId)
  const res = await fetch(`${MEMBERSHIP_URL}/memberships?customerId=${customerId}&status=active`, { headers, cache: "no-store" })
  if (!res.ok) return null
  const json = await res.json()
  return json.data?.[0] ?? null
}

// ─── Customer profile ─────────────────────────────────────────────────────────

export type CustomerProfile = {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
}

export async function fetchMyProfile(tenantId: string, customerId: string): Promise<CustomerProfile | null> {
  const headers = await authHeaders(tenantId)
  const res = await fetch(`${CUSTOMER_URL}/customers/${customerId}`, { headers, cache: "no-store" })
  if (!res.ok) return null
  const json = await res.json()
  return json.data ?? null
}
