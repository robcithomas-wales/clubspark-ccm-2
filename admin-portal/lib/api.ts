export type PaginationMeta = {
  total: number
  page: number
  limit: number
  totalPages: number
}

export async function getVenues() {
  const res = await fetch(`${FACILITY_SERVICE}/venues`, {
    headers: FACILITY_HEADERS,
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
    headers: FACILITY_HEADERS,
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
    headers: FACILITY_HEADERS,
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

const BOOKING_HEADERS = {
  "x-tenant-id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "x-organisation-id": "11111111-1111-1111-1111-111111111111",
}

export async function getBookings(page = 1, limit = 25) {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
  const res = await fetch(`${BOOKING_SERVICE}/bookings?${qs}`, {
    headers: BOOKING_HEADERS,
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error("Failed to load bookings")
  }

  return res.json() as Promise<{ data: any[]; pagination: PaginationMeta }>
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
      headers: BOOKING_HEADERS,
      cache: "no-store",
    }
  )

  if (!res.ok) {
    throw new Error("Failed to check availability")
  }

  const json = await res.json()
  return json?.data ?? json
}

export async function getResources() {
  const res = await fetch(`${FACILITY_SERVICE}/resources`, {
    headers: FACILITY_HEADERS,
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
      headers: BOOKING_HEADERS,
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

const MEMBERSHIP_HEADERS = {
  "x-tenant-id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "x-organisation-id": "11111111-1111-1111-1111-111111111111",
}

export async function getMembershipSchemes(page = 1, limit = 25) {
  const offset = (page - 1) * limit
  const qs = new URLSearchParams({ limit: String(limit), offset: String(offset) })
  const res = await fetch(`${MEMBERSHIP_SERVICE}/membership-schemes?${qs}`, {
    headers: MEMBERSHIP_HEADERS,
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
    headers: MEMBERSHIP_HEADERS,
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
    headers: {
      "Content-Type": "application/json",
      ...MEMBERSHIP_HEADERS,
    },
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
  ownershipType: "person" | "household"
  durationType: "fixed" | "rolling"
  visibility?: "public" | "invite_only" | "admin_only"
  status?: "active" | "inactive" | "archived"
  sortOrder?: number
}) {
  const res = await fetch(`${MEMBERSHIP_SERVICE}/membership-plans`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...MEMBERSHIP_HEADERS,
    },
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    throw new Error("Failed to create membership plan")
  }

  return res.json()
}

export async function getMembershipSchemeById(id: string) {
  const res = await fetch(`${MEMBERSHIP_SERVICE}/membership-schemes/${id}`, {
    headers: MEMBERSHIP_HEADERS,
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error("Failed to load membership scheme")
  }

  return res.json()
}

export async function getMembershipPlanById(id: string) {
  const res = await fetch(`${MEMBERSHIP_SERVICE}/membership-plans/${id}`, {
    headers: MEMBERSHIP_HEADERS,
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
      headers: MEMBERSHIP_HEADERS,
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
      headers: {
        "Content-Type": "application/json",
        ...MEMBERSHIP_HEADERS,
      },
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
    headers: MEMBERSHIP_HEADERS,
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error("Failed to load entitlement policies")
  }

  return res.json()
}

export async function getEntitlementPolicyById(id: string) {
  const res = await fetch(`${MEMBERSHIP_SERVICE}/entitlement-policies/${id}`, {
    headers: MEMBERSHIP_HEADERS,
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
    headers: {
      "Content-Type": "application/json",
      ...MEMBERSHIP_HEADERS,
    },
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    throw new Error("Failed to create entitlement policy")
  }

  return res.json()
}

export async function getMemberships(page = 1, limit = 25) {
  const offset = (page - 1) * limit
  const qs = new URLSearchParams({ limit: String(limit), offset: String(offset) })
  const res = await fetch(`${MEMBERSHIP_SERVICE}/memberships?${qs}`, {
    headers: MEMBERSHIP_HEADERS,
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
}) {
  const res = await fetch(`${MEMBERSHIP_SERVICE}/memberships`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...MEMBERSHIP_HEADERS,
    },
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

const CUSTOMER_HEADERS = {
  "x-tenant-id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "x-organisation-id": "11111111-1111-1111-1111-111111111111",
}

export async function getCustomers(page = 1, limit = 25) {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
  const res = await fetch(`${CUSTOMER_SERVICE}/customers?${qs}`, {
    headers: CUSTOMER_HEADERS,
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error("Failed to load customers")
  }

  return res.json() as Promise<{ data: any[]; pagination: PaginationMeta }>
}

export async function getCustomerById(id: string) {
  const res = await fetch(`${CUSTOMER_SERVICE}/customers/${id}`, {
    headers: CUSTOMER_HEADERS,
    cache: "no-store",
  })

  if (!res.ok) throw new Error(`Failed to load customer: ${res.status}`)
  return res.json() as Promise<{ data: any }>
}

export async function getMembershipById(id: string) {
  const res = await fetch(`${MEMBERSHIP_SERVICE}/memberships/${id}`, {
    headers: MEMBERSHIP_HEADERS,
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
    headers: {
      "Content-Type": "application/json",
      ...MEMBERSHIP_HEADERS,
    },
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
    headers: {
      ...MEMBERSHIP_HEADERS,
    },
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to delete membership: ${res.status} ${errorText}`)
  }
}

const FACILITY_SERVICE =
  process.env.NEXT_PUBLIC_FACILITY_SERVICE_URL || "http://127.0.0.1:4003"

const FACILITY_HEADERS = {
  "Content-Type": "application/json",
  "x-tenant-id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "x-organisation-id": "11111111-1111-1111-1111-111111111111",
}

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
    headers: FACILITY_HEADERS,
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
    headers: FACILITY_HEADERS,
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
    headers: FACILITY_HEADERS,
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to create add on service: ${res.status} ${errorText}`)
  }

  return res.json()
}