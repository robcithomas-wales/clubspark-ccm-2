"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

export function CancelBookingButton({
  bookingId,
  status,
}: {
  bookingId: string
  status?: string | null
}) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const isCancelled = (status || "").toLowerCase() === "cancelled"

  async function handleCancel() {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this booking?"
    )

    if (!confirmed) return

    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: "POST",
      })

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        if (result?.error === "BOOKING_ALREADY_CANCELLED") {
          setError("This booking is already cancelled.")
        } else if (result?.error === "BOOKING_NOT_FOUND") {
          setError("This booking could not be found.")
        } else {
          setError("Failed to cancel booking.")
        }
        return
      }

      router.refresh()
    } catch {
      setError("Something went wrong while cancelling the booking.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid gap-3">
      <button
        type="button"
        disabled
        className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-400"
      >
        Edit booking soon
      </button>

      <button
        type="button"
        onClick={handleCancel}
        disabled={isSubmitting || isCancelled}
        className="inline-flex h-11 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-5 text-sm font-medium text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isCancelled
          ? "Booking cancelled"
          : isSubmitting
          ? "Cancelling booking..."
          : "Cancel booking"}
      </button>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
    </div>
  )
}