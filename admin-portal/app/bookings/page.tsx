import Link from "next/link"
import { getBookings, getBookableUnits } from "@/lib/api"
import { PortalLayout } from "@/components/portal-layout"
import { PaginationBar } from "@/components/pagination-bar"
import { CalendarDays, Clock3, ChevronRight, Plus } from "lucide-react"

function formatDate(value?: string | null) {
  if (!value) return "n/a"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}

function formatTime(value?: string | null) {
  if (!value) return "n/a"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function getDurationLabel(start?: string | null, end?: string | null) {
  if (!start || !end) return "n/a"

  const startDate = new Date(start)
  const endDate = new Date(end)

  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime())
  ) {
    return "n/a"
  }

  const minutes = Math.max(
    0,
    Math.round((endDate.getTime() - startDate.getTime()) / 60000)
  )

  if (minutes < 60) return `${minutes} mins`

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (remainingMinutes === 0) return `${hours} hr`

  return `${hours} hr ${remainingMinutes} mins`
}

function getStatusClasses(status?: string | null) {
  switch ((status || "").toLowerCase()) {
    case "active":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
    case "cancelled":
      return "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
    case "pending":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
  }
}

function getUnitTypeClasses(unitType?: string | null) {
  switch ((unitType || "").toLowerCase()) {
    case "full":
      return "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
    case "half":
      return "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
    case "quarter":
      return "bg-violet-50 text-violet-700 ring-1 ring-violet-200"
    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
  }
}

function getUnitTypeLabel(unitType?: string | null) {
  if (!unitType) return "Unknown"
  return unitType.charAt(0).toUpperCase() + unitType.slice(1)
}

function getSourceClasses(source?: string | null) {
  switch ((source || "").toLowerCase()) {
    case "phone":
      return "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
    case "admin":
      return "bg-violet-50 text-violet-700 ring-1 ring-violet-200"
    case "app":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
    case "walk_in":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
  }
}

function getSourceLabel(source?: string | null) {
  if (!source) return "Manual"

  switch ((source || "").toLowerCase()) {
    case "walk_in":
      return "Walk in"
    default:
      return source.charAt(0).toUpperCase() + source.slice(1)
  }
}

function shortBookingId(value?: string | null) {
  if (!value) return "n/a"
  return value.slice(0, 8).toUpperCase()
}

function getCustomerName(booking: any) {
  const firstName = booking.customerFirstName?.trim() || ""
  const lastName = booking.customerLastName?.trim() || ""

  const fullName = `${firstName} ${lastName}`.trim()

  if (fullName) return fullName
  if (booking.customerId) return "Customer linked"
  return "Guest / unassigned"
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

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)

  const [bookingsResult, unitsResult] = await Promise.allSettled([
    getBookings(page),
    getBookableUnits(),
  ])

  const bookingsData = bookingsResult.status === "fulfilled"
    ? bookingsResult.value
    : { data: [], pagination: { total: 0, page: 1, limit: 25, totalPages: 0 } }

  const bookings: any[] = bookingsData.data ?? []
  const pagination = bookingsData.pagination

  const units: any[] = unitsResult.status === "fulfilled" ? (unitsResult.value ?? []) : []

  const unitMap = new Map(units.map((unit: any) => [unit.id, unit]))

  const activeBookings = bookings.filter(
    (booking: any) => (booking.status || "").toLowerCase() === "active"
  ).length

  const distinctUnitCount = new Set(
    bookings.map((booking: any) => booking.bookableUnitId)
  ).size

  const customerLinkedCount = bookings.filter(
    (booking: any) => !!booking.customerId
  ).length

  return (
    <PortalLayout
      title="Bookings"
      description="View and manage booking records from the Booking Service."
    >
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total bookings"
            value={pagination?.total ?? 0}
            helper="All records"
          />
          <StatCard
            label="Active (this page)"
            value={activeBookings}
            helper="Active on current page"
          />
          <StatCard
            label="Units booked"
            value={distinctUnitCount}
            helper="Distinct bookable units"
          />
          <StatCard
            label="With customer"
            value={customerLinkedCount}
            helper="Customer-linked this page"
          />
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Booking list
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Ordered by booked date and time, newest first.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 md:block">
                {pagination?.total ?? 0} records
              </div>

              <Link
                href="/create-booking"
                className="inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-semibold !text-white shadow-sm transition hover:bg-[#1832A8] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#1857E0] focus:ring-offset-2"
              >
                <Plus className="h-4 w-4 !text-white" />
                New booking
              </Link>
            </div>
          </div>

          {bookings.length === 0 ? (
            <div className="px-6 py-10 text-sm text-slate-500">
              No bookings found.
            </div>
          ) : (
            <>
              <div className="hidden grid-cols-9 gap-4 border-b border-slate-200 bg-slate-100 px-6 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 lg:grid">
                <div>Booking</div>
                <div>Customer</div>
                <div>Unit</div>
                <div className="text-center">Type</div>
                <div className="text-center">Date</div>
                <div className="text-center">Time</div>
                <div className="text-center">Duration</div>
                <div className="text-center">Source</div>
                <div className="text-center">Status</div>
              </div>

              <div className="divide-y divide-slate-200">
                {bookings.map((booking: any) => {
                  const unit = unitMap.get(booking.bookableUnitId)
                  const unitName = unit?.name || booking.bookableUnitId
                  const unitType = unit?.unitType || null

                  return (
                    <Link
                      key={booking.id}
                      href={`/bookings/${booking.id}`}
                      className="block px-6 py-5 transition hover:bg-blue-50/40"
                    >
                      <div className="grid gap-4 lg:grid-cols-9 lg:items-center">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 lg:hidden">
                            Booking
                          </div>
                          <div className="flex items-center gap-2 font-semibold text-slate-900">
                            <span className="truncate">
                              {booking.bookingReference || `BK-${shortBookingId(booking.id)}`}
                            </span>
                            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                          </div>
                          <div className="mt-1 text-xs text-slate-400">
                            ID {shortBookingId(booking.id)}
                          </div>
                        </div>

                        <div className="min-w-0">
                          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 lg:hidden">
                            Customer
                          </div>
                          <div className="truncate font-medium text-slate-800">
                            {getCustomerName(booking)}
                          </div>
                          <div className="mt-1 truncate text-xs text-slate-400">
                            {booking.customerEmail ||
                              booking.customerPhone ||
                              (booking.customerId ? booking.customerId : "No customer details")}
                          </div>
                        </div>

                        <div className="min-w-0">
                          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 lg:hidden">
                            Unit
                          </div>
                          <div className="truncate font-medium text-slate-800">
                            {unitName}
                          </div>
                        </div>

                        <div className="text-center">
                          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 lg:hidden">
                            Type
                          </div>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getUnitTypeClasses(
                              unitType
                            )}`}
                          >
                            {getUnitTypeLabel(unitType)}
                          </span>
                        </div>

                        <div className="text-center">
                          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 lg:hidden">
                            Date
                          </div>
                          <div className="flex items-center justify-center gap-2 text-sm text-slate-700">
                            <CalendarDays className="h-4 w-4 text-slate-400" />
                            {formatDate(booking.startsAt)}
                          </div>
                        </div>

                        <div className="text-center">
                          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 lg:hidden">
                            Time
                          </div>
                          <div className="flex items-center justify-center gap-2 text-sm text-slate-700">
                            <Clock3 className="h-4 w-4 text-slate-400" />
                            <span>
                              {formatTime(booking.startsAt)} to {formatTime(booking.endsAt)}
                            </span>
                          </div>
                        </div>

                        <div className="text-center">
                          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 lg:hidden">
                            Duration
                          </div>
                          <div className="text-sm text-slate-700">
                            {getDurationLabel(booking.startsAt, booking.endsAt)}
                          </div>
                        </div>

                        <div className="text-center">
                          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 lg:hidden">
                            Source
                          </div>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getSourceClasses(
                              booking.bookingSource
                            )}`}
                          >
                            {getSourceLabel(booking.bookingSource)}
                          </span>
                        </div>

                        <div className="text-center">
                          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 lg:hidden">
                            Status
                          </div>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClasses(
                              booking.status
                            )}`}
                          >
                            {booking.status || "unknown"}
                          </span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>

              {pagination && (
                <PaginationBar
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  total={pagination.total}
                  limit={pagination.limit}
                  basePath="/bookings"
                />
              )}
            </>
          )}
        </section>
      </div>
    </PortalLayout>
  )
}
