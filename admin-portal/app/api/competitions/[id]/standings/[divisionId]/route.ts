import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const COMPETITION_SERVICE = process.env.NEXT_PUBLIC_COMPETITION_SERVICE_URL || "http://127.0.0.1:4009"

async function authHeaders() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  return { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; divisionId: string }> }) {
  const h = await authHeaders()
  if (!h) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id, divisionId } = await params
  const res = await fetch(`${COMPETITION_SERVICE}/competitions/${id}/divisions/${divisionId}/standings`, { headers: h, cache: "no-store" })
  const json = await res.json()
  return NextResponse.json(json, { status: res.status })
}
