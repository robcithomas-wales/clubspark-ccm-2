import Link from "next/link"
import { ArrowLeft, Clock } from "lucide-react"
import { getBookings, getBookableUnits } from "@/lib/api"
import { PortalLayout } from "@/components/portal-layout"
import { PendingBookingActions } from "@/components/pending-booking-actions"

function formatDate(value?: string | null) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
}

function formatTime(value?: string | null) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(value))
}

function getCustomerName(booking: any) {
  const fn = booking.customerFirstName?.trim() || ""
  const ln = booking.customerLastName?.trim() || ""
  const full = `${fn} ${ln}`.trim()
  if (full) return full
  if (booking.customerId) return "Customer linked"
  return "Guest / unassigned"
}

function hoursAgo(iso?: string | null) {
  if (!iso) return "—"
  const ms = Date.now() - new Date(iso).getTime()
  const h = Math.floor(ms / 3_600_000)
  if (h < 1) return "< 1 hr ago"
  if (h < 24) return `${h} hr${h !== 1 ? "s" : ""} ago`
  const d = Math.floor(h / 24)
  return `${d} day${d !== 1 ? "s" : ""} ago`
}

export default async function PendingApprovalsPage() {
  const [bookingsResult, unitsResult] = await Promise.allSettled([
    getBookings(1, 100, { status: "pending" }),
    getBookableUnits(),
  ])

  const bookings: any[] =
    bookingsResult.status === "fulfilled" ? (bookingsResult.value?.data ?? []) : []
  const units: any[] =
    unitsResult.status === "fulfilled" ? (unitsResult.value ?? []) : []

  const unitMap = new Map(units.map((u: any) => [u.id, u]))

  const sorted = [...bookings].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  return (
    <PortalLayout
      title="Pending Approvals"
      description="Bookings awaiting admin approval, oldest first."
    >
      <div className="space-y-6">
        <Link
          href="/bookings"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to bookings
        </Link>

        {sorted.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-md">
            <Clock className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-4 text-sm font-medium text-slate-500">No pending bookings — you&apos;re all caught up.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md">
            <div className="flex items-center justify-between border-b border-slate-100 bg-amber-50/60 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {sorted.length} booking{sorted.length !== 1 ? "s" : ""} awaiting approval
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  Oldest first — bookings auto-expire after 24 hours.
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {sorted.map((booking) => {
                const unit = unitMap.get(booking.bookableUnitId)
                const ageHours = (Date.now() - new Date(booking.createdAt).getTime()) / 3_600_000
                const isExpiringSoon = ageHours >= 20

                return (
                  <div
                    key={booking.id}
                    className={`flex flex-col gap-4 px-6 py-5 md:flex-row md:items-start md:justify-between ${isExpiringSoon ? "bg-amber-50/40" : ""}`}
                  >
                    <div className="flex-1 min-w-0 grid gap-3 md:grid-cols-4">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Reference</div>
                        <Link
                          href={`/bookings/${booking.id}`}
                          className="mt-1 block text-sm font-semibold text-[#1857E0] hover:underline"
                        >
                          {booking.bookingReference || booking.id.slice(0, 8).toUpperCase()}
                        </Link>
                        <div className="mt-0.5 text-xs text-slate-400">{getCustomerName(booking)}</div>
                      </div>

                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Unit</div>
                        <div className="mt-1 text-sm font-medium text-slate-900">
                          {unit?.name || "—"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Date &amp; time</div>
                        <div className="mt-1 text-sm text-slate-900">{formatDate(booking.startsAt)}</div>
                        <div className="text-xs text-slate-500">
                          {formatTime(booking.startsAt)} – {formatTime(booking.endsAt)}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Submitted</div>
                        <div className={`mt-1 text-sm font-medium ${isExpiringSoon ? "text-amber-700" : "text-slate-900"}`}>
                          {hoursAgo(booking.createdAt)}
                        </div>
                        {isExpiringSoon && (
                          <div className="mt-0.5 text-xs text-amber-600">Expiring soon</div>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0">
                      <PendingBookingActions bookingId={booking.id} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  )
}
