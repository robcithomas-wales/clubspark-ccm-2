import Link from "next/link"
import { notFound } from "next/navigation"
import {
  CalendarDays,
  Clock3,
  ArrowLeft,
  History,
  FileText,
  Repeat2,
} from "lucide-react"
import { getBookableUnits, getAddOnServices } from "@/lib/api"
import { PortalLayout } from "@/components/portal-layout"
import { CancelBookingButton } from "@/components/cancel-booking-button"
import { PaymentStatusButton } from "@/components/payment-status-button"
import { EditBookingPanel } from "@/components/edit-booking-panel"
import { ApproveRejectButtons } from "@/components/approve-reject-buttons"

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

async function getBookingAddOns(id: string) {
  try {
    const response = await fetch(`http://localhost:4005/bookings/${id}/add-ons`, {
      headers: BOOKING_HEADERS,
      cache: "no-store",
    })
    if (!response.ok) return []
    const json = await response.json()
    return json?.data ?? json ?? []
  } catch {
    return []
  }
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
  const [booking, units, bookingAddOns, addOnServices] = await Promise.all([
    getBooking(id),
    getBookableUnits(),
    getBookingAddOns(id),
    getAddOnServices().catch(() => []),
  ])

  if (!booking) {
    notFound()
  }

  const unitMap = new Map(units.map((unit: any) => [unit.id, unit]))
  const addOnServiceMap = new Map<string, any>(
    (Array.isArray(addOnServices) ? addOnServices : (addOnServices as any)?.data ?? [])
      .map((a: any) => [a.id, a])
  )
  const unit = unitMap.get(booking.bookableUnitId)
  const optionalUnits: any[] = (booking.optionalUnitIds ?? [])
    .map((uid: string) => unitMap.get(uid))
    .filter(Boolean)

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
            label="Booking status"
            value={booking.status || "unknown"}
          />
          <SummaryCard
            label="Payment"
            value={booking.paymentStatus || "unpaid"}
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

            {booking.seriesId && (
              <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 flex items-center gap-3">
                <Repeat2 className="h-4 w-4 text-sky-600 shrink-0" />
                <span className="text-sm text-sky-800">
                  Part of a recurring series.{" "}
                  <Link
                    href={`/booking-series/${booking.seriesId}`}
                    className="font-semibold underline underline-offset-2 hover:text-sky-900"
                  >
                    View series →
                  </Link>
                </span>
              </div>
            )}

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

            {bookingAddOns.length > 0 && (
              <div className="border-t border-slate-200 pt-6">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Product add-ons
                </div>
                <div className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  {bookingAddOns.map((addOn: any) => (
                    <div key={addOn.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {addOnServiceMap.get(addOn.addOnId)?.name ?? addOn.addOnId}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          {addOn.startsAt ? formatTime(addOn.startsAt) : ""}{addOn.endsAt ? ` – ${formatTime(addOn.endsAt)}` : ""}
                          {addOn.quantity && addOn.quantity > 1 ? ` · qty ${addOn.quantity}` : ""}
                        </div>
                      </div>
                      {addOn.price != null && (
                        <div className="text-sm font-semibold text-slate-700">
                          {addOn.currency ? `${addOn.currency} ` : ""}{addOn.price}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {optionalUnits.length > 0 && (
              <div className="border-t border-slate-200 pt-6">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Optional extras
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {optionalUnits.map((u: any) => (
                    <span
                      key={u.id}
                      className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200"
                    >
                      {u.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {booking.status === "pending" && (
              <ApproveRejectButtons bookingId={booking.id} />
            )}

            <EditBookingPanel
              bookingId={booking.id}
              status={booking.status}
              startsAt={booking.startsAt}
              endsAt={booking.endsAt}
              notes={booking.notes}
              bookingSource={booking.bookingSource}
              bookableUnitId={booking.bookableUnitId}
              availableUnits={units
                .filter((u: any) => u.resourceId === booking.resourceId && u.isActive !== false)
                .map((u: any) => ({ id: u.id, name: u.name }))}
            />

            <div className="border-t border-slate-200 pt-6">
              <PaymentStatusButton
                bookingId={booking.id}
                paymentStatus={booking.paymentStatus ?? "unpaid"}
              />
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