import { NextRequest, NextResponse } from "next/server"

const VENUE_SERVICE = "http://127.0.0.1:4003"
const HEADERS = { "x-tenant-id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" }

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const res = await fetch(`${VENUE_SERVICE}/v1/seasonal-schedules/${id}`, {
    headers: HEADERS,
    cache: "no-store",
  })
  const json = await res.json().catch(() => ({}))
  return NextResponse.json(json, { status: res.status })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await req.json()
  const res = await fetch(`${VENUE_SERVICE}/v1/seasonal-schedules/${id}`, {
    method: "PATCH",
    headers: { ...HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  return NextResponse.json(json, { status: res.status })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const res = await fetch(`${VENUE_SERVICE}/v1/seasonal-schedules/${id}`, {
    method: "DELETE",
    headers: HEADERS,
  })
  if (res.status === 204) return new NextResponse(null, { status: 204 })
  const json = await res.json().catch(() => ({}))
  return NextResponse.json(json, { status: res.status })
}
