import { supabase } from './supabase'

const VENUE_URL = process.env.EXPO_PUBLIC_VENUE_SERVICE_URL!
const BOOKING_URL = process.env.EXPO_PUBLIC_BOOKING_SERVICE_URL!
const CUSTOMER_URL = process.env.EXPO_PUBLIC_CUSTOMER_SERVICE_URL!
const MEMBERSHIP_URL = process.env.EXPO_PUBLIC_MEMBERSHIP_SERVICE_URL!
const COACHING_URL = process.env.EXPO_PUBLIC_COACHING_SERVICE_URL!
const TEAM_URL = process.env.EXPO_PUBLIC_TEAM_SERVICE_URL!

// ─── Public (no auth) ────────────────────────────────────────────────────────

export type BrandingConfig = {
  organisationId: string
  tenantId: string
  venueName: string
  appName: string
  about: string | null
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

export type NewsPost = {
  id: string
  title: string
  slug: string
  body: string | null
  coverImageUrl: string | null
  publishedAt: string | null
}

export async function fetchLatestNews(tenantId: string, limit = 3): Promise<NewsPost[]> {
  const res = await fetch(`${VENUE_URL}/news-posts/public/list?tenantId=${tenantId}&limit=${limit}`)
  if (!res.ok) return []
  const json = await res.json()
  return (json.data ?? []).slice(0, limit)
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
  venueName: string | null
  resourceName: string | null
  unitName: string | null
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
    method: 'POST',
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
  const res = await fetch(`${CUSTOMER_URL}/people/${customerId}`, { headers })
  if (!res.ok) throw new Error('Failed to fetch profile')
  const json = await res.json()
  return json.data
}

// ─── Membership plans ─────────────────────────────────────────────────────────

export type MembershipPlan = {
  id: string
  name: string
  description: string | null
  price: number | null
  currency: string
  billingInterval: string | null
  durationType: string | null
}

export async function fetchMembershipPlans(tenantId: string, orgId: string): Promise<MembershipPlan[]> {
  const headers = await authHeaders(tenantId)
  const qs = new URLSearchParams({ status: 'active', orgId })
  const res = await fetch(`${MEMBERSHIP_URL}/membership-plans?${qs}`, { headers })
  if (!res.ok) return []
  const json = await res.json()
  return json.data ?? []
}

export async function joinMembership(
  tenantId: string,
  planId: string,
  customerId: string,
): Promise<Membership> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const hdrs = {
    'Authorization': `Bearer ${session.access_token}`,
    'x-tenant-id': tenantId,
    'Content-Type': 'application/json',
  }

  // Ensure a people.persons record exists before creating the membership
  const meta = session.user.user_metadata ?? {}
  const firstName: string =
    meta.firstName || meta.first_name ||
    (meta.full_name ?? meta.name ?? '').split(' ')[0] || 'Member'
  const lastName: string =
    meta.lastName || meta.last_name ||
    (meta.full_name ?? meta.name ?? '').split(' ').slice(1).join(' ') || '-'
  await fetch(`${CUSTOMER_URL}/people`, {
    method: 'POST',
    headers: hdrs,
    body: JSON.stringify({ id: customerId, firstName, lastName, email: session.user.email }),
  }).catch(() => { /* non-fatal — record may already exist */ })

  const res = await fetch(`${MEMBERSHIP_URL}/memberships`, {
    method: 'POST',
    headers: hdrs,
    body: JSON.stringify({
      planId,
      customerId,
      startDate: new Date().toISOString().split('T')[0],
      status: 'active',
      paymentStatus: 'paid',
      source: 'mobile',
    }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json?.message ?? 'Failed to join membership')
  return json.data
}

// ─── Coaching ─────────────────────────────────────────────────────────────────

export type LessonType = {
  id: string
  name: string
  durationMinutes: number
  pricePerSession: string
  currency: string
  maxParticipants: number
  sport: string | null
}

export type Coach = {
  id: string
  displayName: string
  bio: string | null
  avatarUrl: string | null
  specialties: string[]
  lessonTypes: { lessonType: LessonType }[]
}

export type CoachSlot = {
  startsAt: string
  endsAt: string
  durationMinutes: number
  unitId: string | null
  unitName: string | null
  resourceId: string | null
  venueId: string | null
}

export async function fetchCoaches(tenantId: string): Promise<Coach[]> {
  const headers = await authHeaders(tenantId)
  const res = await fetch(`${COACHING_URL}/coaches?activeOnly=true&limit=100`, { headers })
  if (!res.ok) return []
  const json = await res.json()
  return json.data ?? []
}

export async function fetchCoachSlots(
  tenantId: string,
  coachId: string,
  date: string,
  durationMinutes: number,
  sport: string | null,
): Promise<CoachSlot[]> {
  const headers = await authHeaders(tenantId)

  // 1. Raw slots from coaching service
  const slotsRes = await fetch(
    `${COACHING_URL}/coaches/${coachId}/availability/slots?date=${date}&durationMinutes=${durationMinutes}`,
    { headers },
  )
  if (!slotsRes.ok) return []
  const { data: rawSlots } = await slotsRes.json() as { data: { startsAt: string; endsAt: string; durationMinutes: number }[] }
  if (!rawSlots?.length) return []

  // 2. Get suitable bookable units for this sport
  let suitableUnits: { id: string; name: string; venueId: string; resourceId: string }[] = []
  if (sport) {
    const unitsRes = await fetch(
      `${VENUE_URL}/bookable-units?sport=${encodeURIComponent(sport)}`,
      { headers },
    )
    if (unitsRes.ok) {
      const { data } = await unitsRes.json()
      suitableUnits = data ?? []
    }
  }

  if (suitableUnits.length === 0) {
    return rawSlots.map((s) => ({ ...s, unitId: null, unitName: null, resourceId: null, venueId: null }))
  }

  // 3. Get busy times for those units
  const unitIds = suitableUnits.map((u) => u.id).join(',')
  const busyRes = await fetch(
    `${BOOKING_URL}/bookings/unit-busy-times?unitIds=${unitIds}&date=${date}`,
    { headers },
  )
  const busyTimes: { unitId: string; startsAt: string; endsAt: string }[] =
    busyRes.ok ? ((await busyRes.json()).data ?? []) : []

  // 4. Match each slot to a free unit
  const enriched: CoachSlot[] = []
  for (const slot of rawSlots) {
    const slotStart = new Date(slot.startsAt).getTime()
    const slotEnd = new Date(slot.endsAt).getTime()
    const freeUnit = suitableUnits.find((unit) =>
      !busyTimes.some(
        (b) => b.unitId === unit.id &&
          new Date(b.startsAt).getTime() < slotEnd &&
          new Date(b.endsAt).getTime() > slotStart,
      ),
    )
    if (freeUnit) {
      enriched.push({ ...slot, unitId: freeUnit.id, unitName: freeUnit.name, resourceId: freeUnit.resourceId, venueId: freeUnit.venueId })
    }
  }
  return enriched
}

export async function createCoachingBooking(
  tenantId: string,
  data: {
    bookableUnitId: string | null
    venueId: string | null
    resourceId: string | null
    startsAt: string
    endsAt: string
    customerId: string
    coachId: string
    lessonTypeId: string
    price: number
    currency: string
  },
): Promise<void> {
  const headers = await authHeaders(tenantId)
  const res = await fetch(`${BOOKING_URL}/bookings`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...data, bookingSource: 'mobile', status: 'pending' }),
  })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json?.message ?? 'Failed to create booking')
  }
}

// ─── Team Service ─────────────────────────────────────────────────────────────

export type PlayerTeam = {
  id: string
  name: string
  sport: string
  season?: string
  ageGroup?: string
}

export type PlayerFixture = {
  id: string
  teamId: string
  teamName: string
  opponent: string
  homeAway: string
  venue?: string
  kickoffAt: string
  meetTime?: string
  status: string
  matchType?: string
  myAvailability?: string | null
}

export async function fetchMyTeams(tenantId: string, personId: string): Promise<PlayerTeam[]> {
  const headers = await authHeaders(tenantId)
  const res = await fetch(`${TEAM_URL}/teams?personId=${personId}`, { headers })
  if (!res.ok) return []
  const json = await res.json()
  return json.data ?? []
}

export async function fetchTeamFixtures(tenantId: string, teamId: string): Promise<PlayerFixture[]> {
  const headers = await authHeaders(tenantId)
  const res = await fetch(`${TEAM_URL}/teams/${teamId}/fixtures`, { headers })
  if (!res.ok) return []
  const json = await res.json()
  return json.data ?? []
}

export async function respondAvailability(
  tenantId: string,
  teamId: string,
  fixtureId: string,
  memberId: string,
  response: 'available' | 'unavailable' | 'maybe',
  notes?: string,
): Promise<void> {
  const headers = await authHeaders(tenantId)
  await fetch(`${TEAM_URL}/teams/${teamId}/fixtures/${fixtureId}/availability/${memberId}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ response, notes }),
  })
}
