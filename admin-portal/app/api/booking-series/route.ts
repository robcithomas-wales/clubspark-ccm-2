const BOOKING_HEADERS = {
  "x-tenant-id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "x-organisation-id": "11111111-1111-1111-1111-111111111111",
}

const BASE = "http://127.0.0.1:4005/booking-series"

export async function GET() {
  const res = await fetch(BASE, { headers: BOOKING_HEADERS, cache: "no-store" })
  const data = await res.json()
  return new Response(JSON.stringify(data), {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  })
}

export async function POST(request: Request) {
  const body = await request.json()
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...BOOKING_HEADERS },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return new Response(JSON.stringify(data), {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  })
}
