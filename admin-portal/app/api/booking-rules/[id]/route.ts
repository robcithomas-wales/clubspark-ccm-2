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

const BASE = "http://127.0.0.1:4005/booking-rules"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const res = await fetch(`${BASE}/${id}`, { headers: await getAuthHeaders(), cache: "no-store" })
  const data = await res.json()
  return new Response(JSON.stringify(data), {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()
  const res = await fetch(`${BASE}/${id}`, {
    method: "PATCH",
    headers: await getAuthHeaders(),
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return new Response(JSON.stringify(data), {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const res = await fetch(`${BASE}/${id}`, {
    method: "DELETE",
    headers: await getAuthHeaders(),
  })
  if (res.status === 204) {
    return new Response(null, { status: 204 })
  }
  const data = await res.json()
  return new Response(JSON.stringify(data), {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  })
}
