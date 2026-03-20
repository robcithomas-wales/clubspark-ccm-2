import { supabase } from './supabase'

const VENUE_URL = process.env.EXPO_PUBLIC_VENUE_SERVICE_URL!
const BOOKING_URL = process.env.EXPO_PUBLIC_BOOKING_SERVICE_URL!
const CUSTOMER_URL = process.env.EXPO_PUBLIC_CUSTOMER_SERVICE_URL!
const MEMBERSHIP_URL = process.env.EXPO_PUBLIC_MEMBERSHIP_SERVICE_URL!

// ─── Public (no auth) ────────────────────────────────────────────────────────

export type BrandingConfig = {
  tenantId: string
  venueName: string
  appName: string
  primaryColour: string
  secondaryColour?: string | null
  logoUrl: string | null
  clubCode: string
}

export async function fetchPublicConfig(clubCode: string): Promise<BrandingConfig | null> {
  const res = await fetch(`${VENUE_URL}/venues/public/config/${encodeURIComponent(clubCode)}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Failed to fetch club config')
  const json = await res.json()
  return json.data
}

export async function registerCustomer(data: {
  clubCode: string
  email: string
  password: string
  firstName: string
  lastName: string
}): Promise<{ message: string; venueName: string; appName: string }> {
  const res = await fetch(`${VENUE_URL}/venues/public/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json?.message ?? 'Registration failed')
  }
  const json = await res.json()
  return json.data
}

// ─── Authenticated helpers ────────────────────────────────────────────────────

async function authHeaders(tenantId: string): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'x-tenant-id': tenantId,
    'Content-Type': 'application/json',
  }
}

// ─── Venues / Resources ───────────────────────────────────────────────────────

export type Venue = {
  id: string
  tenantId: string
  name: string
  timezone: string
  city: string | null
  country: string
}

export async function fetchVenues(tenantId: string): Promise<Venue[]> {
  const headers = await authHeaders(tenantId)
  const res = await fetch(`${VENUE_URL}/venues`, { headers })
  if (!res.ok) throw new Error('Failed to fetch venues')
  const json = await res.json()
  return json.data
}

export type Resource = {
  id: string
  venueId: string
  name: string
  resourceType: string
  sport: string | null
  surface: string | null
  isIndoor: boolean | null
  hasLighting: boolean | null
  description: string | null
  colour: string | null
  isActive: boolean
  visibleAttributes: string[]
}

export async function fetchResources(tenantId: string, venueId: string): Promise<Resource[]> {
  const headers = await authHeaders(tenantId)
  const res = await fetch(`${VENUE_URL}/resources?venueId=${venueId}&isActive=true`, { headers })
  if (!res.ok) throw new Error('Failed to fetch resources')
  const json = await res.json()
  return json.data
}

// ─── Availability ─────────────────────────────────────────────────────────────

export type AvailabilitySlot = {
  start: string   // ISO datetime
  end: string     // ISO datetime
  available: boolean
  unitId: string
  unitName: string
}

export async function fetchAvailability(
  tenantId: string,
  venueId: string,
  resourceId: string,
  date: string,   // YYYY-MM-DD
): Promise<AvailabilitySlot[]> {
  const headers = await authHeaders(tenantId)

  // Fetch units for this venue to identify which belong to the selected resource
  const unitsRes = await fetch(`${VENUE_URL}/venues/${venueId}/units`, { headers })
  if (!unitsRes.ok) throw new Error('Failed to fetch units')
  const unitsJson = await unitsRes.json()
  const allUnits: { id: string; name: string; resourceId: string; isActive: boolean }[] = unitsJson.data ?? []
  const resourceUnitIds = new Set(
    allUnits.filter((u) => u.resourceId === resourceId && u.isActive).map((u) => u.id),
  )

  // Fetch day availability from booking-service
  const availRes = await fetch(
    `${BOOKING_URL}/availability/day?venueId=${venueId}&date=${date}`,
    { headers },
  )
  if (!availRes.ok) throw new Error('Failed to fetch availability')
  const availJson = await availRes.json()

  // Transform: flatten units×slots into the mobile slot format, filtered to this resource
  const units: { id: string; name: string; slots: { startsAt: string; endsAt: string; isAvailable: boolean }[] }[] =
    availJson.data?.units ?? []

  const slots: AvailabilitySlot[] = []
  for (const unit of units) {
    if (!resourceUnitIds.has(unit.id)) continue
    for (const slot of unit.slots) {
      slots.push({
        start: slot.startsAt,
        end: slot.endsAt,
        available: slot.isAvailable,
        unitId: unit.id,
        unitName: unit.name,
      })
    }
  }
  return slots
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

export type Booking = {
  id: string
  venueId: string
  resourceId: string
  bookableUnitId: string
  customerId: string
  startsAt: string
  endsAt: string
  status: string
  totalAmount: string
  currency: string
  bookingSource: string
  resource?: { name: string }
  unit?: { name: string }
}

export async function fetchMyBookings(tenantId: string, customerId: string): Promise<Booking[]> {
  const headers = await authHeaders(tenantId)
  const res = await fetch(`${BOOKING_URL}/bookings?customerId=${customerId}`, { headers })
  if (!res.ok) throw new Error('Failed to fetch bookings')
  const json = await res.json()
  return json.data
}

export async function createBooking(
  tenantId: string,
  data: {
    venueId: string
    resourceId: string
    unitId: string
    startTime: string
    endTime: string
    customerId?: string
    notes?: string
  },
): Promise<Booking> {
  const headers = await authHeaders(tenantId)
  const res = await fetch(`${BOOKING_URL}/bookings`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      venueId: data.venueId,
      resourceId: data.resourceId,
      bookableUnitId: data.unitId,
      startsAt: data.startTime,
      endsAt: data.endTime,
      customerId: data.customerId,
      notes: data.notes,
      source: 'mobile',
    }),
  })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json?.message ?? 'Booking failed')
  }
  const json = await res.json().catch(() => ({}))
  return json.data ?? {}
}

export async function cancelBooking(tenantId: string, bookingId: string): Promise<void> {
  const headers = await authHeaders(tenantId)
  const res = await fetch(`${BOOKING_URL}/bookings/${bookingId}/cancel`, {
    method: 'PUT',
    headers,
  })
  if (!res.ok) throw new Error('Failed to cancel booking')
}

// ─── Memberships ──────────────────────────────────────────────────────────────

export type Membership = {
  id: string
  planName: string
  status: string
  startDate: string
  endDate: string | null
  price: string
  currency: string
}

export async function fetchMyMembership(tenantId: string, customerId: string): Promise<Membership | null> {
  const headers = await authHeaders(tenantId)
  const res = await fetch(`${MEMBERSHIP_URL}/memberships?customerId=${customerId}&status=active`, { headers })
  if (!res.ok) throw new Error('Failed to fetch membership')
  const json = await res.json()
  return json.data?.[0] ?? null
}

// ─── Customer profile ─────────────────────────────────────────────────────────

export type CustomerProfile = {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string | null
}

export async function fetchMyProfile(tenantId: string, customerId: string): Promise<CustomerProfile> {
  const headers = await authHeaders(tenantId)
  const res = await fetch(`${CUSTOMER_URL}/customers/${customerId}`, { headers })
  if (!res.ok) throw new Error('Failed to fetch profile')
  const json = await res.json()
  return json.data
}
