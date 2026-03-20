import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ADMIN_SERVICE = process.env.NEXT_PUBLIC_ADMIN_SERVICE_URL || 'http://127.0.0.1:4006'

async function authHeaders(session: { access_token: string }) {
  return { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const res = await fetch(`${ADMIN_SERVICE}/admin-users/${id}`, {
    method: 'PATCH',
    headers: await authHeaders(session),
    body: JSON.stringify(body),
  })
  const json = await res.json()
  return NextResponse.json(json, { status: res.status })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const res = await fetch(`${ADMIN_SERVICE}/admin-users/${id}`, {
    method: 'DELETE',
    headers: await authHeaders(session),
  })
  if (res.status === 200 || res.status === 204) {
    return NextResponse.json({ success: true })
  }
  const json = await res.json().catch(() => ({}))
  return NextResponse.json(json, { status: res.status })
}
