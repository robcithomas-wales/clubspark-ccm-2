import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireInternalSecret } from "@/lib/internal-secret"

const ADMIN_SERVICE = process.env.ADMIN_SERVICE_URL || "http://127.0.0.1:4006"

async function internalHeaders() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return {
    "Content-Type": "application/json",
    "x-internal-secret": requireInternalSecret(),
    ...(user?.id ? { "x-staff-id": user.id } : {}),
    ...(user?.email ? { "x-staff-email": user.email } : {}),
  }
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params
  try {
    const res = await fetch(`${ADMIN_SERVICE}/v1/internal/organisations/${tenantId}/flags`, {
      headers: await internalHeaders(), cache: "no-store",
    })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({ error: "Failed to load flags" }, { status: 500 })
  }
}
