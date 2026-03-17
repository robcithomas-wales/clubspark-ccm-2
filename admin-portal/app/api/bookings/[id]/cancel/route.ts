import { NextResponse } from "next/server"

const BOOKING_HEADERS = {
  "x-tenant-id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "x-organisation-id": "11111111-1111-1111-1111-111111111111",
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const response = await fetch(`http://127.0.0.1:4005/bookings/${id}/cancel`, {
      method: "POST",
      headers: BOOKING_HEADERS,
      cache: "no-store",
    })

    const text = await response.text()

    let data: any = null

    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = { error: text || "Unknown response from booking service" }
    }

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("Cancel booking proxy failed:", error)

    return NextResponse.json(
      { error: "Failed to cancel booking" },
      { status: 500 }
    )
  }
}