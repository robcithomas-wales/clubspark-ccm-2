import Link from "next/link"
import { notFound } from "next/navigation"
import {
  CalendarDays,
  Clock3,
  ArrowLeft,
  History,
  FileText,
} from "lucide-react"
import { getBookableUnits } from "@/lib/api"
import { PortalLayout } from "@/components/portal-layout"
import { CancelBookingButton } from "@/components/cancel-booking-button"

function formatDate(value?: string | null) {
  if (!value) return "n/a"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
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

function formatDateTime(value?: string | null) {
  if (!value) return "n/a"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
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

function getSourceLabel(source?: string | null) {
  if (!source) return "Manual"

  switch ((source || "").toLowerCase()) {
    case "walk_in":
      return "Walk in"
    default:
      return source.charAt(0).toUpperCase() + source.slice(1)
  }
}

function getCustomerName(booking: any) {
  const firstName = booking.customerFirstName?.trim() || ""
  const lastName = booking.customerLastName?.trim() || ""
  const fullName = `${firstName} ${lastName}`.trim()

  if (fullName) return fullName
  if (booking.customerId) return "Customer linked"
  return "Guest / unassigned"
}

const BOOKING_HEADERS = {
  "x-tenant-id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "x-organisation-id": "11111111-1111-1111-1111-111111111111",
}

async function getBooking(id: string) {
  const response = await fetch(`http://localhost:4005/bookings/${id}`, {
    headers: BOOKING_HEADERS,
    cache: "no-store",
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error("Failed to load booking")
  }

  const json = await response.json()
  return json?.data ?? json
}

function SummaryCard({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-base font-semibold text-slate-900">
        {value}
      </div>
    </div>
  )
}

function DetailTile({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
        {icon}
        <span>{value}</span>
      </div>
    </div>
  )
}

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [booking, units] = await Promise.all([
    getBooking(id),
    getBookableUnits(),
  ])

  if (!booking) {
    notFound()
  }

  const unitMap = new Map(units.map((unit: any) => [unit.id, unit]))
  const unit = unitMap.get(booking.bookableUnitId)

  return (
    <PortalLayout
      title="Booking Reference Number"
      description={booking.bookingReference || booking.id}
    >
      <div className="space-y-6">
        <div>
          <Link
            href="/bookings"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to bookings
          </Link>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Customer"
            value={getCustomerName(booking)}
          />
          <SummaryCard
            label="Bookable unit"
            value={unit?.name || booking.bookableUnitId}
          />
          <SummaryCard
            label="Source"
            value={getSourceLabel(booking.bookingSource)}
          />
          <SummaryCard
            label="Status"
            value={booking.status || "unknown"}
          />
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-xl font-semibold text-slate-900">
              Booking details
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Full operational record for this booking.
            </p>
          </div>

          <div className="space-y-6 px-6 py-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <DetailTile
                icon={<CalendarDays className="h-4 w-4 text-slate-400" />}
                label="Date"
                value={formatDate(booking.startsAt)}
              />

              <DetailTile
                icon={<Clock3 className="h-4 w-4 text-slate-400" />}
                label="Time"
                value={`${formatTime(booking.startsAt)} to ${formatTime(booking.endsAt)}`}
              />

              <DetailTile
                label="Duration"
                value={getDurationLabel(booking.startsAt, booking.endsAt)}
              />

              <DetailTile
                label="Booking source"
                value={getSourceLabel(booking.bookingSource)}
              />

              <DetailTile
                icon={<History className="h-4 w-4 text-slate-400" />}
                label="Date created"
                value={formatDateTime(booking.createdAt)}
              />

              <DetailTile
                icon={<History className="h-4 w-4 text-slate-400" />}
                label="Last updated"
                value={formatDateTime(booking.updatedAt)}
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-400" />
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Notes
                  </div>
                </div>
                <div className="mt-3 text-sm leading-6 text-slate-700">
                  {booking.notes?.trim()
                    ? booking.notes
                    : "No notes recorded for this booking."}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Customer contact
                </div>
                <div className="mt-3 text-sm leading-6 text-slate-700">
                  {booking.customerEmail ||
                    booking.customerPhone ||
                    "No customer contact details"}
                </div>

                <div className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Booking ID
                </div>
                <div className="mt-2 break-all text-sm text-slate-700">
                  {booking.id}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-6 xl:max-w-md">
              <CancelBookingButton
                bookingId={booking.id}
                status={booking.status}
              />
            </div>
          </div>
        </section>
      </div>
    </PortalLayout>
  )
}