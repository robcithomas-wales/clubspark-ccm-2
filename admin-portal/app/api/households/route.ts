import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const PEOPLE_SERVICE = process.env.NEXT_PUBLIC_PEOPLE_SERVICE_URL || "http://127.0.0.1:4004"

async function getAuthHeaders() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("Not authenticated")
  return { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }
}

export async function GET() {
  try {
    const res = await fetch(`${PEOPLE_SERVICE}/households`, {
      headers: await getAuthHeaders(),
      cache: "no-store",
    })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({ error: "Failed to fetch households" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const res = await fetch(`${PEOPLE_SERVICE}/households`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify(body),
    })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({ error: "Failed to create household" }, { status: 500 })
  }
}
