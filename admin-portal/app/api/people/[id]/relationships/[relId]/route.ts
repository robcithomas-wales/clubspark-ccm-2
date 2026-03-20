import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const PEOPLE_SERVICE = process.env.NEXT_PUBLIC_PEOPLE_SERVICE_URL || "http://127.0.0.1:4004"

async function getAuthHeaders() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("Not authenticated")
  return { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; relId: string }> }
) {
  try {
    const { id, relId } = await params
    const res = await fetch(`${PEOPLE_SERVICE}/people/${id}/relationships/${relId}`, {
      method: "DELETE",
      headers: await getAuthHeaders(),
    })
    if (res.status === 204) return new NextResponse(null, { status: 204 })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({ error: "Failed to remove relationship" }, { status: 500 })
  }
}
