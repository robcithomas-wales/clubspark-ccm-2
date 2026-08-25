import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireInternalSecret } from '@/lib/internal-secret'

const ADMIN_SERVICE = process.env.ADMIN_SERVICE_URL || 'http://127.0.0.1:4006'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const res = await fetch(`${ADMIN_SERVICE}/v1/internal/stats`, {
    headers: {
      'x-internal-secret': requireInternalSecret(),
      ...(user?.id ? { 'x-staff-id': user.id } : {}),
      ...(user?.email ? { 'x-staff-email': user.email } : {}),
    },
    cache: 'no-store',
  })

  const json = await res.json()
  return NextResponse.json(json)
}
