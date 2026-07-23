import { createClient } from '@/lib/supabase/server'

const ENTITLEMENT_SERVICE = process.env.ENTITLEMENT_SERVICE_URL || 'http://127.0.0.1:4013'

async function getAuthHeaders() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  return {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params
  const body = await request.json()
  const res = await fetch(`${ENTITLEMENT_SERVICE}/v1/subscriptions/org/${orgId}`, {
    method: 'PATCH',
    headers: await getAuthHeaders(),
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return new Response(JSON.stringify(data), {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
