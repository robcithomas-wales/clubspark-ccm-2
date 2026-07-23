import Link from "next/link"
import { Plus, Users, Clock, CheckCircle2, XCircle, Calendar } from "lucide-react"
import { PortalLayout } from "@/components/portal-layout"
import { getOpenSessions } from "@/lib/api"

const STATUS_STYLE: Record<string, string> = {
  open: "bg-emerald-100 text-emerald-700",
  full: "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-600",
  completed: "bg-slate-100 text-slate-500",
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso))
}

function getDuration(start: string, end: string) {
  const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60), m = mins % 60
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`
}

export default async function SessionsPage() {
  let sessions: any[] = []
  try {
    const res = await getOpenSessions()
    sessions = res.data ?? []
  } catch {
    // service not running
  }

  const upcoming = sessions.filter((s) => new Date(s.startsAt) >= new Date() && s.status !== "cancelled")
  const past = sessions.filter((s) => new Date(s.startsAt) < new Date() || s.status === "cancelled")

  function SessionRow({ s }: { s: any }) {
    const count = Number(s.participantCount ?? 0)
    const max = s.maxParticipants
    const min = s.minParticipants
    const confirmed = min == null || count >= min

    return (
      <Link
        href={`/sessions/${s.id}`}
        className="block hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-4 px-5 py-4 border-b border-slate-100 last:border-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-slate-900">{s.name}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[s.status] ?? "bg-slate-100 text-slate-600"}`}>
                {s.status}
              </span>
              {s.status === "open" && !confirmed && (
                <span className="rounded-full bg-yellow-100 text-yellow-700 px-2 py-0.5 text-xs font-medium">
                  Below minimum
                </span>
              )}
              {s.status === "open" && confirmed && (
                <span className="rounded-full bg-emerald-50 text-emerald-600 px-2 py-0.5 text-xs">
                  Confirmed
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDateTime(s.startsAt)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {getDuration(s.startsAt, s.endsAt)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6 shrink-0 text-sm">
            <div className="text-center">
              <div className="font-semibold text-slate-900 flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-slate-400" />
                {count}{max != null ? ` / ${max}` : ""}
              </div>
              <div className="text-xs text-slate-400">{min != null ? `min ${min}` : "no minimum"}</div>
            </div>
            {s.pricePerParticipant != null && (
              <div className="text-right">
                <div className="font-semibold text-slate-900">£{Number(s.pricePerParticipant).toFixed(2)}</div>
                <div className="text-xs text-slate-400">per person</div>
              </div>
            )}
          </div>
        </div>
      </Link>
    )
  }

  return (
    <PortalLayout
      title="Open Bookings"
      description="Sessions that members can join. Manage capacity, participant lists, and session status."
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex gap-4 text-sm text-slate-500">
            <span>{upcoming.length} upcoming</span>
            <span>{past.length} past / cancelled</span>
          </div>
          <Link
            href="/sessions/new"
            className="inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-medium text-white hover:bg-[#1832A8] transition"
          >
            <Plus className="h-4 w-4" />
            New session
          </Link>
        </div>

        {sessions.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1857E0]/10">
              <Users className="h-7 w-7 text-[#1857E0]" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">No sessions yet</h3>
            <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
              Create an open session to allow members to join a shared slot, such as group coaching, social play, or fitness classes.
            </p>
            <Link
              href="/sessions/new"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1832A8] transition"
            >
              <Plus className="h-4 w-4" />
              Create first session
            </Link>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Upcoming
                </div>
                {upcoming.map((s) => <SessionRow key={s.id} s={s} />)}
              </div>
            )}
            {past.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Past & cancelled
                </div>
                {past.map((s) => <SessionRow key={s.id} s={s} />)}
              </div>
            )}
          </>
        )}
      </div>
    </PortalLayout>
  )
}
