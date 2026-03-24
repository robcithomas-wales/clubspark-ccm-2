import Link from "next/link"
import { Plus, Shield, Users, CalendarDays } from "lucide-react"
import { getTeams } from "@/lib/api"
import { PortalLayout } from "@/components/portal-layout"

const SPORT_LABELS: Record<string, string> = {
  football: "Football",
  cricket: "Cricket",
  rugby: "Rugby",
  hockey: "Hockey",
  netball: "Netball",
  basketball: "Basketball",
  tennis: "Tennis",
  other: "Other",
}

export default async function TeamsPage() {
  const teams = await getTeams().catch(() => [])

  const activeTeams = teams.filter((t) => t.isActive)
  const inactiveTeams = teams.filter((t) => !t.isActive)

  return (
    <PortalLayout
      title="Teams"
      description="Manage your squads, rosters, fixtures, and match-day operations."
    >
      <div className="space-y-6">
        {/* Header card */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">All teams</h2>
              <p className="mt-1 text-sm text-slate-500">
                {activeTeams.length} active team{activeTeams.length !== 1 ? "s" : ""}
                {inactiveTeams.length > 0 ? `, ${inactiveTeams.length} inactive` : ""}
              </p>
            </div>
            <Link
              href="/teams/new"
              className="inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-semibold !text-white shadow-sm transition hover:bg-[#1832A8]"
            >
              <Plus className="h-4 w-4 !text-white" />
              Create team
            </Link>
          </div>

          {teams.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <Shield className="h-12 w-12 text-slate-300" />
              <p className="text-sm font-medium text-slate-500">No teams yet</p>
              <p className="text-sm text-slate-400">Create your first team to start managing rosters and fixtures.</p>
              <Link
                href="/teams/new"
                className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-semibold !text-white shadow-sm transition hover:bg-[#1832A8]"
              >
                <Plus className="h-4 w-4 !text-white" />
                Create team
              </Link>
            </div>
          ) : (
            <>
              <div className="hidden grid-cols-5 gap-4 border-b border-slate-200 bg-slate-100 px-6 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 lg:grid">
                <div className="col-span-2">Team</div>
                <div>Sport</div>
                <div>Roster</div>
                <div>Fixtures</div>
              </div>
              <ul className="divide-y divide-slate-100">
                {teams.map((team) => (
                  <li key={team.id}>
                    <Link
                      href={`/teams/${team.id}`}
                      className="grid grid-cols-1 gap-2 px-6 py-4 transition hover:bg-slate-50 lg:grid-cols-5 lg:items-center lg:gap-4"
                    >
                      <div className="col-span-2 flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                          <Shield className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{team.name}</p>
                          {team.season && (
                            <p className="text-xs text-slate-400">{team.season}{team.ageGroup ? ` · ${team.ageGroup}` : ""}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-slate-600">
                        {SPORT_LABELS[team.sport] ?? team.sport}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        {team._count?.members ?? 0}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                        {team._count?.fixtures ?? 0}
                        {!team.isActive && (
                          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                            Inactive
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </PortalLayout>
  )
}
