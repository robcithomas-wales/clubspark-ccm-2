import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const ORDER_SERVICE = process.env.ORDER_SERVICE_URL || "http://127.0.0.1:4015"

async function getAuthHeaders() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("Not authenticated")
  return { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }
}

export async function GET(request: NextRequest) {
  const qs = new URLSearchParams(new URL(request.url).searchParams)
  try {
    const res = await fetch(`${ORDER_SERVICE}/products?${qs}`, { headers: await getAuthHeaders(), cache: "no-store" })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({ error: "Failed to load products" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const res = await fetch(`${ORDER_SERVICE}/products`, {
      method: "POST", headers: await getAuthHeaders(), body: JSON.stringify(await request.json()),
    })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
  }
}
