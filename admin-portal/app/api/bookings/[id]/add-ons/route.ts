import { NextResponse } from "next/server"

const BOOKING_HEADERS = {
  "x-tenant-id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "x-organisation-id": "11111111-1111-1111-1111-111111111111",
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const response = await fetch(`http://127.0.0.1:4005/bookings/${id}/add-ons`, {
      headers: BOOKING_HEADERS,
      cache: "no-store",
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json({ error: "Failed to load booking add-ons" }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  try {
    const response = await fetch(`http://127.0.0.1:4005/bookings/${id}/add-ons`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...BOOKING_HEADERS,
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json({ error: "Failed to create booking add-on" }, { status: 500 })
  }
}
