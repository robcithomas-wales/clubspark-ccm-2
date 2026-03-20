import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const CUSTOMER_SERVICE = process.env.NEXT_PUBLIC_CUSTOMER_SERVICE_URL || "http://127.0.0.1:4004"

async function getAuthHeaders() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("Not authenticated")
  return {
    "Authorization": `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const headers = await getAuthHeaders()
    const res = await fetch(`${CUSTOMER_SERVICE}/customers/${id}/tags`, { headers, cache: "no-store" })
    const json = await res.json()
    return NextResponse.json(json, { status: res.status })
  } catch {
    return NextResponse.json({ error: "Failed to fetch person tags" }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const headers = await getAuthHeaders()
    const body = await request.json()
    const res = await fetch(`${CUSTOMER_SERVICE}/customers/${id}/tags`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    })
    const json = await res.json()
    return NextResponse.json(json, { status: res.status })
  } catch {
    return NextResponse.json({ error: "Failed to apply tag" }, { status: 500 })
  }
}
