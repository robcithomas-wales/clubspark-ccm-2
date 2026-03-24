import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const BOOKING = process.env.NEXT_PUBLIC_BOOKING_SERVICE_URL || "http://127.0.0.1:4005"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const body = await req.json()
  const res = await fetch(`${BOOKING}/bookings`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
