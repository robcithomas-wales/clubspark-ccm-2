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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await request.json()
  const headers = await getAuthHeaders()
  const res = await fetch(`${MEMBERSHIP_SERVICE}/entitlement-policies/${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  return NextResponse.json(json, { status: res.status })
}
