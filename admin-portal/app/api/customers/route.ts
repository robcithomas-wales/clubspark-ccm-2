import { NextRequest, NextResponse } from "next/server"

const customerServiceBaseUrl = "http://127.0.0.1:4004"

const CUSTOMER_HEADERS = {
  "x-tenant-id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "x-organisation-id": "11111111-1111-1111-1111-111111111111",
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search")
  const page = searchParams.get("page")
  const limit = searchParams.get("limit")

  const params = new URLSearchParams()
  if (search) params.set("search", search)
  if (page) params.set("page", page)
  if (limit) params.set("limit", limit)

  const qs = params.toString()
  const url = `${customerServiceBaseUrl}/customers${qs ? `?${qs}` : ""}`

  try {
    const response = await fetch(url, {
      headers: CUSTOMER_HEADERS,
      cache: "no-store",
    })

    const data = await response.json()

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load customers" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const response = await fetch(`${customerServiceBaseUrl}/customers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...CUSTOMER_HEADERS,
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 }
    )
  }
}