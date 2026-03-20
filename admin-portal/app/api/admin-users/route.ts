import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ADMIN_SERVICE = process.env.NEXT_PUBLIC_ADMIN_SERVICE_URL || 'http://127.0.0.1:4006'

async function authHeaders(session: { access_token: string }) {
  return { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const res = await fetch(`${ADMIN_SERVICE}/admin-users`, {
    headers: await authHeaders(session),
    cache: 'no-store',
  })
  const json = await res.json()
  return NextResponse.json(json, { status: res.status })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const res = await fetch(`${ADMIN_SERVICE}/admin-users`, {
    method: 'POST',
    headers: await authHeaders(session),
    body: JSON.stringify(body),
  })
  const json = await res.json()
  return NextResponse.json(json, { status: res.status })
}
