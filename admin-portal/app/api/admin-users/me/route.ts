import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ADMIN_SERVICE = process.env.NEXT_PUBLIC_ADMIN_SERVICE_URL || 'http://127.0.0.1:4006'

export async function GET() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const res = await fetch(`${ADMIN_SERVICE}/admin-users/me`, {
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    cache: 'no-store',
  })
  const json = await res.json()
  return NextResponse.json(json, { status: res.status })
}
