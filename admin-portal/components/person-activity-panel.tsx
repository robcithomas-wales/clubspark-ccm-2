"use client"

import { useEffect, useState } from "react"
import {
  CalendarDays,
  CreditCard,
  RefreshCw,
  UserCheck,
  XCircle,
  CheckCircle2,
  Clock,
} from "lucide-react"

type ActivityEvent = {
  id: string
  type: string
  title: string
  description: string
  date: string
  metadata?: Record<string, unknown>
}

const EVENT_CONFIG: Record<string, { icon: React.ElementType; colour: string }> = {
  booking_created: { icon: CalendarDays, colour: "bg-blue-50 text-blue-600 ring-blue-600/20" },
  booking_approved: { icon: CheckCircle2, colour: "bg-emerald-50 text-emerald-600 ring-emerald-600/20" },
  booking_cancelled: { icon: XCircle, colour: "bg-red-50 text-red-600 ring-red-600/20" },
  membership_created: { icon: CreditCard, colour: "bg-purple-50 text-purple-600 ring-purple-600/20" },
  membership_activated: { icon: UserCheck, colour: "bg-emerald-50 text-emerald-600 ring-emerald-600/20" },
  membership_cancelled: { icon: XCircle, colour: "bg-red-50 text-red-600 ring-red-600/20" },
  membership_expired: { icon: Clock, colour: "bg-amber-50 text-amber-600 ring-amber-600/20" },
  lifecycle_changed: { icon: RefreshCw, colour: "bg-slate-100 text-slate-600 ring-slate-500/20" },
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

export function PersonActivityPanel({ customerId }: { customerId: string }) {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/people/${customerId}/activity`)
      .then((r) => r.json())
      .then((json) => {
        setEvents(json.data ?? [])
        setLoading(false)
      })
      .catch(() => {
        setError("Failed to load activity")
        setLoading(false)
      })
  }, [customerId])

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Activity timeline</h2>
      </div>

      <div className="px-6 py-5">
        {loading && (
          <p className="text-sm text-slate-400">Loading activity…</p>
        )}

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        {!loading && !error && events.length === 0 && (
          <p className="text-sm text-slate-400">No activity recorded yet.</p>
        )}

        {!loading && !error && events.length > 0 && (
          <ol className="relative border-l border-slate-200 ml-3 space-y-6">
            {events.map((event) => {
              const config = EVENT_CONFIG[event.type] ?? {
                icon: RefreshCw,
                colour: "bg-slate-100 text-slate-600 ring-slate-500/20",
              }
              const Icon = config.icon

              return (
                <li key={event.id} className="ml-6">
                  <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white bg-white">
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full ring-1 ring-inset ${config.colour}`}>
                      <Icon className="h-3 w-3" />
                    </span>
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{event.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{event.description}</p>
                    <time className="mt-1 block text-xs text-slate-400">{formatDateTime(event.date)}</time>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )
}
