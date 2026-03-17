import { redirect } from "next/navigation"
import { PortalLayout } from "@/components/portal-layout"
import { createAvailabilityConfig, type AvailabilityConfigScopeType } from "@/lib/api"

async function createConfigAction(formData: FormData) {
  "use server"

  const scopeType = String(formData.get("scopeType") || "").trim() as AvailabilityConfigScopeType
  const scopeId = String(formData.get("scopeId") || "").trim()
  const dayOfWeekRaw = String(formData.get("dayOfWeek") || "").trim()
  const dayOfWeek = dayOfWeekRaw !== "" ? Number(dayOfWeekRaw) : undefined
  const opensAt = String(formData.get("opensAt") || "").trim() || undefined
  const closesAt = String(formData.get("closesAt") || "").trim() || undefined
  const slotDurationRaw = String(formData.get("slotDurationMinutes") || "").trim()
  const slotDurationMinutes = slotDurationRaw ? Number(slotDurationRaw) : undefined
  const intervalRaw = String(formData.get("bookingIntervalMinutes") || "").trim()
  const bookingIntervalMinutes = intervalRaw ? Number(intervalRaw) : undefined
  const newDayReleaseTime = String(formData.get("newDayReleaseTime") || "").trim() || undefined

  if (!scopeType) throw new Error("Scope type is required")
  if (!scopeId) throw new Error("Scope ID is required")

  await createAvailabilityConfig({
    scopeType,
    scopeId,
    dayOfWeek,
    opensAt,
    closesAt,
    slotDurationMinutes,
    bookingIntervalMinutes,
    newDayReleaseTime,
  })

  // Redirect back to the relevant entity
  if (scopeType === "venue") redirect(`/venues/${scopeId}`)
  if (scopeType === "resource_group") redirect(`/resource-groups/${scopeId}`)
  redirect(`/resources/${scopeId}`)
}

export default async function NewAvailabilityConfigPage({
  searchParams,
}: {
  searchParams?: Promise<{
    scopeType?: string
    scopeId?: string
  }>
}) {
  const params = searchParams ? await searchParams : {}
  const defaultScopeType = params?.scopeType || "venue"
  const defaultScopeId = params?.scopeId || ""

  const scopeLabels: Record<string, string> = {
    venue: "Venue",
    resource_group: "Resource Group",
    resource: "Resource",
  }

  return (
    <PortalLayout
      title="Add Availability Config"
      description="Define opening hours, slot durations, and booking intervals."
    >
      <div className="w-full">
        <form
          action={createConfigAction}
          className="space-y-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-md"
        >
          <input type="hidden" name="scopeType" value={defaultScopeType} />
          <input type="hidden" name="scopeId" value={defaultScopeId} />

          <section className="space-y-2">
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              Configuring for:{" "}
              <span className="font-semibold">{scopeLabels[defaultScopeType] ?? defaultScopeType}</span>
              {defaultScopeId && (
                <span className="ml-2 break-all font-mono text-xs text-slate-500">{defaultScopeId}</span>
              )}
            </div>
          </section>

          <section className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Schedule</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Leave Day of Week blank to create a catch-all that applies every day.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label htmlFor="dayOfWeek" className="mb-2 block text-sm font-medium text-slate-700">
                  Day of Week
                </label>
                <select
                  id="dayOfWeek"
                  name="dayOfWeek"
                  defaultValue=""
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]"
                >
                  <option value="">All days (catch-all)</option>
                  <option value="0">Sunday</option>
                  <option value="1">Monday</option>
                  <option value="2">Tuesday</option>
                  <option value="3">Wednesday</option>
                  <option value="4">Thursday</option>
                  <option value="5">Friday</option>
                  <option value="6">Saturday</option>
                </select>
              </div>

              <div>
                <label htmlFor="opensAt" className="mb-2 block text-sm font-medium text-slate-700">
                  Opens At
                </label>
                <input
                  id="opensAt"
                  name="opensAt"
                  type="time"
                  defaultValue="08:00"
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
                  defaultValue="22:00"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]"
                />
              </div>
            </div>
          </section>

          <section className="space-y-5 border-t border-slate-200 pt-8">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Slot Settings</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Control how bookable slots are generated within the opening hours.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label htmlFor="slotDurationMinutes" className="mb-2 block text-sm font-medium text-slate-700">
                  Slot Duration (minutes)
                </label>
                <select
                  id="slotDurationMinutes"
                  name="slotDurationMinutes"
                  defaultValue="60"
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
                  defaultValue="60"
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
                  placeholder="08:00"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]"
                />
                <p className="mt-1 text-xs text-slate-400">Time new slots become bookable each day</p>
              </div>
            </div>
          </section>

          <div className="flex gap-3 border-t border-slate-100 pt-6">
            <button
              type="submit"
              className="inline-flex items-center rounded-xl bg-[#1857E0] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#174ED0]"
            >
              Save Config
            </button>
            <a
              href={defaultScopeId ? (
                defaultScopeType === "venue" ? `/venues/${defaultScopeId}` :
                defaultScopeType === "resource_group" ? `/resource-groups/${defaultScopeId}` :
                `/resources/${defaultScopeId}`
              ) : "/facilities"}
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
