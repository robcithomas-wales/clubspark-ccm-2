import { NextRequest, NextResponse } from "next/server"

const PEOPLE_SERVICE = "http://127.0.0.1:4004"
const HEADERS = { "x-tenant-id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" }

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const res = await fetch(`${PEOPLE_SERVICE}/segments/${id}/rebuild`, {
    method: "POST",
    headers: HEADERS,
  })
  const json = await res.json().catch(() => ({}))
  return NextResponse.json(json, { status: res.status })
}
