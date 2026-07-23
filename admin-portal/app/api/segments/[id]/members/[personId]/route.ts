import { NextRequest, NextResponse } from "next/server"

const PEOPLE_SERVICE = "http://127.0.0.1:4004"
const HEADERS = { "x-tenant-id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" }

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; personId: string }> },
) {
  const { id, personId } = await params
  const res = await fetch(`${PEOPLE_SERVICE}/segments/${id}/members/${personId}`, {
    method: "DELETE",
    headers: HEADERS,
  })
  if (res.status === 204) return new NextResponse(null, { status: 204 })
  const json = await res.json().catch(() => ({}))
  return NextResponse.json(json, { status: res.status })
}
