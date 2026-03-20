import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const CUSTOMER_SERVICE = process.env.NEXT_PUBLIC_CUSTOMER_SERVICE_URL || "http://127.0.0.1:4004"

async function getAuthHeaders() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("Not authenticated")
  return {
    "Authorization": `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; tagId: string }> }
) {
  try {
    const { id, tagId } = await params
    const headers = await getAuthHeaders()
    const res = await fetch(`${CUSTOMER_SERVICE}/customers/${id}/tags/${tagId}`, {
      method: "DELETE",
      headers,
      cache: "no-store",
    })
    const json = await res.json()
    return NextResponse.json(json, { status: res.status })
  } catch {
    return NextResponse.json({ error: "Failed to remove tag" }, { status: 500 })
  }
}
