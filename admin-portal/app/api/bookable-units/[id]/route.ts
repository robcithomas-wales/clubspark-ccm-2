import { NextResponse } from 'next/server'
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const res = await fetch(`${FACILITY_SERVICE}/bookable-units/${id}`, {
    method: "PATCH",
    headers: await getAuthHeaders(),
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let data: any = null
  try { data = text ? JSON.parse(text) : null } catch { data = { error: text } }
  return NextResponse.json(data, { status: res.status })
}
