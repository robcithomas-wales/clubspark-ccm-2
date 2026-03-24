import Link from "next/link"
import { notFound } from "next/navigation"
import {
  Shield,
  Users,
  CalendarDays,
  ArrowLeft,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Pencil,
} from "lucide-react"
import { getTeam, getRoster, getFixtures } from "@/lib/api"
import { PortalLayout } from "@/components/portal-layout"

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  draft:           { label: "Draft",           color: "bg-slate-100 text-slate-600" },
  scheduled:       { label: "Scheduled",       color: "bg-blue-50 text-blue-700" },
  squad_selected:  { label: "Squad selected",  color: "bg-indigo-50 text-indigo-700" },
  fees_requested:  { label: "Fees requested",  color: "bg-amber-50 text-amber-700" },
  completed:       { label: "Completed",       color: "bg-green-50 text-green-700" },
  cancelled:       { label: "Cancelled",       color: "bg-red-50 text-red-700" },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_BADGE[status] ?? { label: status, color: "bg-slate-100 text-slate-600" }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [team, roster, fixtures] = await Promise.all([
    getTeam(id).catch(() => null),
    getRoster(id).catch(() => []),
    getFixtures(id).catch(() => []),
  ])

  if (!team) notFound()

  const upcoming = fixtures.filter((f) => f.status !== "cancelled" && f.status !== "completed")
  const past = fixtures.filter((f) => f.status === "completed" || f.status === "cancelled")

  return (
    <PortalLayout title={team.name} description={`${team.sport} · ${team.season ?? ""}`}>
      <div className="space-y-6">
        {/* Back link */}
        <Link
          href="/teams"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          All teams
        </Link>

        {/* Team header */}
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
            <Shield className="h-7 w-7 text-blue-600" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">{team.name}</h1>
            <p className="text-sm text-slate-500">
              {[team.sport, team.season, team.ageGroup, team.gender].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/teams/${id}/fixtures/new`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <CalendarDays className="h-4 w-4" />
              Add fixture
            </Link>
            <Link
              href={`/teams/${id}/roster/new`}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-semibold !text-white shadow-sm transition hover:bg-[#1832A8]"
            >
              <Plus className="h-4 w-4 !text-white" />
              Add player
            </Link>
          </div>
        </div>

        {/* Stat pills */}
        <div className="flex flex-wrap gap-4">
          {[
            { label: "Players", value: roster.length, icon: Users },
            { label: "Upcoming", value: upcoming.length, icon: CalendarDays },
            { label: "Played", value: past.filter((f) => f.status === "completed").length, icon: CheckCircle2 },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <Icon className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-500">{label}</span>
              <span className="text-sm font-bold text-slate-900">{value}</span>
            </div>
          ))}
        </div>

        {/* Roster */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">Roster</h2>
            <Link
              href={`/teams/${id}/roster/new`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              <Plus className="h-4 w-4" /> Add player
            </Link>
          </div>
          {roster.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Users className="h-10 w-10 text-slate-300" />
              <p className="text-sm text-slate-500">No players yet. Add your first player to the squad.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {roster.map((member) => (
                <li key={member.id} className="flex items-center justify-between px-6 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                      {member.shirtNumber ?? "—"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{member.displayName}</p>
                      {member.position && (
                        <p className="text-xs text-slate-400">{member.position}</p>
                      )}
                    </div>
                    {member.isJunior && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                        Junior
                      </span>
                    )}
                    {member.isGuest && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                        Guest
                      </span>
                    )}
                  </div>
                  <div className="ml-auto flex items-center gap-3">
                    {member.email && (
                      <span className="hidden text-xs text-slate-400 md:block">{member.email}</span>
                    )}
                    <Link
                      href={`/teams/${id}/roster/${member.id}/edit`}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      title="Edit player"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Upcoming fixtures */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">Upcoming fixtures</h2>
            <Link
              href={`/teams/${id}/fixtures/new`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              <Plus className="h-4 w-4" /> Add fixture
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <CalendarDays className="h-10 w-10 text-slate-300" />
              <p className="text-sm text-slate-500">No upcoming fixtures. Schedule your next match.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {upcoming.map((fixture) => (
                <li key={fixture.id}>
                  <Link
                    href={`/teams/${id}/fixtures/${fixture.id}`}
                    className="flex items-center justify-between px-6 py-4 transition hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <p className="text-xs font-medium uppercase text-slate-400">
                          {new Date(fixture.kickoffAt).toLocaleDateString("en-GB", { weekday: "short" })}
                        </p>
                        <p className="text-lg font-bold text-slate-900">
                          {new Date(fixture.kickoffAt).getDate()}
                        </p>
                        <p className="text-xs text-slate-400">
                          {new Date(fixture.kickoffAt).toLocaleDateString("en-GB", { month: "short" })}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {fixture.homeAway === "home" ? "vs" : "@"} {fixture.opponent}
                        </p>
                        <p className="text-xs text-slate-400">
                          {new Date(fixture.kickoffAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                          {fixture.venue ? ` · ${fixture.venue}` : ""}
                          {fixture.matchType ? ` · ${fixture.matchType}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={fixture.status} />
                      {fixture._count && (
                        <div className="hidden items-center gap-3 text-xs text-slate-400 md:flex">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {fixture._count.availability} responded
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Past results */}
        {past.length > 0 && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-900">Past fixtures</h2>
            </div>
            <ul className="divide-y divide-slate-100">
              {past.map((fixture) => (
                <li key={fixture.id}>
                  <Link
                    href={`/teams/${id}/fixtures/${fixture.id}`}
                    className="flex items-center justify-between px-6 py-3 transition hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-sm text-slate-500">
                        {new Date(fixture.kickoffAt).toLocaleDateString("en-GB", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </div>
                      <div className="font-medium text-slate-700">
                        {fixture.homeAway === "home" ? "vs" : "@"} {fixture.opponent}
                      </div>
                    </div>
                    <StatusBadge status={fixture.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </PortalLayout>
  )
}
