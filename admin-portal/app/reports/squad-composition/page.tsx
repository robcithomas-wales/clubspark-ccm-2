import { PortalLayout } from "@/components/portal-layout"
import { ExportButton } from "@/components/reports/export-button"
import { HBarChart } from "@/components/reports/charts"
import { getTeamReportSquadComposition } from "@/lib/api"

function ProfileBar({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-slate-400">—</span>
  const colour = pct >= 75 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-400" : "bg-rose-400"
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 rounded-full bg-slate-100">
        <div className={`h-2 rounded-full ${colour}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm tabular-nums text-slate-600">{pct}%</span>
    </div>
  )
}

export default async function SquadCompositionReportPage() {
  const teams = await getTeamReportSquadComposition().catch(() => [])

  const totalPlayers = teams.reduce((s, t) => s + t.playerCount, 0)
  const totalCoaches = teams.reduce((s, t) => s + t.coachCount + t.managerCount, 0)
  const totalJuniors = teams.reduce((s, t) => s + t.juniorCount, 0)
  const totalGuests = teams.reduce((s, t) => s + t.guestCount, 0)

  const playerRows = [...teams]
    .sort((a, b) => b.playerCount - a.playerCount)
    .map((t) => ({ label: t.name, value: t.playerCount }))

  const profileRows = [...teams]
    .filter((t) => t.profileCompletionPct !== null)
    .sort((a, b) => (b.profileCompletionPct ?? 0) - (a.profileCompletionPct ?? 0))
    .map((t) => ({ label: t.name, value: t.profileCompletionPct ?? 0, valueFormatted: `${t.profileCompletionPct}%` }))

  const exportColumns = [
    { key: "name", header: "Team" },
    { key: "sport", header: "Sport" },
    { key: "season", header: "Season" },
    { key: "ageGroup", header: "Age Group" },
    { key: "playerCount", header: "Players" },
    { key: "coachCount", header: "Coaches" },
    { key: "managerCount", header: "Managers" },
    { key: "totalMembers", header: "Total Members" },
    { key: "juniorCount", header: "Juniors" },
    { key: "guestCount", header: "Guests" },
    { key: "withPosition", header: "With Position" },
    { key: "withShirtNumber", header: "With Shirt No." },
    { key: "withPhoto", header: "With Photo" },
    { key: "profileCompletionPct", header: "Profile Completion %" },
  ]

  return (
    <PortalLayout
      title="Squad Composition"
      description="Role split, junior/guest breakdown, and profile completeness per team."
    >
      <div className="space-y-6">

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: "Total players", value: totalPlayers },
            { label: "Coaches & managers", value: totalCoaches },
            { label: "Junior players", value: totalJuniors },
            { label: "Guest players", value: totalGuests },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-medium text-slate-500">{k.label}</div>
              <div className="mt-2 text-3xl font-bold text-slate-950">{k.value}</div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid gap-6 xl:grid-cols-2">
          {playerRows.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-slate-900">Players per team</h3>
              <HBarChart rows={playerRows} colour="#1857E0" />
            </div>
          )}
          {profileRows.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-slate-900">Profile completion by team</h3>
              <HBarChart rows={profileRows} colour="#10b981" />
            </div>
          )}
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-semibold text-slate-900">All teams ({teams.length})</h3>
            <ExportButton data={teams} filename="squad-composition.csv" columns={exportColumns} />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  {[
                    "Team", "Sport", "Season", "Players", "Coaches", "Managers",
                    "Juniors", "Guests", "Position Set", "Shirt No.", "Photos", "Profile %",
                  ].map((h) => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teams.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium text-slate-900">{t.name}</td>
                    <td className="px-4 py-2 capitalize text-slate-600">{t.sport}</td>
                    <td className="px-4 py-2 text-slate-600">{t.season ?? "—"}</td>
                    <td className="px-4 py-2 text-slate-700">{t.playerCount}</td>
                    <td className="px-4 py-2 text-slate-700">{t.coachCount}</td>
                    <td className="px-4 py-2 text-slate-700">{t.managerCount}</td>
                    <td className="px-4 py-2 text-slate-700">
                      {t.juniorCount > 0 ? (
                        <span className="text-sky-700 font-medium">{t.juniorCount}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-slate-700">
                      {t.guestCount > 0 ? (
                        <span className="text-amber-700 font-medium">{t.guestCount}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-slate-700">
                      {t.playerCount > 0 ? `${t.withPosition}/${t.playerCount}` : "—"}
                    </td>
                    <td className="px-4 py-2 text-slate-700">
                      {t.playerCount > 0 ? `${t.withShirtNumber}/${t.playerCount}` : "—"}
                    </td>
                    <td className="px-4 py-2 text-slate-700">
                      {t.totalMembers > 0 ? `${t.withPhoto}/${t.totalMembers}` : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <ProfileBar pct={t.profileCompletionPct} />
                    </td>
                  </tr>
                ))}
                {teams.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-4 py-8 text-center text-sm text-slate-400">
                      No teams found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </PortalLayout>
  )
}
