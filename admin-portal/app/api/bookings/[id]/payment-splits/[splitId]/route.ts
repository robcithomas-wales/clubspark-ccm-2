import { NextRequest, NextResponse } from 'next/server'

const BOOKING_SERVICE = 'http://127.0.0.1:4004'
const TENANT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; splitId: string } },
) {
  const res = await fetch(
    `${BOOKING_SERVICE}/v1/bookings/${params.id}/payment-splits/${params.splitId}`,
    { method: 'DELETE', headers: { 'x-tenant-id': TENANT_ID } },
  )
  if (res.status === 204) return new NextResponse(null, { status: 204 })
  const json = await res.json()
  return NextResponse.json(json, { status: res.status })
}
