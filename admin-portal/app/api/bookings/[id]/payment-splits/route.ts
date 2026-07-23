import { NextRequest, NextResponse } from 'next/server'

const BOOKING_SERVICE = 'http://127.0.0.1:4004'
const TENANT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const res = await fetch(`${BOOKING_SERVICE}/v1/bookings/${params.id}/payment-splits`, {
    headers: { 'x-tenant-id': TENANT_ID },
  })
  const json = await res.json()
  return NextResponse.json(json, { status: res.status })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const res = await fetch(`${BOOKING_SERVICE}/v1/bookings/${params.id}/payment-splits`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-tenant-id': TENANT_ID },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  return NextResponse.json(json, { status: res.status })
}
