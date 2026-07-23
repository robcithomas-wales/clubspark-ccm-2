import { PortalLayout } from "@/components/portal-layout"
import { getVenues, getResources, getBookableUnits } from "@/lib/api"
import { SessionForm } from "../session-form"

export default async function NewSessionPage() {
  const [venuesResult, resourcesResult, unitsResult] = await Promise.allSettled([
    getVenues(), getResources(), getBookableUnits(),
  ])
  const venues = venuesResult.status === "fulfilled" ? (venuesResult.value?.data ?? venuesResult.value ?? []) : []
  const resources = resourcesResult.status === "fulfilled" ? (Array.isArray(resourcesResult.value) ? resourcesResult.value : resourcesResult.value?.data ?? []) : []
  const units = unitsResult.status === "fulfilled" ? (Array.isArray(unitsResult.value) ? unitsResult.value : unitsResult.value?.data ?? []) : []

  return (
    <PortalLayout title="New Session" description="Create an open booking session for members to join.">
      <div className="max-w-2xl">
        <SessionForm venues={venues} resources={resources} units={units} />
      </div>
    </PortalLayout>
  )
}
