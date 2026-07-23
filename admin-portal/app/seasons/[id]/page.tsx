import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, CalendarDays, Plus, Pencil, Trash2 } from "lucide-react"
import { PortalLayout } from "@/components/portal-layout"
import { SeasonForm } from "../season-form"
import { SeasonLinkedConfigsPanel } from "./season-linked-configs-panel"
import { getVenues } from "@/lib/api"

const VENUE_SERVICE = "http://127.0.0.1:4003"
const HEADERS = { "x-tenant-id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" }

async function getSeason(id: string) {
  const res = await fetch(`${VENUE_SERVICE}/v1/seasonal-schedules/${id}`, {
    headers: HEADERS,
    cache: "no-store",
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error("Failed to fetch season")
  const json = await res.json()
  return json.data ?? null
}

async function getLinkedConfigs(scheduleId: string) {
  try {
    const res = await fetch(
      `${VENUE_SERVICE}/v1/availability-configs?scheduleId=${scheduleId}`,
      { headers: HEADERS, cache: "no-store" },
    )
    if (!res.ok) return []
    const json = await res.json()
    return json.data ?? []
  } catch {
    return []
  }
}

const STATUS_COLOURS: Record<string, string> = {
  active: "bg-green-100 text-green-700 ring-1 ring-green-200",
  draft: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  ended: "bg-slate-100 text-slate-400 ring-1 ring-slate-200",
}

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export default async function SeasonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [season, venues, linkedConfigs] = await Promise.all([
    getSeason(id),
    getVenues(),
    getLinkedConfigs(id),
  ])
  if (!season) notFound()

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })

  return (
    <PortalLayout
      title={season.name}
      description={`${season.status} · ${fmt(season.startDate)} – ${fmt(season.endDate)}`}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/seasons"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to seasons
          </Link>
        </div>

        {/* Season summary */}
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: "Start date", value: fmt(season.startDate) },
            { label: "End date", value: fmt(season.endDate) },
            { label: "Status", value: season.status, badge: true },
          ].map(({ label, value, badge }) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</div>
              <div className="mt-2">
                {badge ? (
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLOURS[value] ?? "bg-slate-100 text-slate-600"}`}>
                    {value}
                  </span>
                ) : (
                  <div className="text-sm font-semibold text-slate-900">{value}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {season.notes && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-700">
            {season.notes}
          </div>
        )}

        {/* Linked availability configs */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-900">
                Linked availability configs ({linkedConfigs.length})
              </h3>
            </div>
          </div>

          {linkedConfigs.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-400">
              No availability configs linked to this season yet. Add one below to override default
              opening hours during this seasonal period.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {linkedConfigs.map((cfg: any) => (
                <div key={cfg.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-900 capitalize">
                        {cfg.scopeType.replace("_", " ")}
                      </span>
                      {cfg.dayOfWeek !== null && cfg.dayOfWeek !== undefined && (
                        <span className="text-xs bg-blue-50 text-blue-700 rounded-full px-2 py-0.5">
                          {DOW_LABELS[cfg.dayOfWeek]}
                        </span>
                      )}
                      {cfg.isActive === false && (
                        <span className="text-xs bg-slate-100 text-slate-500 rounded-full px-2 py-0.5">
                          inactive
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 space-x-3">
                      {cfg.opensAt && cfg.closesAt && (
                        <span>{cfg.opensAt} – {cfg.closesAt}</span>
                      )}
                      {cfg.slotDurationMinutes && (
                        <span>{cfg.slotDurationMinutes}min slots</span>
                      )}
                      {cfg.newDayReleaseTime && (
                        <span>New-day release: {cfg.newDayReleaseTime}</span>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/availability?editId=${cfg.id}`}
                    className="shrink-0 text-slate-400 hover:text-[#1857E0] transition"
                    title="Edit config"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                </div>
              ))}
            </div>
          )}

          {/* Add linked config panel */}
          <SeasonLinkedConfigsPanel
            scheduleId={id}
            venues={venues.map((v: any) => ({ id: v.id, name: v.name }))}
          />
        </div>

        {/* Edit form */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm max-w-xl">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Edit season details</h3>
          <SeasonForm
            venues={venues.map((v: any) => ({ id: v.id, name: v.name }))}
            existing={season}
          />
        </div>
      </div>
    </PortalLayout>
  )
}
