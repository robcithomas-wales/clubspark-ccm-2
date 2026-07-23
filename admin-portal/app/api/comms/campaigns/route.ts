import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const COMMS_SERVICE = process.env.NEXT_PUBLIC_COMMS_SERVICE_URL || "http://127.0.0.1:4012"

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit = searchParams.get("limit") ?? "50"

  const res = await fetch(`${COMMS_SERVICE}/v1/campaigns?limit=${limit}`, {
    headers: {
      "Authorization": `Bearer ${session.access_token}`,
    },
    cache: "no-store",
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: err }, { status: res.status })
  }

  return NextResponse.json(await res.json())
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { audienceType, recipients, segmentId, ...rest } = await req.json()

  // Build audienceDefinition JSON string for the comms-service
  let audienceDefinition: string
  if (audienceType === "segment" && segmentId) {
    audienceDefinition = JSON.stringify({ type: "segment", segmentId })
  } else if (audienceType === "manual" && Array.isArray(recipients)) {
    audienceDefinition = JSON.stringify({ type: "manual", recipients })
  } else {
    audienceDefinition = JSON.stringify({ type: "all_active_members" })
  }

  const res = await fetch(`${COMMS_SERVICE}/v1/campaigns`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ ...rest, audienceDefinition }),
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: err }, { status: res.status })
  }

  return NextResponse.json(await res.json(), { status: 201 })
}
