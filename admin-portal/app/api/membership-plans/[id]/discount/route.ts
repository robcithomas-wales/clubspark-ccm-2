import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const MEMBERSHIP_SERVICE =
  process.env.MEMBERSHIP_SERVICE_URL || "http://127.0.0.1:4010"

async function getAuthHeaders() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("Not authenticated")
  return {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  }
}

/**
 * POST /api/membership-plans/:id/discount
 * Body: { discountValue: number | null }
 *
 * Sets (or clears) a booking_discount entitlement on the plan.
 * Preserves all existing non-discount entitlements.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: planId } = await params
  const { discountValue } = await request.json() as { discountValue: number | null }
  const headers = await getAuthHeaders()

  // 1. Fetch existing plan entitlements
  const existingRes = await fetch(
    `${MEMBERSHIP_SERVICE}/membership-plans/${planId}/entitlements`,
    { headers, cache: "no-store" },
  )
  const existingData = await existingRes.json().catch(() => [])
  const existing: Array<{
    entitlementPolicyId: string
    scopeType?: string | null
    scopeId?: string | null
    configuration?: Record<string, unknown>
    priority?: number
    entitlementPolicy?: { policyType?: string | null }
  }> = Array.isArray(existingData) ? existingData : (existingData?.data ?? [])

  // 2. Filter out any existing booking_discount entitlements
  const otherEntitlements = existing.filter(
    (e) => e.entitlementPolicy?.policyType !== "booking_discount",
  )

  // 3. Build the new entitlements list
  let newEntitlements = otherEntitlements.map((e) => ({
    entitlementPolicyId: e.entitlementPolicyId,
    scopeType: e.scopeType ?? "organisation",
    scopeId: e.scopeId ?? null,
    configuration: e.configuration ?? {},
    priority: e.priority ?? 100,
  }))

  if (discountValue != null && discountValue > 0) {
    // Find existing booking_discount policy or create one
    let policyId: string | null = null
    const discountEntry = existing.find(
      (e) => e.entitlementPolicy?.policyType === "booking_discount",
    )
    if (discountEntry) {
      policyId = discountEntry.entitlementPolicyId
    } else {
      // Create a new entitlement policy
      const createRes = await fetch(`${MEMBERSHIP_SERVICE}/entitlement-policies`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "Member Booking Discount",
          policyType: "booking_discount",
          description: "Percentage discount applied to bookings for members of this plan",
          status: "active",
        }),
      })
      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}))
        return NextResponse.json(
          { error: "Failed to create entitlement policy", detail: err },
          { status: 500 },
        )
      }
      const created = await createRes.json()
      policyId = created?.data?.id ?? created?.id
    }

    if (!policyId) {
      return NextResponse.json({ error: "Could not resolve entitlement policy ID" }, { status: 500 })
    }

    newEntitlements = [
      ...newEntitlements,
      {
        entitlementPolicyId: policyId,
        scopeType: "organisation",
        scopeId: null,
        configuration: { discountType: "percentage", discountValue },
        priority: 200,
      },
    ]
  }

  // 4. Replace plan entitlements
  const replaceRes = await fetch(
    `${MEMBERSHIP_SERVICE}/membership-plans/${planId}/entitlements`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify({ entitlements: newEntitlements }),
    },
  )
  const replaceData = await replaceRes.json().catch(() => ({}))
  return NextResponse.json(replaceData, { status: replaceRes.status })
}
