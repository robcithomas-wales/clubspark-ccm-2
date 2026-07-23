import { NextRequest, NextResponse } from "next/server"

const PEOPLE_SERVICE = "http://127.0.0.1:4004"
const HEADERS = {
  "x-tenant-id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "Content-Type": "application/json",
}

export async function GET() {
  const res = await fetch(`${PEOPLE_SERVICE}/segments`, { headers: HEADERS })
  const json = await res.json().catch(() => ({}))
  return NextResponse.json(json, { status: res.status })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const res = await fetch(`${PEOPLE_SERVICE}/segments`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  return NextResponse.json(json, { status: res.status })
}
