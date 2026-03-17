import { redirect, notFound } from "next/navigation"
import { PortalLayout } from "@/components/portal-layout"
import { getBlackoutDateById, updateBlackoutDate, deleteBlackoutDate, getVenues, getResources } from "@/lib/api"

function toDateInputValue(value?: string | null) {
  if (!value) return ""
  return new Date(value).toISOString().split("T")[0]
}

async function updateAction(id: string, formData: FormData) {
  "use server"
  const name = String(formData.get("name") || "").trim()
  const startDate = String(formData.get("startDate") || "").trim()
  const endDate = String(formData.get("endDate") || "").trim()
  const recurrenceRule = String(formData.get("recurrenceRule") || "").trim() || undefined

  await updateBlackoutDate(id, { name, startDate, endDate, recurrenceRule })
  redirect(`/blackout-dates/${id}?saved=1`)
}

async function deleteAction(id: string) {
  "use server"
  await deleteBlackoutDate(id)
  redirect("/blackout-dates")
}

export default async function BlackoutDateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ saved?: string }>
}) {
  const { id } = await params
  const sp = searchParams ? await searchParams : {}

  let record: any
  try {
    record = await getBlackoutDateById(id)
  } catch {
    notFound()
  }

  const [venues, resources] = await Promise.all([
    getVenues().catch(() => []),
    getResources().catch(() => []),
  ])

  const venueMap = new Map((venues as any[]).map((v: any) => [v.id, v.name]))
  const resourceMap = new Map((resources as any[]).map((r: any) => [r.id, r.name]))

  const update = updateAction.bind(null, id)
  const del = deleteAction.bind(null, id)

  return (
    <PortalLayout
      title={record.name}
      description={record.recurrenceRule ? "Recurring blackout" : "Blackout date"}
    >
      <div className="space-y-6">
        {sp.saved && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            Changes saved.
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          <span className="font-medium text-slate-900">
            {venueMap.get(record.venueId) ?? record.venueId}
          </span>
          {record.resourceId && (
            <> · <span>{resourceMap.get(record.resourceId) ?? record.resourceId}</span></>
          )}
          {!record.resourceId && <> · Whole venue</>}
        </div>

        <form
          action={update}
          className="space-y-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-md"
        >
          <section className="space-y-5">
            <h2 className="text-lg font-semibold text-slate-950">Blackout details</h2>

            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-medium text-slate-700">Name</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                defaultValue={record.name}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]"
              />
            </div>
          </section>

          <section className="space-y-5 border-t border-slate-200 pt-8">
            <h2 className="text-lg font-semibold text-slate-950">Dates</h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="startDate" className="mb-2 block text-sm font-medium text-slate-700">Start date</label>
                <input
                  id="startDate"
                  name="startDate"
                  type="date"
                  required
                  defaultValue={toDateInputValue(record.startDate)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]"
                />
              </div>
              <div>
                <label htmlFor="endDate" className="mb-2 block text-sm font-medium text-slate-700">End date</label>
                <input
                  id="endDate"
                  name="endDate"
                  type="date"
                  required
                  defaultValue={toDateInputValue(record.endDate)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]"
                />
              </div>
            </div>
          </section>

          <section className="space-y-5 border-t border-slate-200 pt-8">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Recurrence</h2>
              <p className="mt-1 text-sm text-slate-500">
                iCal RRULE for recurring closures, e.g.{" "}
                <code className="rounded bg-slate-100 px-1 text-xs">FREQ=YEARLY;BYMONTH=12;BYMONTHDAY=25</code>
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
                defaultValue={record.recurrenceRule ?? ""}
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
              Save changes
            </button>
            <a
              href="/blackout-dates"
              className="inline-flex items-center rounded-xl border border-[#1857E0] bg-white px-5 py-2.5 text-sm font-medium text-[#1857E0] transition hover:bg-blue-50"
            >
              Cancel
            </a>
          </div>
        </form>

        <div className="rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-rose-700">Delete blackout date</h2>
          <p className="mb-4 text-sm text-slate-500">
            This closure will be removed. It will no longer block bookings on these dates.
          </p>
          <form action={del}>
            <button
              type="submit"
              className="inline-flex items-center rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
            >
              Delete
            </button>
          </form>
        </div>
      </div>
    </PortalLayout>
  )
}
