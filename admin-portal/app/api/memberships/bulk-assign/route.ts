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
 * POST /api/memberships/bulk-assign
 * Body: { planId, customerIds: string[], startDate, memberRole? }
 *
 * Creates a membership for each customerId. Returns { success, failed, errors }.
 */
export async function POST(request: NextRequest) {
  const { planId, customerIds, startDate, memberRole } = await request.json() as {
    planId: string
    customerIds: string[]
    startDate: string
    memberRole?: string
  }

  if (!planId || !Array.isArray(customerIds) || customerIds.length === 0 || !startDate) {
    return NextResponse.json({ error: "planId, customerIds and startDate are required" }, { status: 400 })
  }

  const headers = await getAuthHeaders()

  let success = 0
  let failed = 0
  const errors: string[] = []

  await Promise.all(
    customerIds.map(async (customerId) => {
      try {
        const res = await fetch(`${MEMBERSHIP_SERVICE}/memberships`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            planId,
            customerId,
            startDate,
            status: "pending",
            paymentStatus: "unpaid",
            source: "admin",
            memberRole: memberRole || undefined,
          }),
        })
        if (res.ok) {
          success++
        } else {
          const body = await res.json().catch(() => ({}))
          failed++
          errors.push(`${customerId}: ${body?.message ?? res.status}`)
        }
      } catch (e: any) {
        failed++
        errors.push(`${customerId}: ${e?.message ?? "Unknown error"}`)
      }
    }),
  )

  return NextResponse.json({ success, failed, errors })
}
