import { redirect, notFound } from "next/navigation"
import { PortalLayout } from "@/components/portal-layout"
import {
  getAvailabilityConfigById,
  updateAvailabilityConfig,
  deleteAvailabilityConfig,
} from "@/lib/api"

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

async function updateConfigAction(id: string, formData: FormData) {
  "use server"

  const opensAt = String(formData.get("opensAt") || "").trim() || undefined
  const closesAt = String(formData.get("closesAt") || "").trim() || undefined
  const slotDurationRaw = String(formData.get("slotDurationMinutes") || "").trim()
  const slotDurationMinutes = slotDurationRaw ? Number(slotDurationRaw) : undefined
  const intervalRaw = String(formData.get("bookingIntervalMinutes") || "").trim()
  const bookingIntervalMinutes = intervalRaw ? Number(intervalRaw) : undefined
  const newDayReleaseTime = String(formData.get("newDayReleaseTime") || "").trim() || undefined

  await updateAvailabilityConfig(id, {
    opensAt,
    closesAt,
    slotDurationMinutes,
    bookingIntervalMinutes,
    newDayReleaseTime,
  })

  redirect(`/availability-configs/${id}?saved=1`)
}

async function deleteConfigAction(id: string, scopeType: string, scopeId: string) {
  "use server"
  await deleteAvailabilityConfig(id)
  if (scopeType === "venue") redirect(`/venues/${scopeId}`)
  if (scopeType === "resource_group") redirect(`/resource-groups/${scopeId}`)
  redirect(`/resources/${scopeId}`)
}

const scopeLabels: Record<string, string> = {
  venue: "Venue",
  resource_group: "Resource Group",
  resource: "Resource",
}

export default async function AvailabilityConfigDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ saved?: string }>
}) {
  const { id } = await params
  const sp = searchParams ? await searchParams : {}

  let config: any
  try {
    config = await getAvailabilityConfigById(id)
  } catch {
    notFound()
  }

  const updateAction = updateConfigAction.bind(null, id)
  const deleteAction = deleteConfigAction.bind(null, id, config.scopeType, config.scopeId)

  const backHref =
    config.scopeType === "venue" ? `/venues/${config.scopeId}` :
    config.scopeType === "resource_group" ? `/resource-groups/${config.scopeId}` :
    `/resources/${config.scopeId}`

  return (
    <PortalLayout
      title="Availability Config"
      description={`${scopeLabels[config.scopeType] ?? config.scopeType} · ${config.dayOfWeek !== null && config.dayOfWeek !== undefined ? DAY_NAMES[config.dayOfWeek] : "All days"}`}
    >
      <div className="w-full space-y-6">
        {sp.saved && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            Changes saved.
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          <span className="font-medium text-slate-900">{scopeLabels[config.scopeType] ?? config.scopeType}</span>
          {" · "}
          {config.dayOfWeek !== null && config.dayOfWeek !== undefined ? DAY_NAMES[config.dayOfWeek] : "All days (catch-all)"}
          <span className="ml-3 break-all font-mono text-xs text-slate-400">{config.scopeId}</span>
        </div>

        <form
          action={updateAction}
          className="space-y-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-md"
        >
          <section className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Opening Hours</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="opensAt" className="mb-2 block text-sm font-medium text-slate-700">
                  Opens At
                </label>
                <input
                  id="opensAt"
                  name="opensAt"
                  type="time"
                  defaultValue={config.opensAt ?? ""}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]"
                />
              </div>

              <div>
                <label htmlFor="closesAt" className="mb-2 block text-sm font-medium text-slate-700">
                  Closes At
                </label>
                <input
                  id="closesAt"
                  name="closesAt"
                  type="time"
                  defaultValue={config.closesAt ?? ""}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]"
                />
              </div>
            </div>
          </section>

          <section className="space-y-5 border-t border-slate-200 pt-8">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Slot Settings</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label htmlFor="slotDurationMinutes" className="mb-2 block text-sm font-medium text-slate-700">
                  Slot Duration (minutes)
                </label>
                <select
                  id="slotDurationMinutes"
                  name="slotDurationMinutes"
                  defaultValue={config.slotDurationMinutes ?? ""}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]"
                >
                  <option value="">Inherit</option>
                  <option value="30">30</option>
                  <option value="45">45</option>
                  <option value="60">60</option>
                  <option value="90">90</option>
                  <option value="120">120</option>
                </select>
              </div>

              <div>
                <label htmlFor="bookingIntervalMinutes" className="mb-2 block text-sm font-medium text-slate-700">
                  Booking Interval (minutes)
                </label>
                <select
                  id="bookingIntervalMinutes"
                  name="bookingIntervalMinutes"
                  defaultValue={config.bookingIntervalMinutes ?? ""}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]"
                >
                  <option value="">Inherit</option>
                  <option value="15">15</option>
                  <option value="30">30</option>
                  <option value="60">60</option>
                </select>
              </div>

              <div>
                <label htmlFor="newDayReleaseTime" className="mb-2 block text-sm font-medium text-slate-700">
                  New Day Release Time
                </label>
                <input
                  id="newDayReleaseTime"
                  name="newDayReleaseTime"
                  type="time"
                  defaultValue={config.newDayReleaseTime ?? ""}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]"
                />
              </div>
            </div>
          </section>

          <div className="flex gap-3 border-t border-slate-100 pt-6">
            <button
              type="submit"
              className="inline-flex items-center rounded-xl bg-[#1857E0] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#174ED0]"
            >
              Save Changes
            </button>
            <a
              href={backHref}
              className="inline-flex items-center rounded-xl border border-[#1857E0] bg-white px-5 py-2.5 text-sm font-medium text-[#1857E0] transition hover:bg-blue-50"
            >
              Cancel
            </a>
          </div>
        </form>

        {/* Danger zone */}
        <div className="rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-rose-700">Delete Config</h2>
          <p className="mb-4 text-sm text-slate-500">
            This config will be removed. Other configs at this scope will still apply.
          </p>
          <form action={deleteAction}>
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
