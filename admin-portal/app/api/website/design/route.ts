import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const VENUE_SERVICE = "http://127.0.0.1:4003"

async function getAuthHeaders() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("Not authenticated")
  return {
    "Authorization": `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  }
}

export async function GET() {
  try {
    const headers = await getAuthHeaders()
    const res = await fetch(`${VENUE_SERVICE}/organisations/me`, { headers, cache: "no-store" })
    const json = await res.json()
    const org = json?.data ?? {}
    return NextResponse.json({
      data: {
        primaryColour:   org.primaryColour   ?? "#1857E0",
        secondaryColour: org.secondaryColour ?? "#E05518",
        logoUrl:         org.logoUrl         ?? "",
        faviconUrl:      org.faviconUrl      ?? "",
        headingFont:     org.headingFont     ?? "Inter",
        bodyFont:        org.bodyFont        ?? "Inter",
        navLayout:       org.navLayout       ?? "dark-inline",
        name:            org.name            ?? "",
      }
    }, { status: res.status })
  } catch {
    return NextResponse.json({ error: "Failed to fetch design settings" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const headers = await getAuthHeaders()
    const body = await request.json()
    const res = await fetch(`${VENUE_SERVICE}/organisations/me/design`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    })
    const text = await res.text()
    let data: any = null
    try { data = text ? JSON.parse(text) : null } catch { data = { error: text } }
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: "Failed to save design settings" }, { status: 500 })
  }
}
