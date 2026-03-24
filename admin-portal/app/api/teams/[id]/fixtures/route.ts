import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const TEAM_SERVICE = process.env.NEXT_PUBLIC_TEAM_SERVICE_URL || "http://127.0.0.1:4008"

async function getAuthHeaders() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("Not authenticated")
  return {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const qs = new URLSearchParams()
  for (const [k, v] of searchParams.entries()) qs.set(k, v)
  try {
    const res = await fetch(`${TEAM_SERVICE}/teams/${id}/fixtures?${qs}`, {
      headers: await getAuthHeaders(),
      cache: "no-store",
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: "Failed to load fixtures" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await request.json()
    const res = await fetch(`${TEAM_SERVICE}/teams/${id}/fixtures`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: "Failed to create fixture" }, { status: 500 })
  }
}
