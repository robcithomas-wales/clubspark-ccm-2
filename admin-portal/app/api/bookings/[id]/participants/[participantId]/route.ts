import { NextRequest, NextResponse } from "next/server"

const BOOKING_SERVICE = "http://127.0.0.1:4005"
const HEADERS = {
  "x-tenant-id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; participantId: string }> },
) {
  const { id, participantId } = await params
  const res = await fetch(
    `${BOOKING_SERVICE}/v1/bookings/${id}/participants/${participantId}`,
    { method: "DELETE", headers: HEADERS },
  )
  if (res.status === 204) return new NextResponse(null, { status: 204 })
  const json = await res.json().catch(() => ({}))
  return NextResponse.json(json, { status: res.status })
}
