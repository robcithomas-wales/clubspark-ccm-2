import { redirect } from "next/navigation"
import { PortalLayout } from "@/components/portal-layout"
import { getVenues, createResource } from "@/lib/api"
import { VenueGroupSelectors } from "@/components/venue-group-selectors"

async function createResourceAction(formData: FormData) {
  "use server"

  const venueId = String(formData.get("venueId") || "").trim()
  const name = String(formData.get("name") || "").trim()
  const resourceType = String(formData.get("resourceType") || "").trim()
  const groupId = String(formData.get("groupId") || "").trim() || undefined
  const sport = String(formData.get("sport") || "").trim() || undefined
  const surface = String(formData.get("surface") || "").trim() || undefined
  const isIndoor = formData.get("isIndoor") === "true"
  const hasLighting = formData.get("hasLighting") === "true"
  const description = String(formData.get("description") || "").trim() || undefined
  const colour = String(formData.get("colour") || "").trim() || undefined
  const bookingPurposesRaw = String(formData.get("bookingPurposes") || "").trim()
  const bookingPurposes = bookingPurposesRaw
    ? bookingPurposesRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : []

  if (!venueId) throw new Error("Venue is required")
  if (!name) throw new Error("Name is required")
  if (!resourceType) throw new Error("Resource type is required")

  await createResource({
    venueId,
    name,
    resourceType,
    groupId,
    sport,
    surface,
    isIndoor,
    hasLighting,
    description,
    colour,
    bookingPurposes,
  })

  redirect("/resources")
}

export default async function NewResourcePage({
  searchParams,
}: {
  searchParams?: Promise<{ venueId?: string }>
}) {
  const params = searchParams ? await searchParams : {}
  const defaultVenueId = params?.venueId || ""

  const venues = await getVenues()

  return (
    <PortalLayout
      title="Add Resource"
      description="Add a court, pitch, pool, or other physical facility."
    >
      <div className="w-full">
        <form
          action={createResourceAction}
          className="space-y-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-md"
        >
          <section className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Resource Details</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Basic information about this physical facility.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="name" className="mb-2 block text-sm font-medium text-slate-700">
                  Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="Court 1"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]"
                />
              </div>

              <div>
                <label htmlFor="resourceType" className="mb-2 block text-sm font-medium text-slate-700">
                  Type <span className="text-rose-500">*</span>
                </label>
                <select
                  id="resourceType"
                  name="resourceType"
                  required
                  defaultValue="court"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]"
                >
                  <option value="court">Court</option>
                  <option value="pitch">Pitch</option>
                  <option value="pool">Pool</option>
                  <option value="lane">Lane</option>
                  <option value="table">Table</option>
                  <option value="rink">Rink</option>
                  <option value="studio">Studio</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <VenueGroupSelectors
                venues={venues.map((v: any) => ({ id: v.id, name: v.name }))}
                defaultVenueId={defaultVenueId}
              />

              <div>
                <label htmlFor="sport" className="mb-2 block text-sm font-medium text-slate-700">
                  Sport
                </label>
                <select
                  id="sport"
                  name="sport"
                  defaultValue=""
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]"
                >
                  <option value="">Not specified</option>
                  <option value="tennis">Tennis</option>
                  <option value="padel">Padel</option>
                  <option value="football">Football</option>
                  <option value="cricket">Cricket</option>
                  <option value="squash">Squash</option>
                  <option value="badminton">Badminton</option>
                  <option value="basketball">Basketball</option>
                  <option value="swimming">Swimming</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="surface" className="mb-2 block text-sm font-medium text-slate-700">
                  Surface
                </label>
                <select
                  id="surface"
                  name="surface"
                  defaultValue=""
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]"
                >
                  <option value="">Not specified</option>
                  <option value="hard">Hard</option>
                  <option value="grass">Grass</option>
                  <option value="clay">Clay</option>
                  <option value="artificial_grass">Artificial grass</option>
                  <option value="carpet">Carpet</option>
                  <option value="wood">Wood</option>
                  <option value="concrete">Concrete</option>
                  <option value="sand">Sand</option>
                  <option value="water">Water</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="colour" className="mb-2 block text-sm font-medium text-slate-700">
                  Colour
                </label>
                <div className="flex gap-2">
                  <input
                    id="colour"
                    name="colour"
                    type="color"
                    defaultValue="#1857E0"
                    className="h-10 w-14 cursor-pointer rounded-lg border border-slate-200 p-1"
                  />
                  <span className="flex items-center text-xs text-slate-400">Used on the availability board</span>
                </div>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="description" className="mb-2 block text-sm font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={2}
                  placeholder="Optional notes about this resource"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t border-slate-200 pt-8">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Attributes</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Physical characteristics used for filtering and pricing rules.
              </p>
            </div>

            <div className="grid gap-3">
              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                <input type="hidden" name="isIndoor" value="false" />
                <input
                  type="checkbox"
                  name="isIndoor"
                  value="true"
                  className="mt-0.5 h-4 w-4 rounded border-slate-300"
                />
                <div>
                  <div className="font-medium text-slate-900">Indoor</div>
                  <div className="mt-0.5 text-xs text-slate-500">This resource is indoors or covered.</div>
                </div>
              </label>

              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                <input type="hidden" name="hasLighting" value="false" />
                <input
                  type="checkbox"
                  name="hasLighting"
                  value="true"
                  className="mt-0.5 h-4 w-4 rounded border-slate-300"
                />
                <div>
                  <div className="font-medium text-slate-900">Has lighting</div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    Floodlights available. Can be used as a pricing attribute for evening sessions.
                  </div>
                </div>
              </label>
            </div>

            <div>
              <label htmlFor="bookingPurposes" className="mb-2 block text-sm font-medium text-slate-700">
                Booking Purposes
              </label>
              <input
                id="bookingPurposes"
                name="bookingPurposes"
                type="text"
                placeholder="match, training, social (comma separated)"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]"
              />
              <p className="mt-1.5 text-xs text-slate-400">Comma-separated list, e.g. match, training, social</p>
            </div>
          </section>

          <div className="flex gap-3 border-t border-slate-100 pt-6">
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 inline-flex items-center"
            >
              Save Resource
            </button>
            <a
              href="/resources"
              className="inline-flex items-center rounded-xl border border-[#1857E0] bg-white px-5 py-2.5 text-sm font-medium text-[#1857E0] transition hover:bg-blue-50"
            >
              Cancel
            </a>
          </div>
        </form>
      </div>
    </PortalLayout>
  )
}
