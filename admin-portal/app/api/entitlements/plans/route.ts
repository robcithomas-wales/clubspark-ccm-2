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

export async function GET() {
  const res = await fetch(`${ENTITLEMENT_SERVICE}/v1/plans`, {
    headers: await getAuthHeaders(),
    cache: 'no-store',
  })
  const data = await res.json()
  return new Response(JSON.stringify(data), {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
