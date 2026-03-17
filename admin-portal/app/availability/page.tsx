import { getDayAvailability } from "@/lib/api"
import { PortalLayout } from "@/components/portal-layout"
import { AvailabilityBoard } from "@/components/availability-board"

function formatDateLabel(date: string) {
  const value = new Date(`${date}T00:00:00Z`)

  if (Number.isNaN(value.getTime())) return date

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(value)
}

function getTodayDateString() {
  return new Date().toISOString().split("T")[0]
}

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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md transition-shadow hover:shadow-lg">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
        {value}
      </div>
      {helper ? (
        <div className="mt-1 text-sm text-slate-500">{helper}</div>
      ) : null}
    </div>
  )
}

export default async function AvailabilityPage({
  searchParams,
}: {
  searchParams?: Promise<{ date?: string }>
}) {
  const params = searchParams ? await searchParams : {}
  const selectedDate = params?.date || getTodayDateString()

  const venueId = "11111111-1111-1111-1111-111111111111"

  const availability = await getDayAvailability({
    venueId,
    date: selectedDate,
  })

  const units = availability.units || []

  const totalSlots = units.reduce((count: number, unit: any) => {
    return count + (unit.slots?.length || 0)
  }, 0)

  const bookedSlots = units.reduce((count: number, unit: any) => {
    const unitBookedSlots =
      unit.slots?.filter((slot: any) => !slot.isAvailable).length || 0

    return count + unitBookedSlots
  }, 0)

  const availableSlots = totalSlots - bookedSlots

  const bookedUnitIds = new Set(
    units
      .filter((unit: any) =>
        (unit.slots || []).some((slot: any) => !slot.isAvailable)
      )
      .map((unit: any) => unit.id)
  )

  const visibleHourlySlots = units[0]?.slots?.length || 0

  return (
    <PortalLayout
      title="Availability"
      description="Visual facility availability across bookable units and time slots."
    >
      <div className="space-y-6">
        <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Viewing date
            </div>
            <div className="mt-2 text-xl font-semibold text-slate-900">
              {formatDateLabel(selectedDate)}
            </div>
          </div>

          <form method="GET" className="flex items-end gap-3">
            <div>
              <label
                htmlFor="date"
                className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"
              >
                Change date
              </label>
              <input
                id="date"
                name="date"
                type="date"
                defaultValue={selectedDate}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none"
              />
            </div>

            <button
              type="submit"
              className="h-11 rounded-xl bg-[#1857E0] px-4 text-sm font-medium text-white transition hover:bg-[#1832A8]"
            >
              Update
            </button>
          </form>
        </section>

        <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-3">
          <StatCard
            label="Bookable units"
            value={units.length}
            helper={`${bookedUnitIds.size} units with bookings`}
          />
          <StatCard
            label="Available slots"
            value={availableSlots}
            helper={`${visibleHourlySlots} hourly slots per unit`}
          />
          <StatCard
            label="Booked slots"
            value={bookedSlots}
            helper={`${totalSlots} total visible slots`}
          />
        </section>

        <AvailabilityBoard
          selectedDate={selectedDate}
          units={units}
        />
      </div>
    </PortalLayout>
  )
}