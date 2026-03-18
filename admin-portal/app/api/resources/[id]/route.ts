import { NextResponse } from "next/server"
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()
    const response = await fetch(`http://127.0.0.1:4003/resources/${id}`, {
      method: "PATCH",
      headers: await getAuthHeaders(),
      body: JSON.stringify(body),
      cache: "no-store",
    })

    const text = await response.text()
    let data: any = null
    try { data = text ? JSON.parse(text) : null } catch { data = { error: text } }
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("Update resource proxy failed:", error)
    return NextResponse.json({ error: "Failed to update resource" }, { status: 500 })
  }
}
