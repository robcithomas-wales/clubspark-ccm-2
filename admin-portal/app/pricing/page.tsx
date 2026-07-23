import { PortalLayout } from "@/components/portal-layout"
import { PricingManager } from "@/components/pricing-manager"
import { createClient } from "@/lib/supabase/server"

const ENTITLEMENT_SERVICE = process.env.ENTITLEMENT_SERVICE_URL || "http://127.0.0.1:4013"

async function getAuthHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }
}

async function getData() {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return { plans: [], subscriptions: [] }

    const headers = await getAuthHeaders(session.access_token)

    const [plansRes, subsRes] = await Promise.all([
      fetch(`${ENTITLEMENT_SERVICE}/v1/plans`, { headers, cache: "no-store" }),
      fetch(`${ENTITLEMENT_SERVICE}/v1/subscriptions`, { headers, cache: "no-store" }),
    ])

    const plans = plansRes.ok ? (await plansRes.json()).data ?? [] : []
    const subscriptions = subsRes.ok ? (await subsRes.json()).data ?? [] : []

    return { plans, subscriptions }
  } catch {
    return { plans: [], subscriptions: [] }
  }
}

export default async function PricingPage() {
  const { plans, subscriptions } = await getData()

  return (
    <PortalLayout
      title="Plan & Billing"
      description="Manage plans, assign subscriptions to organisations, and configure pricing overrides."
    >
      <PricingManager initialPlans={plans} initialSubscriptions={subscriptions} />
    </PortalLayout>
  )
}
