import Link from "next/link"
import { notFound } from "next/navigation"
import { getBookingSeriesById } from "@/lib/api"
import { PortalLayout } from "@/components/portal-layout"
import { ChevronLeft, Repeat2 } from "lucide-react"
import { BookingSeriesActions } from "./actions"

function formatDateTime(value?: string | null) {
  if (!value) return "n/a"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function statusBadge(status: string) {
  if (status === "cancelled") {
    return (
      <span className="inline-flex rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700 ring-1 ring-rose-200">
        Cancelled
      </span>
    )
  }
  return (
    <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
      Active
    </span>
  )
}

function bookingStatusBadge(status: string) {
  if (status === "cancelled") {
    return (
      <span className="inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
        Cancelled
      </span>
    )
  }
  return (
    <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
      Active
    </span>
  )
}

export default async function BookingSeriesDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await getBookingSeriesById(id)

  if (!data) notFound()

  const series = data
  const bookings: any[] = data.bookings ?? []

  return (
    <PortalLayout title="Booking Series">
      <div className="px-8 py-8 max-w-5xl">
        <div className="mb-6">
          <Link
            href="/booking-series"
            className="inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-slate-900"
          >
            <ChevronLeft className="h-4 w-4" />
            Recurring series
          </Link>
        </div>

        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <Repeat2 className="h-5 w-5 text-slate-400" />
              <h1 className="text-2xl font-semibold text-slate-900">
                Recurring Series
              </h1>
              {statusBadge(series.status)}
            </div>
            <p className="mt-1 font-mono text-sm text-slate-500">{series.id}</p>
          </div>
        </div>

        {/* Series details */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: "RRULE", value: series.rrule },
            { label: "Slot", value: `${series.slotStartsAt} – ${series.slotEndsAt}` },
            { label: "Payment", value: series.paymentStatus },
            { label: "Occurrences", value: String(bookings.length) },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {label}
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900 break-all">{value}</div>
            </div>
          ))}
        </div>

        {/* Actions (client component) */}
        {series.status !== "cancelled" && (
          <BookingSeriesActions seriesId={id} bookings={bookings} />
        )}

        {/* Bookings list */}
        <div className="mt-8">
          <h2 className="mb-4 text-base font-semibold text-slate-900">
            Occurrences ({bookings.length})
          </h2>

          {bookings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center text-sm text-slate-500">
              No occurrences found.
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
              <div className="grid grid-cols-[1fr_auto_auto_40px] gap-x-4 border-b border-slate-200 bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                <div>Date / Time</div>
                <div>Reference</div>
                <div>Status</div>
                <div />
              </div>
              <div className="divide-y divide-slate-100">
                {bookings.map((b: any) => (
                  <Link
                    key={b.id}
                    href={`/bookings/${b.id}`}
                    className="grid grid-cols-[1fr_auto_auto_40px] items-center gap-x-4 px-6 py-3 transition hover:bg-slate-50"
                  >
                    <div className="text-sm text-slate-900">
                      {formatDateTime(b.startsAt)}
                      <span className="mx-1 text-slate-400">–</span>
                      {formatDateTime(b.endsAt)}
                    </div>
                    <div className="font-mono text-xs text-slate-500">{b.bookingReference}</div>
                    <div>{bookingStatusBadge(b.status)}</div>
                    <span className="text-xs text-slate-400">→</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  )
}
