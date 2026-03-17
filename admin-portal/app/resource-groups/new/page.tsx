import { redirect } from "next/navigation"
import { PortalLayout } from "@/components/portal-layout"
import { getVenues, createResourceGroup } from "@/lib/api"

async function createGroupAction(formData: FormData) {
  "use server"

  const venueId = String(formData.get("venueId") || "").trim()
  const name = String(formData.get("name") || "").trim()
  const sport = String(formData.get("sport") || "").trim() || undefined
  const description = String(formData.get("description") || "").trim() || undefined
  const colour = String(formData.get("colour") || "").trim() || undefined
  const sortOrderRaw = String(formData.get("sortOrder") || "0").trim()
  const sortOrder = sortOrderRaw ? Number(sortOrderRaw) : 0

  if (!venueId) throw new Error("Venue is required")
  if (!name) throw new Error("Name is required")

  await createResourceGroup({ venueId, name, sport, description, colour, sortOrder })
  redirect("/resource-groups")
}

export default async function NewResourceGroupPage({
  searchParams,
}: {
  searchParams?: Promise<{ venueId?: string }>
}) {
  const params = searchParams ? await searchParams : {}
  const defaultVenueId = params?.venueId || ""

  const venues = await getVenues()

  return (
    <PortalLayout
      title="Create Resource Group"
      description="Group related resources together for shared availability and pricing rules."
    >
      <div className="w-full">
        <form
          action={createGroupAction}
          className="space-y-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-md"
        >
          <section className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Group Details</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Define the group and which venue it belongs to.
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
                  placeholder="Tennis Courts"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]"
                />
              </div>

              <div>
                <label htmlFor="venueId" className="mb-2 block text-sm font-medium text-slate-700">
                  Venue <span className="text-rose-500">*</span>
                </label>
                <select
                  id="venueId"
                  name="venueId"
                  required
                  defaultValue={defaultVenueId}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]"
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
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]"
                />
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
                  placeholder="Optional notes about this group"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]"
                />
              </div>
            </div>
          </section>

          <div className="flex gap-3 border-t border-slate-100 pt-6">
            <button
              type="submit"
              className="inline-flex items-center rounded-xl bg-[#1857E0] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#174ED0]"
            >
              Save Group
            </button>
            <a
              href="/resource-groups"
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </a>
          </div>
        </form>
      </div>
    </PortalLayout>
  )
}
