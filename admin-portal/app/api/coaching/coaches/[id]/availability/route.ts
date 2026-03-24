import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const COACHING = process.env.NEXT_PUBLIC_COACHING_SERVICE_URL || "http://127.0.0.1:4007"

async function headers() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return {
    "Authorization": `Bearer ${session?.access_token ?? ""}`,
    "Content-Type": "application/json",
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const res = await fetch(`${COACHING}/coaches/${id}/availability/windows`, { headers: await headers() })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await req.json()
  const res = await fetch(`${COACHING}/coaches/${id}/availability/windows`, {
    method: "PUT",
    headers: await headers(),
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
