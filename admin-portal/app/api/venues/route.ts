import { createClient } from '@/lib/supabase/server'

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

export async function GET() {
  const res = await fetch(`${FACILITY_SERVICE}/venues`, {
    headers: await getAuthHeaders(),
    cache: "no-store",
  })
  const data = await res.json()
  return new Response(JSON.stringify(data), {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  })
}

export async function POST(request: Request) {
  const body = await request.json()
  const res = await fetch(`${FACILITY_SERVICE}/venues`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return new Response(JSON.stringify(data), {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  })
}
