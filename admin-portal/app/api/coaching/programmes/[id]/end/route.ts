import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const COACHING_SERVICE = process.env.NEXT_PUBLIC_COACHING_SERVICE_URL || "http://127.0.0.1:4007"

async function getAuthHeaders() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("Not authenticated")
  return { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(`${COACHING_SERVICE}/programmes/${params.id}/end`, { method: "POST", headers: await getAuthHeaders() })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({ error: "Failed to end programme" }, { status: 500 })
  }
}
