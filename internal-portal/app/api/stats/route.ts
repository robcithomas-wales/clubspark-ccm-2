import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const ADMIN_SERVICE = process.env.ADMIN_SERVICE_URL || "http://127.0.0.1:4006"
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || "dev-internal-secret"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const res = await fetch(`${ADMIN_SERVICE}/v1/internal/stats`, {
    headers: {
      "x-internal-secret": INTERNAL_SECRET,
      ...(user?.id ? { "x-staff-id": user.id } : {}),
      ...(user?.email ? { "x-staff-email": user.email } : {}),
    },
    cache: "no-store",
  })

  const json = await res.json()
  return NextResponse.json(json)
}
