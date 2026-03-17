import { NextResponse } from "next/server"

const BOOKING_HEADERS = {
  "x-tenant-id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "x-organisation-id": "11111111-1111-1111-1111-111111111111",
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  try {
    const response = await fetch(`http://127.0.0.1:4005/bookings/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...BOOKING_HEADERS,
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 })
  }
}
