import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const COACHING_SERVICE = process.env.NEXT_PUBLIC_COACHING_SERVICE_URL || "http://127.0.0.1:4007"

async function getAuthHeaders() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("Not authenticated")
  return { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const qs = new URLSearchParams()
  for (const [k, v] of searchParams.entries()) qs.set(k, v)
  try {
    const res = await fetch(`${COACHING_SERVICE}/sessions?${qs}`, {
      headers: await getAuthHeaders(),
      cache: "no-store",
    })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({ error: "Failed to load sessions" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const res = await fetch(`${COACHING_SERVICE}/sessions`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify(body),
    })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 })
  }
}
