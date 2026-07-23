import { PortalLayout } from "@/components/portal-layout"
import { getVenues, getResources } from "@/lib/api"
import { PricingRuleForm } from "../pricing-rule-form"

export default async function NewPricingRulePage() {
  const [venuesResult, resourcesResult] = await Promise.allSettled([getVenues(), getResources()])
  const venues = venuesResult.status === "fulfilled" ? (venuesResult.value?.data ?? venuesResult.value ?? []) : []
  const resources = resourcesResult.status === "fulfilled" ? (Array.isArray(resourcesResult.value) ? resourcesResult.value : resourcesResult.value?.data ?? []) : []

  return (
    <PortalLayout title="New Pricing Rule" description="Define a rate for a specific time window, day of week, and venue scope.">
      <PricingRuleForm venues={venues} resources={resources} />
    </PortalLayout>
  )
}
