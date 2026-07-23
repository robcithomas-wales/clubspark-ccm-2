import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Users, Clock, Calendar, CheckCircle2 } from "lucide-react"
import { PortalLayout } from "@/components/portal-layout"
import { getVenues, getResources, getBookableUnits } from "@/lib/api"
import { SessionForm } from "../session-form"
import { SessionActions } from "./session-actions"
import { ParticipantList } from "./participant-list"
import { AddParticipantForm } from "./add-participant-form"

const TENANT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

async function getSession(id: string) {
  const res = await fetch(`http://127.0.0.1:4005/v1/sessions/${id}`, {
    headers: { "x-tenant-id": TENANT },
    cache: "no-store",
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error("Failed to fetch session")
  const json = await res.json()
  return json.data ?? json
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso))
}

function getDuration(start: string, end: string) {
  const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)
  if (mins < 60) return `${mins} minutes`
  const h = Math.floor(mins / 60), m = mins % 60
  return m === 0 ? `${h} hour${h !== 1 ? "s" : ""}` : `${h} hr ${m} min`
}

const STATUS_STYLE: Record<string, string> = {
  open: "bg-emerald-100 text-emerald-700",
  full: "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-600",
  completed: "bg-slate-100 text-slate-500",
}

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [session, venuesResult, resourcesResult, unitsResult] = await Promise.all([
    getSession(id),
    getVenues().catch(() => null),
    getResources().catch(() => []),
    getBookableUnits().catch(() => []),
  ])

  if (!session) notFound()

  const venues = venuesResult?.data ?? venuesResult ?? []
  const resources = Array.isArray(resourcesResult) ? resourcesResult : resourcesResult?.data ?? []
  const units = Array.isArray(unitsResult) ? unitsResult : unitsResult?.data ?? []
  const participants: any[] = session.participants ?? []
  const activeParticipants = participants.filter((p: any) => p.status !== "cancelled")
  const count = activeParticipants.length
  const confirmed = session.minParticipants == null || count >= session.minParticipants
  const isClosed = session.status === "cancelled" || session.status === "completed"

  return (
    <PortalLayout title={session.name} description={`Open session — ${formatDate(session.startsAt)}`}>
      <div className="space-y-6">
        <Link href="/sessions" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition">
          <ArrowLeft className="h-4 w-4" />
          Back to sessions
        </Link>

        {/* Header stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</div>
            <div className="mt-2">
              <span className={`rounded-full px-2.5 py-1 text-sm font-semibold ${STATUS_STYLE[session.status] ?? "bg-slate-100 text-slate-600"}`}>
                {session.status}
              </span>
              {session.status === "open" && (
                <div className={`mt-1 text-xs ${confirmed ? "text-emerald-600" : "text-amber-600"}`}>
                  {confirmed ? "Min participants reached" : `Need ${session.minParticipants! - count} more to confirm`}
                </div>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Participants</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {count}{session.maxParticipants != null ? ` / ${session.maxParticipants}` : ""}
            </div>
            {session.minParticipants && <div className="text-xs text-slate-400">min {session.minParticipants}</div>}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Time</div>
            <div className="mt-2 text-sm font-semibold text-slate-900">{formatDate(session.startsAt)}</div>
            <div className="text-xs text-slate-400">{getDuration(session.startsAt, session.endsAt)}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Price</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {session.pricePerParticipant != null ? `£${Number(session.pricePerParticipant).toFixed(2)}` : "Free"}
            </div>
            {session.pricePerParticipant != null && <div className="text-xs text-slate-400">per person</div>}
          </div>
        </div>

        {/* Actions bar */}
        {!isClosed && (
          <SessionActions sessionId={id} status={session.status} />
        )}

        {/* Participants */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-900">
                Participants ({count})
              </h2>
            </div>
          </div>
          <ParticipantList participants={participants} sessionId={id} />
        </div>

        {/* Add participant */}
        {!isClosed && (session.maxParticipants == null || count < session.maxParticipants) && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Add participant</h3>
            <AddParticipantForm sessionId={id} />
          </div>
        )}

        {/* Edit form */}
        {!isClosed && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Edit session</h3>
            <SessionForm venues={venues} resources={resources} units={units} existing={session} />
          </div>
        )}
      </div>
    </PortalLayout>
  )
}
