import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const BOOKING = process.env.NEXT_PUBLIC_BOOKING_SERVICE_URL || "http://127.0.0.1:4005"
const TENANT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

function headers(token: string) {
  return { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "x-tenant-id": TENANT }
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const qs = searchParams.toString()
  const res = await fetch(`${BOOKING}/v1/sessions${qs ? `?${qs}` : ""}`, {
    headers: headers(session.access_token), cache: "no-store",
  })
  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status })
  return NextResponse.json(await res.json())
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const res = await fetch(`${BOOKING}/v1/sessions`, {
    method: "POST", headers: headers(session.access_token), body: JSON.stringify(body),
  })
  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status })
  return NextResponse.json(await res.json(), { status: 201 })
}
