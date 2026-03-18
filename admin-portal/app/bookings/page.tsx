import Link from "next/link"
import { Suspense } from "react"
import { getBookings, getBookableUnits } from "@/lib/api"
import { PortalLayout } from "@/components/portal-layout"
import { PaginationBar } from "@/components/pagination-bar"
import { BookingsFilterBar } from "@/components/bookings-filter-bar"
import { BookingsBulkActions } from "@/components/bookings-bulk-actions"
import { Plus } from "lucide-react"

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
  searchParams: Promise<{ page?: string; status?: string; fromDate?: string; toDate?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)
  const status = params.status
  const fromDate = params.fromDate
  const toDate = params.toDate

  const [bookingsResult, unitsResult] = await Promise.allSettled([
    getBookings(page, 25, { status, fromDate, toDate }),
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

          <Suspense>
            <BookingsFilterBar
              status={status}
              fromDate={fromDate}
              toDate={toDate}
            />
          </Suspense>

          {bookings.length === 0 ? (
            <div className="px-6 py-10 text-sm text-slate-500">
              No bookings found.
            </div>
          ) : (
            <>
              <BookingsBulkActions bookings={bookings} unitMap={unitMap} />

              {pagination && (
                <PaginationBar
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  total={pagination.total}
                  limit={pagination.limit}
                  basePath="/bookings"
                  extraParams={{
                    ...(status && status !== "all" ? { status } : {}),
                    ...(fromDate ? { fromDate } : {}),
                    ...(toDate ? { toDate } : {}),
                  }}
                />
              )}
            </>
          )}
        </section>
      </div>
    </PortalLayout>
  )
}
