import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const VENUE_SERVICE = "http://127.0.0.1:4003"

async function getAuthHeaders() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("Not authenticated")
  return {
    "Authorization": `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  }
}

export async function GET() {
  try {
    const headers = await getAuthHeaders()
    const res = await fetch(`${VENUE_SERVICE}/news-posts`, { headers, cache: "no-store" })
    const json = await res.json()
    return NextResponse.json(json, { status: res.status })
  } catch {
    return NextResponse.json({ error: "Failed to fetch news posts" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const headers = await getAuthHeaders()
    const body = await request.json()
    const res = await fetch(`${VENUE_SERVICE}/news-posts`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    })
    const json = await res.json()
    return NextResponse.json(json, { status: res.status })
  } catch {
    return NextResponse.json({ error: "Failed to create news post" }, { status: 500 })
  }
}
