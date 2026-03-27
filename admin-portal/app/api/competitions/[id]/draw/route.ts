import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const COMPETITION_SERVICE = process.env.NEXT_PUBLIC_COMPETITION_SERVICE_URL || "http://127.0.0.1:4009"

async function authHeaders() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  return { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const h = await authHeaders()
  if (!h) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const divisionId = req.nextUrl.searchParams.get("divisionId")
  if (!divisionId) return NextResponse.json({ error: "divisionId required" }, { status: 400 })
  const { "Content-Type": _ct, ...noBody } = h
  const res = await fetch(`${COMPETITION_SERVICE}/competitions/${id}/divisions/${divisionId}/draw`, { method: "POST", headers: noBody })
  const json = await res.json()
  return NextResponse.json(json, { status: res.status })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const h = await authHeaders()
  if (!h) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const divisionId = req.nextUrl.searchParams.get("divisionId")
  if (!divisionId) return NextResponse.json({ error: "divisionId required" }, { status: 400 })
  const { "Content-Type": _ct, ...noBody } = h
  const res = await fetch(`${COMPETITION_SERVICE}/competitions/${id}/divisions/${divisionId}/draw`, { method: "DELETE", headers: noBody })
  return new NextResponse(null, { status: res.status })
}
