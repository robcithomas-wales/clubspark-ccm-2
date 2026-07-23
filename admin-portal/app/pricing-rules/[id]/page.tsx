import { notFound } from "next/navigation"
import { PortalLayout } from "@/components/portal-layout"
import { getVenues, getResources } from "@/lib/api"
import { PricingRuleForm } from "../pricing-rule-form"

async function getPricingRule(id: string) {
  const res = await fetch(`http://127.0.0.1:4005/v1/pricing-rules/${id}`, {
    headers: { "x-tenant-id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" },
    cache: "no-store",
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error("Failed to fetch pricing rule")
  const json = await res.json()
  return json.data ?? json
}

export default async function EditPricingRulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [rule, venuesResult, resourcesResult] = await Promise.all([
    getPricingRule(id),
    getVenues().catch(() => null),
    getResources().catch(() => []),
  ])

  if (!rule) notFound()

  const venues = venuesResult?.data ?? venuesResult ?? []
  const resources = Array.isArray(resourcesResult) ? resourcesResult : resourcesResult?.data ?? []

  return (
    <PortalLayout title="Edit Pricing Rule" description={rule.name}>
      <PricingRuleForm venues={venues} resources={resources} existing={rule} />
    </PortalLayout>
  )
}
