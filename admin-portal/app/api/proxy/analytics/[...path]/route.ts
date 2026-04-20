import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

const ANALYTICS_SERVICE =
  process.env.NEXT_PUBLIC_ANALYTICS_SERVICE_URL || 'http://127.0.0.1:4014'

async function getAuthHeaders() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  return {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  }
}

async function proxy(request: NextRequest, path: string[]) {
  const upstream = `${ANALYTICS_SERVICE}/${path.join('/')}${request.nextUrl.search}`

  let body: string | undefined
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    body = await request.text()
  }

  const res = await fetch(upstream, {
    method: request.method,
    headers: await getAuthHeaders(),
    body,
  })

  const data = await res.text()
  return new Response(data, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('Content-Type') ?? 'application/json' },
  })
}

type Params = Promise<{ path: string[] }>

export async function GET(request: NextRequest, { params }: { params: Params }) {
  return proxy(request, (await params).path)
}

export async function POST(request: NextRequest, { params }: { params: Params }) {
  return proxy(request, (await params).path)
}

export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  return proxy(request, (await params).path)
}

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  return proxy(request, (await params).path)
}
