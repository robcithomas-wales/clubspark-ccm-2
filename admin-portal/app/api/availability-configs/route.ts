import { NextRequest, NextResponse } from 'next/server'

const VENUE_SERVICE = 'http://127.0.0.1:4003'
const TENANT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

export async function GET(req: NextRequest) {
  const search = req.nextUrl.search
  const res = await fetch(`${VENUE_SERVICE}/v1/availability-configs${search}`, {
    headers: { 'x-tenant-id': TENANT_ID },
  })
  const json = await res.json()
  return NextResponse.json(json, { status: res.status })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const res = await fetch(`${VENUE_SERVICE}/v1/availability-configs`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-tenant-id': TENANT_ID },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  return NextResponse.json(json, { status: res.status })
}
