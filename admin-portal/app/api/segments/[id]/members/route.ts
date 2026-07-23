import { NextRequest, NextResponse } from "next/server"

const PEOPLE_SERVICE = "http://127.0.0.1:4004"
const HEADERS = {
  "x-tenant-id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "Content-Type": "application/json",
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const res = await fetch(`${PEOPLE_SERVICE}/segments/${id}/members`, { headers: HEADERS })
  const json = await res.json().catch(() => ({}))
  return NextResponse.json(json, { status: res.status })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await req.json()
  const res = await fetch(`${PEOPLE_SERVICE}/segments/${id}/members`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  return NextResponse.json(json, { status: res.status })
}
