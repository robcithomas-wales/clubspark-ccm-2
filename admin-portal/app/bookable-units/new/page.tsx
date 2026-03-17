import { redirect } from "next/navigation"
import { PortalLayout } from "@/components/portal-layout"
import { getVenues, getResources, createBookableUnit } from "@/lib/api"

async function createUnitAction(formData: FormData) {
  "use server"

  const venueId = String(formData.get("venueId") || "").trim()
  const resourceId = String(formData.get("resourceId") || "").trim()
  const name = String(formData.get("name") || "").trim()
  const unitType = String(formData.get("unitType") || "").trim()
  const sortOrder = Number(formData.get("sortOrder") || 0)
  const capacityRaw = String(formData.get("capacity") || "").trim()
  const capacity = capacityRaw.length > 0 ? Number(capacityRaw) : undefined
  const isActive = formData.get("isActive") !== "false"
  const isOptionalExtra = formData.get("isOptionalExtra") === "true"
  const parentUnitId = String(formData.get("parentUnitId") || "").trim() || undefined

  if (!venueId) throw new Error("Venue is required")
  if (!resourceId) throw new Error("Resource is required")
  if (!name) throw new Error("Name is required")
  if (!unitType) throw new Error("Unit type is required")

  await createBookableUnit({
    venueId,
    resourceId,
    name,
    unitType,
    sortOrder,
    capacity,
    isActive,
    isOptionalExtra,
    parentUnitId,
  })

  redirect("/bookable-units")
}

export default async function NewBookableUnitPage({
  searchParams,
}: {
  searchParams?: Promise<{ resourceId?: string; venueId?: string }>
}) {
  const params = searchParams ? await searchParams : {}
  const defaultResourceId = params?.resourceId || ""
  const defaultVenueId = params?.venueId || ""

  const [venuesRaw, resourcesRaw] = await Promise.all([getVenues(), getResources()])
  const venues = Array.isArray(venuesRaw) ? venuesRaw : (venuesRaw as any).data ?? []
  const resources = Array.isArray(resourcesRaw) ? resourcesRaw : (resourcesRaw as any).data ?? []

  return (
    <PortalLayout
      title="Create Bookable Unit"
      description="Add a court half, pitch quarter, changing room, ball machine, or any other unit that can be booked."
    >
      <div className="w-full">
        <form
          action={createUnitAction}
          className="space-y-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-md"
        >
          <section className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Unit Details</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Define what this unit is and which resource it belongs to.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="name" className="mb-2 block text-sm font-medium text-slate-700">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="Court 1 Half A"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none"
                />
              </div>

              <div>
                <label htmlFor="unitType" className="mb-2 block text-sm font-medium text-slate-700">
                  Unit Type
                </label>
                <select
                  id="unitType"
                  name="unitType"
                  required
                  defaultValue="full"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none"
                >
                  <option value="full">Full</option>
                  <option value="half">Half</option>
                  <option value="quarter">Quarter</option>
                  <option value="third">Third</option>
                  <option value="lane">Lane</option>
                  <option value="bay">Bay</option>
                  <option value="room">Room</option>
                  <option value="machine">Machine</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="venueId" className="mb-2 block text-sm font-medium text-slate-700">
                  Venue
                </label>
                <select
                  id="venueId"
                  name="venueId"
                  required
                  defaultValue={defaultVenueId}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none"
                >
                  <option value="">Select a venue</option>
                  {venues.map((venue: any) => (
                    <option key={venue.id} value={venue.id}>
                      {venue.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="resourceId" className="mb-2 block text-sm font-medium text-slate-700">
                  Resource
                </label>
                <select
                  id="resourceId"
                  name="resourceId"
                  required
                  defaultValue={defaultResourceId}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none"
                >
                  <option value="">Select a resource</option>
                  {resources.map((resource: any) => (
                    <option key={resource.id} value={resource.id}>
                      {resource.name} ({resource.resourceType})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="sortOrder" className="mb-2 block text-sm font-medium text-slate-700">
                  Sort Order
                </label>
                <input
                  id="sortOrder"
                  name="sortOrder"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue="0"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none"
                />
              </div>

              <div>
                <label htmlFor="capacity" className="mb-2 block text-sm font-medium text-slate-700">
                  Capacity
                </label>
                <input
                  id="capacity"
                  name="capacity"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Optional"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none"
                />
              </div>
            </div>
          </section>

          <section className="space-y-5 border-t border-slate-200 pt-8">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Behaviour</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Control availability and how this unit appears in the booking flow.
              </p>
            </div>

            <div className="grid gap-3">
              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                <input
                  type="hidden"
                  name="isActive"
                  value="false"
                />
                <input
                  type="checkbox"
                  name="isActive"
                  value="true"
                  defaultChecked
                  className="mt-0.5 h-4 w-4 rounded border-slate-300"
                />
                <div>
                  <div className="font-medium text-slate-900">Active</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Inactive units are hidden from the booking flow and availability board.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                <input
                  type="hidden"
                  name="isOptionalExtra"
                  value="false"
                />
                <input
                  type="checkbox"
                  name="isOptionalExtra"
                  value="true"
                  className="mt-0.5 h-4 w-4 rounded border-slate-300"
                />
                <div>
                  <div className="font-medium text-slate-900">Optional extra</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Mark this unit as an optional extra (e.g. ball machine, changing room) that can
                    be added alongside a primary court or pitch booking.
                  </div>
                </div>
              </label>
            </div>
          </section>

          <div className="border-t border-slate-100 pt-6">
            <button
              type="submit"
              className="inline-flex items-center rounded-xl bg-[#1857E0] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#174ED0]"
            >
              Save Unit
            </button>
          </div>
        </form>
      </div>
    </PortalLayout>
  )
}
