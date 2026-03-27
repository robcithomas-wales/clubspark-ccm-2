import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const COACHING_SERVICE = process.env.NEXT_PUBLIC_COACHING_SERVICE_URL || "http://127.0.0.1:4007"

async function getAuthHeaders() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("Not authenticated")
  return { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    const res = await fetch(`${COACHING_SERVICE}/sessions/${id}`, {
      headers: await getAuthHeaders(),
      cache: "no-store",
    })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({ error: "Failed to load session" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    const body = await request.json()
    const res = await fetch(`${COACHING_SERVICE}/sessions/${id}`, {
      method: "PATCH",
      headers: await getAuthHeaders(),
      body: JSON.stringify(body),
    })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    const res = await fetch(`${COACHING_SERVICE}/sessions/${id}`, {
      method: "DELETE",
      headers: await getAuthHeaders(),
    })
    if (res.status === 204) return new NextResponse(null, { status: 204 })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 })
  }
}
