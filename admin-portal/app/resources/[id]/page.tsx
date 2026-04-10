import Link from "next/link"
import { notFound } from "next/navigation"
import { PortalLayout } from "@/components/portal-layout"
import { getResourceById, getAvailabilityConfigs } from "@/lib/api"
import { ResourcePublicAttributesPanel } from "@/components/resource-public-attributes-panel"
import { DeleteResourceButton } from "@/components/delete-resource-button"

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let resource: any
  try {
    resource = await getResourceById(id)
  } catch {
    notFound()
  }

  const configs = await getAvailabilityConfigs({ scopeType: "resource", scopeId: id })

  return (
    <PortalLayout
      title={resource.name}
      description={`${resource.resourceType}${resource.sport ? ` · ${resource.sport}` : ""}`}
    >
      <div className="space-y-6">
        {/* Details card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Details</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="text-xs font-medium text-slate-400">Type</div>
              <div className="mt-1 text-sm font-medium capitalize text-slate-900">{resource.resourceType}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-400">Sport</div>
              <div className="mt-1 text-sm text-slate-900 capitalize">{resource.sport || <span className="text-slate-400">—</span>}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-400">Surface</div>
              <div className="mt-1 text-sm text-slate-900 capitalize">{resource.surface || <span className="text-slate-400">—</span>}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-400">Indoor</div>
              <div className="mt-1 text-sm text-slate-900">{resource.isIndoor ? "Yes" : "No"}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-400">Lighting</div>
              <div className="mt-1 text-sm text-slate-900">{resource.hasLighting ? "Yes" : "No"}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-400">Status</div>
              <div className="mt-1">
                <span className={[
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                  resource.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500",
                ].join(" ")}>
                  {resource.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
            {resource.groupId && (
              <div>
                <div className="text-xs font-medium text-slate-400">Group</div>
                <div className="mt-1">
                  <Link href={`/resource-groups/${resource.groupId}`} className="text-sm font-medium text-[#1857E0] hover:underline">
                    View group
                  </Link>
                </div>
              </div>
            )}
            {resource.colour && (
              <div>
                <div className="text-xs font-medium text-slate-400">Colour</div>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className="inline-block h-5 w-5 rounded-full border border-slate-200"
                    style={{ backgroundColor: resource.colour }}
                  />
                  <span className="text-sm text-slate-600">{resource.colour}</span>
                </div>
              </div>
            )}
            {resource.bookingPurposes?.length > 0 && (
              <div className="md:col-span-3">
                <div className="text-xs font-medium text-slate-400">Booking Purposes</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {resource.bookingPurposes.map((p: string) => (
                    <span key={p} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-600">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {resource.description && (
              <div className="md:col-span-3">
                <div className="text-xs font-medium text-slate-400">Description</div>
                <div className="mt-1 text-sm text-slate-700">{resource.description}</div>
              </div>
            )}
          </div>
        </div>

        {/* Public attributes */}
        <ResourcePublicAttributesPanel
          resourceId={resource.id}
          initial={resource.publicAttributes}
          initialVisibleAttributes={resource.visibleAttributes}
        />

        {/* Availability configs */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
              Availability Overrides
            </h2>
            <Link
              href={`/availability-configs/new?scopeType=resource&scopeId=${resource.id}`}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 inline-flex items-center"
            >
              Add override
            </Link>
          </div>

          {configs.length === 0 ? (
            <p className="text-sm text-slate-400">
              No resource-level overrides. Availability is inherited from the venue or resource group.
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

        <div className="flex items-center justify-between">
          <Link
            href="/resources"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[#1857E0] bg-white px-5 text-sm font-medium text-[#1857E0] transition hover:bg-blue-50"
          >
            Back to resources
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href={`/resources/${resource.id}/edit`}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[#1857E0] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1445c0]"
            >
              Edit resource
            </Link>
            <DeleteResourceButton id={resource.id} name={resource.name} />
          </div>
        </div>
      </div>
    </PortalLayout>
  )
}
