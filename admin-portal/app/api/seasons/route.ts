import { NextRequest, NextResponse } from "next/server"

const VENUE_SERVICE = "http://127.0.0.1:4003"
const HEADERS = { "x-tenant-id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" }

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const params = new URLSearchParams()
  if (searchParams.get("venueId")) params.set("venueId", searchParams.get("venueId")!)
  if (searchParams.get("status")) params.set("status", searchParams.get("status")!)

  const res = await fetch(`${VENUE_SERVICE}/v1/seasonal-schedules?${params}`, {
    headers: HEADERS,
    cache: "no-store",
  })
  const json = await res.json().catch(() => ({}))
  return NextResponse.json(json, { status: res.status })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const res = await fetch(`${VENUE_SERVICE}/v1/seasonal-schedules`, {
    method: "POST",
    headers: { ...HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  return NextResponse.json(json, { status: res.status })
}
