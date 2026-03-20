import { NextRequest, NextResponse } from "next/server"
import { createClient } from '@/lib/supabase/server'

async function getAuthHeaders() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("Not authenticated")
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  }
}

const peopleServiceBaseUrl = "http://127.0.0.1:4004"

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
  const url = `${peopleServiceBaseUrl}/customers${qs ? `?${qs}` : ""}`

  try {
    const response = await fetch(url, {
      headers: await getAuthHeaders(),
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

    const response = await fetch(`${peopleServiceBaseUrl}/customers`, {
      method: "POST",
      headers: await getAuthHeaders(),
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
