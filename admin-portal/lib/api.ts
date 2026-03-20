import { createClient } from './supabase/server'

export type PaginationMeta = {
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * Returns auth headers for service-to-service calls from server components and API routes.
 * The Bearer token carries the tenantId / organisationId as JWT claims (set via Supabase
 * app_metadata). NestJS services validate the token and extract the claims server-side.
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  }
}

export async function getVenues() {
  const res = await fetch(`${FACILITY_SERVICE}/venues`, {
    headers: await getAuthHeaders(),
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error("Failed to load venues")
  }

  const json = await res.json()
  return (json.data ?? json) as any[]
}

export async function getBookableUnits() {
  const res = await fetch(`${FACILITY_SERVICE}/bookable-units`, {
    headers: await getAuthHeaders(),
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error("Failed to load bookable units")
  }

  const json = await res.json()
  return (json.data ?? json) as any[]
}

export type CreateBookableUnitInput = {
  venueId: string
  resourceId: string
  name: string
  unitType: string
  sortOrder?: number
  capacity?: number
  isActive?: boolean
  isOptionalExtra?: boolean
  parentUnitId?: string
}

export async function createBookableUnit(input: CreateBookableUnitInput) {
  const res = await fetch(`${FACILITY_SERVICE}/bookable-units`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to create bookable unit: ${res.status} ${errorText}`)
  }

  return res.json()
}

const BOOKING_SERVICE =
  process.env.NEXT_PUBLIC_BOOKING_SERVICE_URL || "http://127.0.0.1:4005"

export async function getBookings(
  page = 1,
  limit = 25,
  filters: { status?: string; fromDate?: string; toDate?: string } = {},
) {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (filters.status && filters.status !== "all") qs.set("status", filters.status)
  if (filters.fromDate) qs.set("fromDate", filters.fromDate)
  if (filters.toDate) qs.set("toDate", filters.toDate)
  const res = await fetch(`${BOOKING_SERVICE}/bookings?${qs}`, {
    headers: await getAuthHeaders(),
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error("Failed to load bookings")
  }

  return res.json() as Promise<{ data: any[]; pagination: PaginationMeta }>
}

export async function getBookingStats(): Promise<{ totalBookedHours: number; bookedHours30d: number; addOnRevenue: number; totalRevenue: number; totalPaidBookings: number; uniqueCustomers: number; utilisationRate30d: number }> {
  const res = await fetch(`${BOOKING_SERVICE}/bookings/stats`, {
    headers: await getAuthHeaders(),
    cache: "no-store",
  })
  if (!res.ok) throw new Error("Failed to load booking stats")
  const json = await res.json()
  return json.data ?? { totalBookedHours: 0, bookedHours30d: 0, addOnRevenue: 0, totalRevenue: 0, totalPaidBookings: 0, uniqueCustomers: 0, utilisationRate30d: 0 }
}

export async function getBookingDailyStats(days = 30): Promise<{ date: string; bookingCount: number; bookedHours: number; addOnRevenue: number; revenue: number }[]> {
  const res = await fetch(`${BOOKING_SERVICE}/bookings/stats/daily?days=${days}`, {
    headers: await getAuthHeaders(),
    cache: "no-store",
  })
  if (!res.ok) return []
  const json = await res.json()
  return json.data ?? []
}

export async function updateBooking(
  id: string,
  data: {
    startsAt?: string
    endsAt?: string
    notes?: string
    bookingSource?: string
    customerId?: string | null
  },
) {
  const res = await fetch(`${BOOKING_SERVICE}/bookings/${id}`, {
    method: "PATCH",
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
    cache: "no-store",
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to update booking: ${res.status} ${text}`)
  }
  return res.json()
}

export async function checkAvailability(params: {
  bookableUnitId: string
  startsAt: string
  endsAt: string
}) {
  const search = new URLSearchParams({
    bookableUnitId: params.bookableUnitId,
    startsAt: params.startsAt,
    endsAt: params.endsAt,
  })

  const res = await fetch(
    `${BOOKING_SERVICE}/availability/check?${search.toString()}`,
    {
      headers: await getAuthHeaders(),
      cache: "no-store",
    }
  )

  if (!res.ok) {
    throw new Error("Failed to check availability")
  }

  const json = await res.json()
  return json?.data ?? json
}

export async function getBookingRules() {
  const res = await fetch(`${BOOKING_SERVICE}/booking-rules`, {
    headers: await getAuthHeaders(),
    cache: "no-store",
  })
  if (!res.ok) throw new Error("Failed to load booking rules")
  const json = await res.json()
  return (json.data ?? json) as any[]
}

export async function getBookingRuleById(id: string) {
  const res = await fetch(`${BOOKING_SERVICE}/booking-rules/${id}`, {
    headers: await getAuthHeaders(),
    cache: "no-store",
  })
  if (!res.ok) return null
  const json = await res.json()
  return json.data ?? json
}

export async function getBookingSeries() {
  const res = await fetch(`${BOOKING_SERVICE}/booking-series`, {
    headers: await getAuthHeaders(),
    cache: "no-store",
  })
  if (!res.ok) throw new Error("Failed to load booking series")
  const json = await res.json()
  return (json.data ?? json) as any[]
}

export async function getBookingSeriesById(id: string) {
  const res = await fetch(`${BOOKING_SERVICE}/booking-series/${id}`, {
    headers: await getAuthHeaders(),
    cache: "no-store",
  })
  if (!res.ok) return null
  const json = await res.json()
  return json.data ?? json
}

export async function createBookingSeries(data: Record<string, unknown>) {
  const res = await fetch(`${BOOKING_SERVICE}/booking-series`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message ?? "Failed to create booking series")
  }
  return res.json()
}

export async function cancelBookingSeries(
  id: string,
  data: { mode: "all" | "from_date" | "single"; fromDate?: string; bookingId?: string }
) {
  const res = await fetch(`${BOOKING_SERVICE}/booking-series/${id}/cancel`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("Failed to cancel booking series")
  return res.json()
}

export async function updateBookingSeries(
  id: string,
  data: Record<string, unknown>
) {
  const res = await fetch(`${BOOKING_SERVICE}/booking-series/${id}`, {
    method: "PATCH",
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("Failed to update booking series")
  return res.json()
}

export async function getResources() {
  const res = await fetch(`${FACILITY_SERVICE}/resources`, {
    headers: await getAuthHeaders(),
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error("Failed to load resources")
  }

  const json = await res.json()
  return (json.data ?? json) as any[]
}

export async function getDayAvailability(params: {
  venueId: string
  date: string
}) {
  const search = new URLSearchParams({
    venueId: params.venueId,
    date: params.date,
  })

  const res = await fetch(
    `${BOOKING_SERVICE}/availability/day?${search.toString()}`,
    {
      headers: await getAuthHeaders(),
      cache: "no-store",
    }
  )

  if (!res.ok) {
    throw new Error("Failed to load day availability")
  }

  const json = await res.json()
  return json?.data ?? json
}

const MEMBERSHIP_SERVICE =
  process.env.NEXT_PUBLIC_MEMBERSHIP_SERVICE_URL || "http://127.0.0.1:4010"

export async function getMembershipSchemes(page = 1, limit = 25) {
  const offset = (page - 1) * limit
  const qs = new URLSearchParams({ limit: String(limit), offset: String(offset) })
  const res = await fetch(`${MEMBERSHIP_SERVICE}/membership-schemes?${qs}`, {
    headers: await getAuthHeaders(),
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error("Failed to load membership schemes")
  }

  const json = await res.json()
  const p = json.pagination ?? {}
  return {
    data: json.data ?? [],
    pagination: { total: p.total ?? 0, page, limit, totalPages: Math.ceil((p.total ?? 0) / limit) } as PaginationMeta,
  }
}

export async function getMembershipPlans(page = 1, limit = 25) {
  const offset = (page - 1) * limit
  const qs = new URLSearchParams({ limit: String(limit), offset: String(offset) })
  const res = await fetch(`${MEMBERSHIP_SERVICE}/membership-plans?${qs}`, {
    headers: await getAuthHeaders(),
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error("Failed to load membership plans")
  }

  const json = await res.json()
  const p = json.pagination ?? {}
  return {
    data: json.data ?? [],
    pagination: { total: p.total ?? 0, page, limit, totalPages: Math.ceil((p.total ?? 0) / limit) } as PaginationMeta,
  }
}

export async function createMembershipScheme(input: {
  name: string
  description?: string
  status?: string
}) {
  const res = await fetch(`${MEMBERSHIP_SERVICE}/membership-schemes`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    throw new Error("Failed to create membership scheme")
  }

  return res.json()
}

export async function createMembershipPlan(input: {
  schemeId: string
  name: string
  code?: string
  description?: string
  ownershipType?: "person" | "household"
  durationType?: "fixed" | "rolling"
  visibility?: "public" | "invite_only" | "admin_only"
  status?: "active" | "inactive" | "archived" | "draft"
  sortOrder?: number
  membershipType?: string
  sportCategory?: string
  maxMembers?: number
  isPublic?: boolean
  pricingModel?: string
  price?: number
  currency?: string
  billingInterval?: string
  instalmentCount?: number
}) {
  const res = await fetch(`${MEMBERSHIP_SERVICE}/membership-plans`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    throw new Error("Failed to create membership plan")
  }

  return res.json()
}

export async function getMembershipSchemeById(id: string) {
  const res = await fetch(`${MEMBERSHIP_SERVICE}/membership-schemes/${id}`, {
    headers: await getAuthHeaders(),
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error("Failed to load membership scheme")
  }

  return res.json()
}

export async function getMembershipPlanById(id: string) {
  const res = await fetch(`${MEMBERSHIP_SERVICE}/membership-plans/${id}`, {
    headers: await getAuthHeaders(),
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error("Failed to load membership plan")
  }

  return res.json()
}

export async function getMembershipPlanEntitlements(planId: string) {
  const res = await fetch(
    `${MEMBERSHIP_SERVICE}/membership-plans/${planId}/entitlements`,
    {
      headers: await getAuthHeaders(),
      cache: "no-store",
    }
  )

  if (!res.ok) {
    throw new Error("Failed to load membership plan entitlements")
  }

  return res.json()
}

export async function updateMembershipPlanEntitlements(
  planId: string,
  input: {
    entitlements: Array<{
      entitlementPolicyId: string
      scopeType:
        | "organisation"
        | "venue"
        | "resource_type"
        | "resource"
        | "bookable_unit"
      scopeId?: string | null
      configuration: Record<string, unknown>
      priority: number
    }>
  }
) {
  const res = await fetch(
    `${MEMBERSHIP_SERVICE}/membership-plans/${planId}/entitlements`,
    {
      method: "PUT",
      headers: await getAuthHeaders(),
      body: JSON.stringify(input),
    }
  )

  if (!res.ok) {
    throw new Error("Failed to update membership plan entitlements")
  }

  return res.json()
}

export async function getEntitlementPolicies() {
  const res = await fetch(`${MEMBERSHIP_SERVICE}/entitlement-policies`, {
    headers: await getAuthHeaders(),
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error("Failed to load entitlement policies")
  }

  return res.json()
}

export async function getEntitlementPolicyById(id: string) {
  const res = await fetch(`${MEMBERSHIP_SERVICE}/entitlement-policies/${id}`, {
    headers: await getAuthHeaders(),
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error("Failed to load entitlement policy")
  }

  return res.json()
}

export type CreateEntitlementPolicyInput = {
  name: string
  policyType: string
  description?: string
  status?: "active" | "draft" | "inactive"
}

export async function createEntitlementPolicy(
  input: CreateEntitlementPolicyInput
) {
  const res = await fetch(`${MEMBERSHIP_SERVICE}/entitlement-policies`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    throw new Error("Failed to create entitlement policy")
  }

  return res.json()
}

export async function getMemberships(page = 1, limit = 25, status?: string) {
  const offset = (page - 1) * limit
  const qs = new URLSearchParams({ limit: String(limit), offset: String(offset) })
  if (status) qs.set("status", status)
  const res = await fetch(`${MEMBERSHIP_SERVICE}/memberships?${qs}`, {
    headers: await getAuthHeaders(),
    cache: "no-store",
  })

  if (res.status === 404) {
    return { data: [], pagination: { total: 0, page, limit, totalPages: 0 } as PaginationMeta }
  }

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to load memberships: ${res.status} ${errorText}`)
  }

  const json = await res.json()
  const p = json.pagination ?? {}
  return {
    data: json.data ?? [],
    pagination: { total: p.total ?? 0, page, limit, totalPages: Math.ceil((p.total ?? 0) / limit) } as PaginationMeta,
  }
}

export async function createMembership(input: {
  planId: string
  customerId?: string
  householdId?: string
  startDate: string
  endDate?: string
  renewalDate?: string
  autoRenew?: boolean
  status?: "active" | "pending" | "expired" | "cancelled"
  paymentStatus?: "unpaid" | "paid" | "part_paid" | "failed" | "waived"
  reference?: string
  source?: string
  notes?: string
}) {
  const res = await fetch(`${MEMBERSHIP_SERVICE}/memberships`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to create membership: ${res.status} ${errorText}`)
  }

  return res.json()
}

const CUSTOMER_SERVICE =
  process.env.NEXT_PUBLIC_CUSTOMER_SERVICE_URL || "http://127.0.0.1:4004"

export async function getCustomers(page = 1, limit = 25, opts?: { search?: string; lifecycle?: string }) {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (opts?.search) qs.set("search", opts.search)
  if (opts?.lifecycle) qs.set("lifecycle", opts.lifecycle)
  const res = await fetch(`${CUSTOMER_SERVICE}/customers?${qs}`, {
    headers: await getAuthHeaders(),
    cache: "no-store",
  })
  if (!res.ok) throw new Error("Failed to load customers")
  return res.json() as Promise<{ data: any[]; pagination: PaginationMeta }>
}

export async function getCustomerById(id: string) {
  const res = await fetch(`${CUSTOMER_SERVICE}/customers/${id}`, {
    headers: await getAuthHeaders(),
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`Failed to load customer: ${res.status}`)
  return res.json() as Promise<{ data: any }>
}

export async function transitionLifecycle(customerId: string, toState: string, reason?: string) {
  const res = await fetch(`${CUSTOMER_SERVICE}/customers/${customerId}/lifecycle`, {
    method: "PATCH",
    headers: await getAuthHeaders(),
    body: JSON.stringify({ toState, reason }),
  })
  if (!res.ok) throw new Error(`Failed to transition lifecycle: ${res.status}`)
  return res.json()
}

export async function getTags() {
  const res = await fetch(`${CUSTOMER_SERVICE}/tags`, {
    headers: await getAuthHeaders(),
    cache: "no-store",
  })
  if (!res.ok) throw new Error("Failed to load tags")
  return res.json() as Promise<{ data: any[] }>
}

export async function createTag(name: string, colour?: string) {
  const res = await fetch(`${CUSTOMER_SERVICE}/tags`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify({ name, colour }),
  })
  if (!res.ok) throw new Error("Failed to create tag")
  return res.json()
}

export async function applyTagToPerson(customerId: string, tagId: string) {
  const res = await fetch(`${CUSTOMER_SERVICE}/customers/${customerId}/tags`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify({ tagId }),
  })
  if (!res.ok) throw new Error("Failed to apply tag")
  return res.json()
}

export async function removeTagFromPerson(customerId: string, tagId: string) {
  const res = await fetch(`${CUSTOMER_SERVICE}/customers/${customerId}/tags/${tagId}`, {
    method: "DELETE",
    headers: await getAuthHeaders(),
  })
  if (!res.ok) throw new Error("Failed to remove tag")
  return res.json()
}

export async function getMembershipById(id: string) {
  const res = await fetch(`${MEMBERSHIP_SERVICE}/memberships/${id}`, {
    headers: await getAuthHeaders(),
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error("Failed to load membership")
  }

  return res.json()
}

export async function updateMembership(
  id: string,
  input: {
    planId?: string
    customerId?: string
    householdId?: string
    startDate?: string
    endDate?: string
    renewalDate?: string
    autoRenew?: boolean
    status?: "active" | "pending" | "expired" | "cancelled"
    paymentStatus?: "unpaid" | "paid" | "part_paid" | "failed" | "waived"
    reference?: string
    source?: string
    notes?: string
  }
) {
  const res = await fetch(`${MEMBERSHIP_SERVICE}/memberships/${id}`, {
    method: "PATCH",
    headers: await getAuthHeaders(),
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to update membership: ${res.status} ${errorText}`)
  }

  return res.json()
}

export async function deleteMembership(id: string) {
  const res = await fetch(`${MEMBERSHIP_SERVICE}/memberships/${id}`, {
    method: "DELETE",
    headers: await getAuthHeaders(),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to delete membership: ${res.status} ${errorText}`)
  }
}

export async function transitionMembership(
  id: string,
  action: "activate" | "suspend" | "cancel" | "lapse" | "expire",
  reason?: string,
) {
  const res = await fetch(`${MEMBERSHIP_SERVICE}/memberships/${id}/transition`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify({ action, reason }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message ?? "Failed to transition membership")
  }
  return res.json()
}

export async function getMembershipHistory(id: string) {
  const res = await fetch(`${MEMBERSHIP_SERVICE}/memberships/${id}/history`, {
    headers: await getAuthHeaders(),
    cache: "no-store",
  })
  if (!res.ok) throw new Error("Failed to load membership history")
  const json = await res.json()
  return (json.data ?? json) as any[]
}

export async function getMembershipsWithFilter(opts: {
  page?: number
  limit?: number
  status?: string
  paymentStatus?: string
  renewingWithinDays?: number
}) {
  const page = opts.page ?? 1
  const limit = opts.limit ?? 25
  const offset = (page - 1) * limit
  const qs = new URLSearchParams({ limit: String(limit), offset: String(offset) })
  if (opts.status) qs.set("status", opts.status)
  if (opts.paymentStatus) qs.set("paymentStatus", opts.paymentStatus)
  if (opts.renewingWithinDays != null) qs.set("renewingWithinDays", String(opts.renewingWithinDays))

  const res = await fetch(`${MEMBERSHIP_SERVICE}/memberships?${qs}`, {
    headers: await getAuthHeaders(),
    cache: "no-store",
  })
  if (!res.ok) return { data: [], pagination: { total: 0, page, limit, totalPages: 0 } }
  const json = await res.json()
  const p = json.pagination ?? {}
  return {
    data: json.data ?? [],
    pagination: { total: p.total ?? 0, page, limit, totalPages: Math.ceil((p.total ?? 0) / limit) },
  }
}

export async function getMembershipsRenewalsDue(withinDays = 30) {
  const res = await fetch(`${MEMBERSHIP_SERVICE}/memberships/renewals-due?days=${withinDays}`, {
    headers: await getAuthHeaders(),
    cache: "no-store",
  })
  if (!res.ok) return { data: [] }
  return res.json() as Promise<{ data: any[] }>
}

export async function bulkTransitionMemberships(
  ids: string[],
  action: string,
  reason?: string,
) {
  const res = await fetch(`${MEMBERSHIP_SERVICE}/memberships/bulk-transition`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify({ ids, action, reason }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message ?? "Failed to bulk transition memberships")
  }
  return res.json()
}

export async function recordMembershipPayment(
  id: string,
  input: { paymentStatus: string; paymentMethod?: string; paymentReference?: string; paymentAmount?: number },
) {
  const res = await fetch(`${MEMBERSHIP_SERVICE}/memberships/${id}/record-payment`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message ?? "Failed to record payment")
  }
  return res.json()
}

export async function transferMembershipPlan(
  id: string,
  planId: string,
  reason?: string,
) {
  const res = await fetch(`${MEMBERSHIP_SERVICE}/memberships/${id}/transfer`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify({ planId, reason }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message ?? "Failed to transfer membership")
  }
  return res.json()
}

export async function getMembershipPlanEligibility(planId: string) {
  const res = await fetch(`${MEMBERSHIP_SERVICE}/membership-plans/${planId}/eligibility`, {
    headers: await getAuthHeaders(),
    cache: "no-store",
  })
  if (!res.ok) return { data: {} }
  return res.json() as Promise<{ data: Record<string, unknown> }>
}

export async function setMembershipPlanEligibility(
  planId: string,
  eligibility: { minAge?: number | null; maxAge?: number | null; requiresExistingMembership?: boolean; requiredPlanCodes?: string[]; notes?: string | null },
) {
  const res = await fetch(`${MEMBERSHIP_SERVICE}/membership-plans/${planId}/eligibility`, {
    method: "PUT",
    headers: await getAuthHeaders(),
    body: JSON.stringify(eligibility),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message ?? "Failed to save eligibility rules")
  }
  return res.json()
}

const FACILITY_SERVICE =
  process.env.NEXT_PUBLIC_FACILITY_SERVICE_URL || "http://127.0.0.1:4003"

export type AddOnServiceCategory =
  | "equipment"
  | "service"
  | "product"
  | "access"

export type AddOnServiceStatus = "active" | "inactive" | "archived"

export type AddOnPricingType = "included" | "fixed"

export type AddOnInventoryMode = "unlimited" | "shared_pool"

export type AddOnResourceType = "tennis" | "football" | "padel" | "cricket"

export type CreateAddOnServiceInput = {
  venueId?: string
  name: string
  code: string
  description?: string
  category: AddOnServiceCategory
  status?: AddOnServiceStatus
  pricingType?: AddOnPricingType
  price?: number
  currency?: string
  inventoryMode?: AddOnInventoryMode
  totalInventory?: number
  allowedResourceTypes?: AddOnResourceType[]
}

export async function getAddOnServices(params?: {
  venueId?: string
  status?: AddOnServiceStatus
  resourceType?: AddOnResourceType
}) {
  const search = new URLSearchParams()

  if (params?.venueId) {
    search.set("venueId", params.venueId)
  }

  if (params?.status) {
    search.set("status", params.status)
  }

  if (params?.resourceType) {
    search.set("resourceType", params.resourceType)
  }

  const query = search.toString()
  const url = query
    ? `${FACILITY_SERVICE}/add-ons?${query}`
    : `${FACILITY_SERVICE}/add-ons`

  const res = await fetch(url, {
    headers: await getAuthHeaders(),
    cache: "no-store",
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to load add on services: ${res.status} ${errorText}`)
  }

  return res.json()
}

export async function getAddOnServiceById(id: string) {
  const res = await fetch(`${FACILITY_SERVICE}/add-ons/${id}`, {
    headers: await getAuthHeaders(),
    cache: "no-store",
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to load add on service: ${res.status} ${errorText}`)
  }

  return res.json()
}

export async function createAddOnService(input: CreateAddOnServiceInput) {
  const res = await fetch(`${FACILITY_SERVICE}/add-ons`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to create add on service: ${res.status} ${errorText}`)
  }

  return res.json()
}

// ─── Resources ───────────────────────────────────────────────────────────────

export async function getResourceById(id: string) {
  const res = await fetch(`${FACILITY_SERVICE}/resources/${id}`, {
    headers: await getAuthHeaders(),
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`Failed to load resource: ${res.status}`)
  const json = await res.json()
  return (json.data ?? json) as any
}

export type CreateResourceInput = {
  venueId: string
  name: string
  resourceType: string
  groupId?: string
  sport?: string
  surface?: string
  isIndoor?: boolean
  hasLighting?: boolean
  bookingPurposes?: string[]
  description?: string
  colour?: string
  isActive?: boolean
}

export async function createResource(input: CreateResourceInput) {
  const res = await fetch(`${FACILITY_SERVICE}/resources`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to create resource: ${res.status} ${errorText}`)
  }
  return res.json()
}

export async function updateResource(id: string, input: Partial<CreateResourceInput> & { groupId?: string | null }) {
  const res = await fetch(`${FACILITY_SERVICE}/resources/${id}`, {
    method: "PATCH",
    headers: await getAuthHeaders(),
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to update resource: ${res.status} ${errorText}`)
  }
  return res.json()
}

// ─── Resource Groups ──────────────────────────────────────────────────────────

export async function getResourceGroups(params?: { venueId?: string }) {
  const search = new URLSearchParams()
  if (params?.venueId) search.set("venueId", params.venueId)
  const query = search.toString()
  const url = query ? `${FACILITY_SERVICE}/resource-groups?${query}` : `${FACILITY_SERVICE}/resource-groups`
  const res = await fetch(url, { headers: await getAuthHeaders(), cache: "no-store" })
  if (!res.ok) throw new Error(`Failed to load resource groups: ${res.status}`)
  const json = await res.json()
  return (json.data ?? json) as any[]
}

export async function getResourceGroupById(id: string) {
  const res = await fetch(`${FACILITY_SERVICE}/resource-groups/${id}`, {
    headers: await getAuthHeaders(),
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`Failed to load resource group: ${res.status}`)
  const json = await res.json()
  return (json.data ?? json) as any
}

export type CreateResourceGroupInput = {
  venueId: string
  name: string
  sport?: string
  description?: string
  colour?: string
  sortOrder?: number
}

export async function createResourceGroup(input: CreateResourceGroupInput) {
  const res = await fetch(`${FACILITY_SERVICE}/resource-groups`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to create resource group: ${res.status} ${errorText}`)
  }
  return res.json()
}

export async function updateResourceGroup(id: string, input: Partial<CreateResourceGroupInput>) {
  const res = await fetch(`${FACILITY_SERVICE}/resource-groups/${id}`, {
    method: "PATCH",
    headers: await getAuthHeaders(),
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to update resource group: ${res.status} ${errorText}`)
  }
  return res.json()
}

export async function deleteResourceGroup(id: string) {
  const res = await fetch(`${FACILITY_SERVICE}/resource-groups/${id}`, {
    method: "DELETE",
    headers: await getAuthHeaders(),
  })
  if (!res.ok) throw new Error(`Failed to delete resource group: ${res.status}`)
}

// ─── Availability Configs ─────────────────────────────────────────────────────

export type AvailabilityConfigScopeType = "venue" | "resource_group" | "resource"

export async function getAvailabilityConfigs(params?: {
  scopeType?: AvailabilityConfigScopeType
  scopeId?: string
}) {
  const search = new URLSearchParams()
  if (params?.scopeType) search.set("scopeType", params.scopeType)
  if (params?.scopeId) search.set("scopeId", params.scopeId)
  const query = search.toString()
  const url = query
    ? `${FACILITY_SERVICE}/availability-configs?${query}`
    : `${FACILITY_SERVICE}/availability-configs`
  const res = await fetch(url, { headers: await getAuthHeaders(), cache: "no-store" })
  if (!res.ok) throw new Error(`Failed to load availability configs: ${res.status}`)
  const json = await res.json()
  return (json.data ?? json) as any[]
}

export async function getAvailabilityConfigById(id: string) {
  const res = await fetch(`${FACILITY_SERVICE}/availability-configs/${id}`, {
    headers: await getAuthHeaders(),
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`Failed to load availability config: ${res.status}`)
  const json = await res.json()
  return (json.data ?? json) as any
}

export type CreateAvailabilityConfigInput = {
  scopeType: AvailabilityConfigScopeType
  scopeId: string
  dayOfWeek?: number
  opensAt?: string
  closesAt?: string
  slotDurationMinutes?: number
  bookingIntervalMinutes?: number
  newDayReleaseTime?: string
  isActive?: boolean
}

export async function createAvailabilityConfig(input: CreateAvailabilityConfigInput) {
  const res = await fetch(`${FACILITY_SERVICE}/availability-configs`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to create availability config: ${res.status} ${errorText}`)
  }
  return res.json()
}

export async function updateAvailabilityConfig(id: string, input: Partial<CreateAvailabilityConfigInput>) {
  const res = await fetch(`${FACILITY_SERVICE}/availability-configs/${id}`, {
    method: "PATCH",
    headers: await getAuthHeaders(),
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to update availability config: ${res.status} ${errorText}`)
  }
  return res.json()
}

export async function deleteAvailabilityConfig(id: string) {
  const res = await fetch(`${FACILITY_SERVICE}/availability-configs/${id}`, {
    method: "DELETE",
    headers: await getAuthHeaders(),
  })
  if (!res.ok) throw new Error(`Failed to delete availability config: ${res.status}`)
}

// ─── Blackout Dates ───────────────────────────────────────────────────────────

export async function getBlackoutDates(params?: { venueId?: string; resourceId?: string }) {
  const search = new URLSearchParams()
  if (params?.venueId) search.set("venueId", params.venueId)
  if (params?.resourceId) search.set("resourceId", params.resourceId)
  const query = search.toString()
  const url = query
    ? `${FACILITY_SERVICE}/blackout-dates?${query}`
    : `${FACILITY_SERVICE}/blackout-dates`
  const res = await fetch(url, { headers: await getAuthHeaders(), cache: "no-store" })
  if (!res.ok) throw new Error(`Failed to load blackout dates: ${res.status}`)
  const json = await res.json()
  return (json.data ?? json) as any[]
}

export async function getBlackoutDateById(id: string) {
  const res = await fetch(`${FACILITY_SERVICE}/blackout-dates/${id}`, {
    headers: await getAuthHeaders(),
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`Failed to load blackout date: ${res.status}`)
  const json = await res.json()
  return (json.data ?? json) as any
}

export type CreateBlackoutDateInput = {
  venueId: string
  resourceId?: string
  name: string
  startDate: string
  endDate: string
  recurrenceRule?: string
}

export async function createBlackoutDate(input: CreateBlackoutDateInput) {
  const res = await fetch(`${FACILITY_SERVICE}/blackout-dates`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to create blackout date: ${res.status} ${errorText}`)
  }
  return res.json()
}

export async function updateBlackoutDate(id: string, input: Partial<CreateBlackoutDateInput>) {
  const res = await fetch(`${FACILITY_SERVICE}/blackout-dates/${id}`, {
    method: "PATCH",
    headers: await getAuthHeaders(),
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to update blackout date: ${res.status} ${errorText}`)
  }
  return res.json()
}

export async function deleteBlackoutDate(id: string) {
  const res = await fetch(`${FACILITY_SERVICE}/blackout-dates/${id}`, {
    method: "DELETE",
    headers: await getAuthHeaders(),
  })
  if (!res.ok) throw new Error(`Failed to delete blackout date: ${res.status}`)
}

// ─── Booking Approval ─────────────────────────────────────────────────────────

export async function approveBooking(id: string, approvedBy: string) {
  const res = await fetch(`${BOOKING_SERVICE}/bookings/${id}/approve`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify({ approvedBy }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to approve booking: ${res.status} ${text}`)
  }
  return res.json()
}

export async function rejectBooking(id: string, reason?: string) {
  const res = await fetch(`${BOOKING_SERVICE}/bookings/${id}/reject`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify({ reason }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to reject booking: ${res.status} ${text}`)
  }
  return res.json()
}

// ─── Venue Settings ───────────────────────────────────────────────────────────

export async function getVenueSettings(venueId: string) {
  const res = await fetch(`${FACILITY_SERVICE}/venues/${venueId}/settings`, {
    headers: await getAuthHeaders(),
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`Failed to load venue settings: ${res.status}`)
  const json = await res.json()
  return (json.data ?? json) as any
}

export async function upsertVenueSettings(venueId: string, data: {
  openBookings?: boolean
  addOnsEnabled?: boolean
  pendingApprovals?: boolean
  splitPayments?: boolean
  publicBookingView?: string
}) {
  const res = await fetch(`${FACILITY_SERVICE}/venues/${venueId}/settings`, {
    method: "PUT",
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to update venue settings: ${res.status} ${text}`)
  }
  const json = await res.json()
  return (json.data ?? json) as any
}

// ─── Reporting API ────────────────────────────────────────────────────────────

export async function getBookingStatsSummary(): Promise<{
  byStatus: { status: string; count: number }[]
  bySource: { source: string; count: number }[]
  byPaymentStatus: { paymentStatus: string; count: number }[]
}> {
  const res = await fetch(`${BOOKING_SERVICE}/bookings/stats/summary`, {
    headers: await getAuthHeaders(),
    cache: "no-store",
  })
  if (!res.ok) return { byStatus: [], bySource: [], byPaymentStatus: [] }
  const json = await res.json()
  return json.data ?? { byStatus: [], bySource: [], byPaymentStatus: [] }
}

export async function getBookingStatsByUnit(): Promise<{
  bookableUnitId: string
  bookingCount: number
  bookedHours: number
}[]> {
  const res = await fetch(`${BOOKING_SERVICE}/bookings/stats/by-unit`, {
    headers: await getAuthHeaders(),
    cache: "no-store",
  })
  if (!res.ok) return []
  const json = await res.json()
  return json.data ?? []
}

export async function getBookingStatsByDow(): Promise<{
  dow: number
  hour: number
  count: number
}[]> {
  const res = await fetch(`${BOOKING_SERVICE}/bookings/stats/by-dow`, {
    headers: await getAuthHeaders(),
    cache: "no-store",
  })
  if (!res.ok) return []
  const json = await res.json()
  return json.data ?? []
}

export async function getTopCustomers(limit = 20): Promise<{
  customerId: string
  firstName: string | null
  lastName: string | null
  email: string | null
  bookingCount: number
  totalHours: number
  addOnSpend: number
}[]> {
  const res = await fetch(`${BOOKING_SERVICE}/bookings/stats/customers?limit=${limit}`, {
    headers: await getAuthHeaders(),
    cache: "no-store",
  })
  if (!res.ok) return []
  const json = await res.json()
  return json.data ?? []
}

export async function getMembershipStats(): Promise<{
  byStatus: { status: string; count: number }[]
  byPlan: { planName: string; membershipType: string; count: number; revenue: number }[]
  byType: { membershipType: string; count: number }[]
  totalActive: number
  totalRevenue: number
}> {
  const res = await fetch(`${MEMBERSHIP_SERVICE}/memberships/stats`, {
    headers: await getAuthHeaders(),
    cache: "no-store",
  })
  if (!res.ok) return { byStatus: [], byPlan: [], byType: [], totalActive: 0, totalRevenue: 0 }
  const json = await res.json()
  return json.data ?? { byStatus: [], byPlan: [], byType: [], totalActive: 0, totalRevenue: 0 }
}

export async function getMembershipDailyStats(months = 12): Promise<{
  month: string
  newCount: number
  activeCount: number
}[]> {
  const res = await fetch(`${MEMBERSHIP_SERVICE}/memberships/stats/daily?months=${months}`, {
    headers: await getAuthHeaders(),
    cache: "no-store",
  })
  if (!res.ok) return []
  const json = await res.json()
  return json.data ?? []
}

export type Organisation = {
  id: string
  tenantId: string
  name: string
  slug: string
  customDomain: string | null
  primaryColour: string
  logoUrl: string | null
  about: string | null
  address: string | null
  phone: string | null
  email: string | null
  mapsEmbedUrl: string | null
  isPublished: boolean
}

export async function getOrganisation(): Promise<Organisation | null> {
  try {
    const res = await fetch(`${FACILITY_SERVICE}/organisations/me`, {
      headers: await getAuthHeaders(),
      cache: "no-store",
    })
    if (!res.ok) return null
    const json = await res.json()
    return json.data ?? null
  } catch {
    return null
  }
}