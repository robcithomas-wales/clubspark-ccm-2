import { PortalLayout } from "@/components/portal-layout"
import { SeasonForm } from "../season-form"
import { getVenues } from "@/lib/api"

export default async function NewSeasonPage() {
  const venues = await getVenues()

  return (
    <PortalLayout title="New Season" description="Create a named seasonal schedule for a venue">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm max-w-xl">
        <SeasonForm venues={venues.map((v: any) => ({ id: v.id, name: v.name }))} />
      </div>
    </PortalLayout>
  )
}
