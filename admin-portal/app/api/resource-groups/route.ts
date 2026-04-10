import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

const FACILITY_SERVICE = process.env.NEXT_PUBLIC_FACILITY_SERVICE_URL || "http://127.0.0.1:4003"

async function getAuthHeaders() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("Not authenticated")
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  }
}

export async function GET(req: NextRequest) {
  const venueId = req.nextUrl.searchParams.get("venueId")
  const url = venueId
    ? `${FACILITY_SERVICE}/resource-groups?venueId=${venueId}`
    : `${FACILITY_SERVICE}/resource-groups`

  const res = await fetch(url, { headers: await getAuthHeaders() })
  const data = await res.json()
  return new Response(JSON.stringify(data), {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  })
}
