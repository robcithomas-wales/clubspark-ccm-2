import { getVenues, getResources, getBookableUnits } from "@/lib/api"
import { PortalLayout } from "@/components/portal-layout"
import { FacilitiesExplorer } from "@/components/facilities-explorer"

function StatCard({
  label,
  value,
  helper,
}: {
  label: string
  value: string | number
  helper?: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
        {value}
      </div>
      {helper ? (
        <div className="mt-1 text-sm text-slate-500">{helper}</div>
      ) : null}
    </div>
  )
}

export default async function FacilitiesPage() {
  const [venues, resources, units] = await Promise.all([
    getVenues(),
    getResources(),
    getBookableUnits(),
  ])

  const activeResources = resources.filter((resource: any) => resource.isActive)
  const activeUnits = units.filter((unit: any) => unit.isActive)

  return (
    <PortalLayout
      title="Facilities"
      description="Browse and manage venues, resources and bookable units in one place."
    >
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Venues"
            value={venues.length}
            helper="Configured venue records"
          />
          <StatCard
            label="Resources"
            value={resources.length}
            helper={`${activeResources.length} active`}
          />
          <StatCard
            label="Bookable units"
            value={units.length}
            helper={`${activeUnits.length} active`}
          />
          <StatCard
            label="Average units per resource"
            value={
              resources.length > 0
                ? (units.length / resources.length).toFixed(1)
                : "0.0"
            }
            helper="Structural indicator"
          />
        </section>

        <FacilitiesExplorer
          venues={venues}
          resources={resources}
          units={units}
        />
      </div>
    </PortalLayout>
  )
}