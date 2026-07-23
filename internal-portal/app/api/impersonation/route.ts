import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const ADMIN_SERVICE = process.env.ADMIN_SERVICE_URL || "http://127.0.0.1:4006"
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || "dev-internal-secret"

async function internalHeaders() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return {
    "Content-Type": "application/json",
    "x-internal-secret": INTERNAL_SECRET,
    ...(user?.id ? { "x-staff-id": user.id } : {}),
    ...(user?.email ? { "x-staff-email": user.email } : {}),
  }
}

export async function GET(request: NextRequest) {
  const qs = new URLSearchParams(new URL(request.url).searchParams)
  try {
    const res = await fetch(`${ADMIN_SERVICE}/v1/internal/impersonation?${qs}`, {
      headers: await internalHeaders(), cache: "no-store",
    })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({ error: "Failed to load sessions" }, { status: 500 })
  }
}
