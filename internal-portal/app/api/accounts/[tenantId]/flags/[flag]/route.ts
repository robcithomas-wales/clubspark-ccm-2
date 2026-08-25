import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireInternalSecret } from '@/lib/internal-secret'

const ADMIN_SERVICE = process.env.ADMIN_SERVICE_URL || 'http://127.0.0.1:4006'

async function internalHeaders() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return {
    'Content-Type': 'application/json',
    'x-internal-secret': requireInternalSecret(),
    ...(user?.id ? { 'x-staff-id': user.id } : {}),
    ...(user?.email ? { 'x-staff-email': user.email } : {}),
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; flag: string }> },
) {
  const { tenantId, flag } = await params
  try {
    const res = await fetch(
      `${ADMIN_SERVICE}/v1/internal/organisations/${tenantId}/flags/${flag}`,
      {
        method: 'PUT',
        headers: await internalHeaders(),
        body: JSON.stringify(await request.json()),
      },
    )
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({ error: 'Failed to set flag' }, { status: 500 })
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ tenantId: string; flag: string }> },
) {
  const { tenantId, flag } = await params
  try {
    const res = await fetch(
      `${ADMIN_SERVICE}/v1/internal/organisations/${tenantId}/flags/${flag}`,
      {
        method: 'DELETE',
        headers: await internalHeaders(),
      },
    )
    if (res.status === 204) return new NextResponse(null, { status: 204 })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({ error: 'Failed to reset flag' }, { status: 500 })
  }
}
