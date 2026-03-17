import Link from "next/link"
import { notFound } from "next/navigation"
import { PortalLayout } from "@/components/portal-layout"
import { getResourceGroupById, getAvailabilityConfigs } from "@/lib/api"

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export default async function ResourceGroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let group: any
  try {
    group = await getResourceGroupById(id)
  } catch {
    notFound()
  }

  const configs = await getAvailabilityConfigs({ scopeType: "resource_group", scopeId: id })

  return (
    <PortalLayout
      title={group.name}
      description={group.sport ? `${group.sport} group` : "Resource group"}
    >
      <div className="space-y-6">
        {/* Group details */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Details</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="text-xs font-medium text-slate-400">Sport</div>
              <div className="mt-1 text-sm capitalize text-slate-900">{group.sport || <span className="text-slate-400">—</span>}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-400">Sort Order</div>
              <div className="mt-1 text-sm text-slate-900">{group.sortOrder ?? 0}</div>
            </div>
            {group.colour && (
              <div>
                <div className="text-xs font-medium text-slate-400">Colour</div>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className="inline-block h-5 w-5 rounded-full border border-slate-200"
                    style={{ backgroundColor: group.colour }}
                  />
                  <span className="text-sm text-slate-600">{group.colour}</span>
                </div>
              </div>
            )}
            {group.description && (
              <div className="md:col-span-3">
                <div className="text-xs font-medium text-slate-400">Description</div>
                <div className="mt-1 text-sm text-slate-700">{group.description}</div>
              </div>
            )}
          </div>
        </div>

        {/* Resources in this group */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
              Resources ({group.resources?.length ?? 0})
            </h2>
            <Link
              href={`/resources/new?groupId=${group.id}&venueId=${group.venueId}`}
              className="inline-flex h-8 items-center rounded-lg bg-[#1857E0] px-3 text-xs font-medium text-white transition hover:bg-[#1832A8]"
            >
              Add resource
            </Link>
          </div>

          {!group.resources?.length ? (
            <p className="text-sm text-slate-400">No resources assigned to this group yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {group.resources.map((resource: any) => (
                <div key={resource.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-medium text-slate-900">{resource.name}</div>
                    <div className="mt-0.5 text-xs capitalize text-slate-500">
                      {resource.resourceType}{resource.sport ? ` · ${resource.sport}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={[
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                      resource.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500",
                    ].join(" ")}>
                      {resource.isActive ? "Active" : "Inactive"}
                    </span>
                    <Link href={`/resources/${resource.id}`} className="text-xs font-medium text-[#1857E0] hover:underline">
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Availability configs */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
              Availability Overrides
            </h2>
            <Link
              href={`/availability-configs/new?scopeType=resource_group&scopeId=${group.id}`}
              className="inline-flex h-8 items-center rounded-lg bg-[#1857E0] px-3 text-xs font-medium text-white transition hover:bg-[#1832A8]"
            >
              Add override
            </Link>
          </div>

          {configs.length === 0 ? (
            <p className="text-sm text-slate-400">
              No group-level overrides. Availability falls through to the venue catch-all.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {configs.map((config: any) => (
                <div key={config.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      {config.dayOfWeek !== null && config.dayOfWeek !== undefined
                        ? DAY_NAMES[config.dayOfWeek]
                        : "All days (catch-all)"}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {config.opensAt ?? "—"} – {config.closesAt ?? "—"}
                      {config.slotDurationMinutes ? ` · ${config.slotDurationMinutes}min slots` : ""}
                    </div>
                  </div>
                  <Link
                    href={`/availability-configs/${config.id}`}
                    className="text-xs font-medium text-[#1857E0] hover:underline"
                  >
                    Edit
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Link
            href="/resource-groups"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[#1857E0] bg-white px-5 text-sm font-medium text-[#1857E0] transition hover:bg-blue-50"
          >
            Back to groups
          </Link>
        </div>
      </div>
    </PortalLayout>
  )
}
