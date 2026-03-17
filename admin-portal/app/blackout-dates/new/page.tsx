import { redirect } from "next/navigation"
import { PortalLayout } from "@/components/portal-layout"
import { getVenues, getResources, createBlackoutDate } from "@/lib/api"

async function createAction(formData: FormData) {
  "use server"

  const venueId = String(formData.get("venueId") || "").trim()
  const resourceId = String(formData.get("resourceId") || "").trim() || undefined
  const name = String(formData.get("name") || "").trim()
  const startDate = String(formData.get("startDate") || "").trim()
  const endDate = String(formData.get("endDate") || "").trim()
  const recurrenceRule = String(formData.get("recurrenceRule") || "").trim() || undefined

  await createBlackoutDate({ venueId, resourceId, name, startDate, endDate, recurrenceRule })
  redirect("/blackout-dates")
}

export default async function NewBlackoutDatePage({
  searchParams,
}: {
  searchParams?: Promise<{ venueId?: string; resourceId?: string }>
}) {
  const sp = searchParams ? await searchParams : {}
  const [venues, resources] = await Promise.all([
    getVenues().catch(() => []),
    getResources().catch(() => []),
  ])

  return (
    <PortalLayout title="Add Blackout Date" description="Block out a date or date range for a venue or resource.">
      <form
        action={createAction}
        className="space-y-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-md"
      >
        <section className="space-y-5">
          <h2 className="text-lg font-semibold text-slate-950">Blackout details</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label htmlFor="name" className="mb-2 block text-sm font-medium text-slate-700">
                Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="e.g. Christmas Day, Bank Holiday, Maintenance"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]"
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
                defaultValue={sp.venueId ?? ""}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]"
              >
                <option value="">Select a venue</option>
                {(venues as any[]).map((v: any) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="resourceId" className="mb-2 block text-sm font-medium text-slate-700">
                Resource <span className="text-slate-400">(optional — leave blank for whole venue)</span>
              </label>
              <select
                id="resourceId"
                name="resourceId"
                defaultValue={sp.resourceId ?? ""}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]"
              >
                <option value="">Whole venue</option>
                {(resources as any[]).map((r: any) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="space-y-5 border-t border-slate-200 pt-8">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Dates</h2>
            <p className="mt-1 text-sm text-slate-500">
              For a single day set start and end to the same date. For recurring closures, add an iCal RRULE.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="startDate" className="mb-2 block text-sm font-medium text-slate-700">
                Start date <span className="text-rose-500">*</span>
              </label>
              <input
                id="startDate"
                name="startDate"
                type="date"
                required
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]"
              />
            </div>

            <div>
              <label htmlFor="endDate" className="mb-2 block text-sm font-medium text-slate-700">
                End date <span className="text-rose-500">*</span>
              </label>
              <input
                id="endDate"
                name="endDate"
                type="date"
                required
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]"
              />
            </div>
          </div>
        </section>

        <section className="space-y-5 border-t border-slate-200 pt-8">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Recurrence</h2>
            <p className="mt-1 text-sm text-slate-500">
              Leave blank for a one-off. For annual recurring closures use an iCal RRULE,
              e.g. <code className="rounded bg-slate-100 px-1 text-xs">FREQ=YEARLY;BYMONTH=12;BYMONTHDAY=25</code> for Christmas Day.
            </p>
          </div>

          <div>
            <label htmlFor="recurrenceRule" className="mb-2 block text-sm font-medium text-slate-700">
              RRULE <span className="text-slate-400">(optional)</span>
            </label>
            <input
              id="recurrenceRule"
              name="recurrenceRule"
              type="text"
              placeholder="e.g. FREQ=YEARLY;BYMONTH=12;BYMONTHDAY=25"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm text-slate-900 outline-none focus:border-[#1857E0]"
            />
          </div>
        </section>

        <div className="flex gap-3 border-t border-slate-100 pt-6">
          <button
            type="submit"
            className="inline-flex items-center rounded-xl bg-[#1857E0] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#174ED0]"
          >
            Save
          </button>
          <a
            href="/blackout-dates"
            className="inline-flex items-center rounded-xl border border-[#1857E0] bg-white px-5 py-2.5 text-sm font-medium text-[#1857E0] transition hover:bg-blue-50"
          >
            Cancel
          </a>
        </div>
      </form>
    </PortalLayout>
  )
}
