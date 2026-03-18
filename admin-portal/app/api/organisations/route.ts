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
    const res = await fetch(`${VENUE_SERVICE}/organisations/me`, { headers, cache: "no-store" })
    const text = await res.text()
    let data: any = null
    try { data = text ? JSON.parse(text) : null } catch { data = { error: text } }
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error("GET /api/organisations failed:", error)
    return NextResponse.json({ error: "Failed to fetch organisation" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const headers = await getAuthHeaders()
    const body = await request.json()
    const res = await fetch(`${VENUE_SERVICE}/organisations/me`, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    })
    const text = await res.text()
    let data: any = null
    try { data = text ? JSON.parse(text) : null } catch { data = { error: text } }
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error("PUT /api/organisations failed:", error)
    return NextResponse.json({ error: "Failed to save organisation" }, { status: 500 })
  }
}
