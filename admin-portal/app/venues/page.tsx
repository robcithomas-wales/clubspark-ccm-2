import { getVenues } from "@/lib/api"
import { PortalLayout } from "@/components/portal-layout"

export default async function VenuesPage() {
  const venues = await getVenues()

  return (
    <PortalLayout
      title="Venues"
      description="Venue records loaded from the Venue Service."
    >
      <div className="space-y-4">
        {venues.map((venue: any) => (
          <div
            key={venue.id}
            className="card p-5"
          >
            <div className="font-semibold text-[var(--text)]">{venue.name}</div>
            <div className="mt-2 text-sm text-[var(--text-muted)]">
              {venue.city}, {venue.country}
            </div>
            <div className="mt-2 text-xs text-[var(--text-muted)]">
              Timezone: {venue.timezone}
            </div>
          </div>
        ))}
      </div>
    </PortalLayout>
  )
}