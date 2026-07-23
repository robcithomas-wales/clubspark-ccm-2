import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const BOOKING = process.env.NEXT_PUBLIC_BOOKING_SERVICE_URL || "http://127.0.0.1:4005"
const TENANT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

async function tok() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token
}

function hdrs(token: string) {
  return { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "x-tenant-id": TENANT }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const token = await tok()
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const res = await fetch(`${BOOKING}/v1/sessions/${id}`, { headers: hdrs(token), cache: "no-store" })
  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status })
  return NextResponse.json(await res.json())
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const token = await tok()
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const res = await fetch(`${BOOKING}/v1/sessions/${id}`, {
    method: "PATCH", headers: hdrs(token), body: JSON.stringify(body),
  })
  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status })
  return NextResponse.json(await res.json())
}
