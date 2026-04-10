import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const VENUE_URL = process.env.NEXT_PUBLIC_VENUE_SERVICE_URL!
const BOOKING_URL = process.env.NEXT_PUBLIC_BOOKING_SERVICE_URL!

// ─── Booking tools ────────────────────────────────────────────────────────────

const BOOKING_TOOLS: Anthropic.Tool[] = [
  {
    name: "list_venues",
    description: "List all venues at this club",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "list_resources",
    description: "List all bookable resources (courts, pitches, etc.) at a venue",
    input_schema: {
      type: "object" as const,
      properties: {
        venueId: { type: "string", description: "The venue ID" },
      },
      required: ["venueId"],
    },
  },
  {
    name: "search_availability",
    description: "Find available booking slots for a resource on a given date. Returns a list of available slots with court name, start time, and end time.",
    input_schema: {
      type: "object" as const,
      properties: {
        venueId: { type: "string" },
        resourceId: { type: "string" },
        date: { type: "string", description: "ISO date YYYY-MM-DD" },
        timePreference: {
          type: "string",
          enum: ["morning", "afternoon", "evening", "any"],
          description: "Time of day preference",
        },
        durationMinutes: {
          type: "number",
          description: "Minimum slot duration required in minutes (default 60)",
        },
      },
      required: ["venueId", "resourceId", "date"],
    },
  },
  {
    name: "make_booking",
    description: "Create a confirmed booking for the member once they have chosen a specific slot",
    input_schema: {
      type: "object" as const,
      properties: {
        venueId: { type: "string" },
        resourceId: { type: "string" },
        unitId: { type: "string" },
        startsAt: { type: "string", description: "ISO datetime e.g. 2026-04-05T14:00:00.000Z" },
        endsAt: { type: "string", description: "ISO datetime e.g. 2026-04-05T15:00:00.000Z" },
      },
      required: ["venueId", "resourceId", "unitId", "startsAt", "endsAt"],
    },
  },
]

async function executeTool(
  name: string,
  input: Record<string, any>,
  tenantId: string,
  authToken: string,
  customerId: string,
): Promise<string> {
  // Venue and availability reads use tenant-header auth only — customer JWTs don't
  // carry app_metadata.tenantId so the JWT path in the guard would reject them.
  const tenantHeaders = {
    "x-tenant-id": tenantId,
    "Content-Type": "application/json",
  }
  // Booking POST uses the customer JWT so the service can identify the caller.
  const authHeaders = {
    Authorization: `Bearer ${authToken}`,
    "x-tenant-id": tenantId,
    "Content-Type": "application/json",
  }

  try {
    if (name === "list_venues") {
      const res = await fetch(`${VENUE_URL}/venues`, { headers: tenantHeaders })
      const json = await res.json()
      const venues: { id: string; name: string; city: string | null }[] = json.data ?? []
      if (venues.length === 0) return "No venues found."
      return JSON.stringify(venues.map((v) => ({ id: v.id, name: v.name, city: v.city })))
    }

    if (name === "list_resources") {
      const res = await fetch(`${VENUE_URL}/resources?venueId=${input.venueId}&isActive=true`, { headers: tenantHeaders })
      const json = await res.json()
      const resources: { id: string; name: string; sport: string | null; surface: string | null }[] = json.data ?? []
      if (resources.length === 0) return "No resources found at this venue."
      return JSON.stringify(resources.map((r) => ({ id: r.id, name: r.name, sport: r.sport, surface: r.surface })))
    }

    if (name === "search_availability") {
      const [unitsRes, availRes] = await Promise.all([
        fetch(`${VENUE_URL}/venues/${input.venueId}/units`, { headers: tenantHeaders }),
        fetch(`${BOOKING_URL}/availability/day?venueId=${input.venueId}&date=${input.date}`, { headers: tenantHeaders }),
      ])

      const unitsJson = await unitsRes.json()
      const availJson = await availRes.json()

      const allUnits: { id: string; name: string; resourceId: string; isActive: boolean }[] = unitsJson.data ?? []
      const resourceUnitIds = new Set(
        allUnits.filter((u) => u.resourceId === input.resourceId && u.isActive).map((u) => u.id),
      )

      const units: { id: string; name: string; slots: { startsAt: string; endsAt: string; isAvailable: boolean }[] }[] =
        availJson.data?.units ?? []

      const durationMs = (input.durationMinutes ?? 60) * 60 * 1000
      const pref: string = input.timePreference ?? "any"

      const slots: { unitId: string; unitName: string; start: string; end: string }[] = []
      for (const unit of units) {
        if (!resourceUnitIds.has(unit.id)) continue
        for (const slot of unit.slots) {
          if (!slot.isAvailable) continue
          const h = new Date(slot.startsAt).getHours()
          if (pref === "morning" && h >= 12) continue
          if (pref === "afternoon" && (h < 12 || h >= 17)) continue
          if (pref === "evening" && h < 17) continue
          const slotMs = new Date(slot.endsAt).getTime() - new Date(slot.startsAt).getTime()
          if (slotMs < durationMs) continue
          slots.push({ unitId: unit.id, unitName: unit.name, start: slot.startsAt, end: slot.endsAt })
        }
      }

      if (slots.length === 0) return "No available slots found matching your criteria."
      return JSON.stringify(slots.slice(0, 10))
    }

    if (name === "make_booking") {
      const res = await fetch(`${BOOKING_URL}/bookings`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          venueId: input.venueId,
          resourceId: input.resourceId,
          bookableUnitId: input.unitId,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          customerId,
          bookingSource: "ai-agent",
        }),
      })
      const json = await res.json()
      if (!res.ok) return `Booking failed: ${json?.message ?? "Unknown error"}`
      return `Booking confirmed. ID: ${json.data?.id}. Status: ${json.data?.status}.`
    }

    return "Unknown tool."
  } catch (e: any) {
    return `Tool error: ${e?.message ?? "Unknown"}`
  }
}

// ─── System prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(today: string, canBook: boolean): string {
  return `You are the AI assistant for a sports club member portal. Today's date is ${today}.

${
  canBook
    ? `## Making bookings
You can book courts and facilities for members. When someone asks to book:
1. Call list_venues (skip if only one venue — go straight to list_resources)
2. Call list_resources to see what facilities are available
3. Call search_availability with the right date, resourceId, venueId, and timePreference
4. Present the top 3 to 5 available slots clearly — court name and time range
5. When the member confirms a specific slot, call make_booking
6. Confirm success with a short, friendly summary

Resolve relative dates from today (${today}): "this Saturday", "tomorrow", "next week" etc.
Afternoon = 12:00 to 17:00. Morning = before 12:00. Evening = 17:00 and later.
If no slots are available, suggest trying a different time or date.`
    : `## Bookings
You cannot make bookings right now because the member is not signed in. Kindly ask them to log in first.`
}

## Portal support
Help members with questions about: booking courts, coaching sessions, memberships, competitions, account management, news, and events.
If you do not know something specific about the club's setup, tell the member to contact the club directly.

## Style
- Plain conversational text only. No markdown headers, no bullet dashes, no bold asterisks.
- Short responses: 2 to 4 sentences per turn.
- Friendly and to the point.`
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: "Assistant unavailable" }, { status: 503 })

    const { messages, tenantId, authToken, customerId } = await req.json()

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const sanitised = messages
      .filter((m: any) => m.role === "user" || m.role === "assistant")
      .map((m: any) => ({ role: m.role as "user" | "assistant", content: String(m.content).slice(0, 2000) }))
      .slice(-20)

    if (sanitised.length === 0 || sanitised[sanitised.length - 1].role !== "user") {
      return NextResponse.json({ error: "Invalid message sequence" }, { status: 400 })
    }

    const today = new Date().toISOString().split("T")[0]
    const canBook = Boolean(tenantId && authToken && customerId)
    const tools = canBook ? BOOKING_TOOLS : []

    const client = new Anthropic({ apiKey })

    // Agentic loop — Claude may call tools multiple times before giving a final answer
    let currentMessages: Anthropic.MessageParam[] = sanitised
    let finalText = ""

    for (let i = 0; i < 8; i++) {
      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: buildSystemPrompt(today, canBook),
        ...(tools.length > 0 ? { tools } : {}),
        messages: currentMessages,
      })

      if (response.stop_reason === "end_turn") {
        finalText = (response.content.find((c) => c.type === "text") as Anthropic.TextBlock | undefined)?.text ?? ""
        break
      }

      if (response.stop_reason === "tool_use") {
        currentMessages = [...currentMessages, { role: "assistant", content: response.content }]

        const toolResults: Anthropic.ToolResultBlockParam[] = []
        for (const block of response.content) {
          if (block.type !== "tool_use") continue
          const result = await executeTool(
            block.name,
            block.input as Record<string, any>,
            tenantId,
            authToken,
            customerId,
          )
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result })
        }

        currentMessages = [...currentMessages, { role: "user", content: toolResults }]
        continue
      }

      // Any other stop reason — extract text and stop
      finalText = (response.content.find((c) => c.type === "text") as Anthropic.TextBlock | undefined)?.text ?? ""
      break
    }

    return NextResponse.json({ message: finalText })
  } catch (e: any) {
    console.error("Club assistant error:", e?.message)
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
