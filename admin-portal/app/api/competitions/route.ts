import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const COMPETITION_SERVICE = process.env.NEXT_PUBLIC_COMPETITION_SERVICE_URL || "http://127.0.0.1:4009"

async function headers() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  return { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }
}

export async function GET(req: NextRequest) {
  const h = await headers()
  if (!h) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const qs = req.nextUrl.searchParams.toString()
  const res = await fetch(`${COMPETITION_SERVICE}/competitions${qs ? `?${qs}` : ""}`, { headers: h, cache: "no-store" })
  const json = await res.json()
  return NextResponse.json(json, { status: res.status })
}

export async function POST(req: NextRequest) {
  const h = await headers()
  if (!h) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const res = await fetch(`${COMPETITION_SERVICE}/competitions`, { method: "POST", headers: h, body: JSON.stringify(body) })
  const json = await res.json()
  return NextResponse.json(json, { status: res.status })
}
