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

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string; fixtureId: string }> }) {
  const { id, fixtureId } = await params
  try {
    const res = await fetch(`${TEAM_SERVICE}/teams/${id}/fixtures/${fixtureId}/selection/publish`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({}),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: "Failed to publish selection" }, { status: 500 })
  }
}
