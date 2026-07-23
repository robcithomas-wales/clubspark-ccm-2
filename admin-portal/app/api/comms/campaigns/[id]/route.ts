import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const COMMS_SERVICE = process.env.NEXT_PUBLIC_COMMS_SERVICE_URL || "http://127.0.0.1:4012"

async function getSession() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const res = await fetch(`${COMMS_SERVICE}/v1/campaigns/${id}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
    cache: "no-store",
  })
  const json = await res.json()
  return NextResponse.json(json, { status: res.status })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const { audienceType, recipients, segmentId, ...rest } = await req.json()

  // Rebuild audienceDefinition if audience fields are present
  let patch: Record<string, unknown> = { ...rest }
  if (audienceType) {
    let audienceDefinition: string
    if (audienceType === "segment" && segmentId) {
      audienceDefinition = JSON.stringify({ type: "segment", segmentId })
    } else if (audienceType === "manual" && Array.isArray(recipients)) {
      audienceDefinition = JSON.stringify({ type: "manual", recipients })
    } else {
      audienceDefinition = JSON.stringify({ type: audienceType })
    }
    patch = { ...patch, audienceDefinition }
  }

  const res = await fetch(`${COMMS_SERVICE}/v1/campaigns/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(patch),
  })
  const json = await res.json()
  return NextResponse.json(json, { status: res.status })
}
