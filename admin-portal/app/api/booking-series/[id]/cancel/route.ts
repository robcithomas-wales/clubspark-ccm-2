import { createClient } from '@/lib/supabase/server'

async function getAuthHeaders() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("Not authenticated")
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  }
}

const BASE = "http://127.0.0.1:4005/booking-series"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()
  const res = await fetch(`${BASE}/${id}/cancel`, {
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
