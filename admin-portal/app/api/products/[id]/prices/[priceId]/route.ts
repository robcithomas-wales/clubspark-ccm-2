import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const ORDER_SERVICE = process.env.ORDER_SERVICE_URL || "http://127.0.0.1:4015"

async function getAuthHeaders() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("Not authenticated")
  return { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; priceId: string }> },
) {
  const { id, priceId } = await params
  try {
    const res = await fetch(`${ORDER_SERVICE}/products/${id}/prices/${priceId}`, {
      method: "DELETE", headers: await getAuthHeaders(),
    })
    if (res.status === 204) return new NextResponse(null, { status: 204 })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({ error: "Failed to delete price" }, { status: 500 })
  }
}
