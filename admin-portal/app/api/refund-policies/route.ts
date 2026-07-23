import { NextRequest, NextResponse } from "next/server"

const BOOKING_SERVICE = "http://127.0.0.1:4005"
const HEADERS = {
  "x-tenant-id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "x-organisation-id": "11111111-1111-1111-1111-111111111111",
}

export async function GET() {
  const res = await fetch(`${BOOKING_SERVICE}/v1/refund-policies`, {
    headers: HEADERS,
    cache: "no-store",
  })
  const json = await res.json().catch(() => ({}))
  return NextResponse.json(json, { status: res.status })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const res = await fetch(`${BOOKING_SERVICE}/v1/refund-policies`, {
    method: "POST",
    headers: { ...HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  return NextResponse.json(json, { status: res.status })
}
