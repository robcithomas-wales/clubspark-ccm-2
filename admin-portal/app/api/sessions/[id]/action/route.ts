// POST /api/sessions/:id/action — { action: 'cancel' | 'complete' | 'join' | 'update-participant', ... }
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const BOOKING = process.env.NEXT_PUBLIC_BOOKING_SERVICE_URL || "http://127.0.0.1:4005"
const TENANT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { action, participantId, ...payload } = body

  const hdrs = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${session.access_token}`,
    "x-tenant-id": TENANT,
  }

  let url: string
  let method = "POST"

  switch (action) {
    case "cancel":
      url = `${BOOKING}/v1/sessions/${id}/cancel`
      break
    case "complete":
      url = `${BOOKING}/v1/sessions/${id}/complete`
      break
    case "join":
      url = `${BOOKING}/v1/sessions/${id}/join`
      break
    case "update-participant":
      url = `${BOOKING}/v1/sessions/${id}/participants/${participantId}`
      method = "PATCH"
      break
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  }

  const res = await fetch(url, { method, headers: hdrs, body: JSON.stringify(payload) })
  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status })
  return NextResponse.json(await res.json())
}
