import { PortalLayout } from "@/components/portal-layout"
import { ExportButton } from "@/components/reports/export-button"
import { getTeamReportWebsiteReadiness } from "@/lib/api"

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        ok ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
      }`}
    >
      {label}
    </span>
  )
}

function PhotoBar({ pct }: { pct: number | null }) {
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

export default async function TeamWebsiteReadinessPage() {
  const teams = await getTeamReportWebsiteReadiness().catch(() => [])

  const publicCount = teams.filter((t) => t.isPublic).length
  const withFixturesUrl = teams.filter((t) => t.fixturesUrl).length
  const fullyReady = teams.filter(
    (t) => t.isPublic && t.fixturesUrl && (t.photoCompletionPct ?? 0) >= 75,
  ).length

  const exportColumns = [
    { key: "name", header: "Team" },
    { key: "sport", header: "Sport" },
    { key: "season", header: "Season" },
    { key: "ageGroup", header: "Age Group" },
    { key: "isPublic", header: "Public" },
    { key: "fixturesUrl", header: "Fixtures URL" },
    { key: "totalMembers", header: "Total Members" },
    { key: "membersWithPhoto", header: "Members with Photo" },
    { key: "photoCompletionPct", header: "Photo Completion %" },
    { key: "hasFixtures", header: "Has Fixtures" },
  ]

  return (
    <PortalLayout
      title="Team Website Readiness"
      description="Public visibility, fixtures links, photo completion and portal status per team."
    >
      <div className="space-y-6">

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: "Total teams", value: teams.length },
            { label: "Public on portal", value: publicCount },
            { label: "Fixtures URL set", value: withFixturesUrl },
            { label: "Fully ready", value: fullyReady },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-medium text-slate-500">{k.label}</div>
              <div className="mt-2 text-3xl font-bold text-slate-950">{k.value}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-semibold text-slate-900">All teams ({teams.length})</h3>
            <ExportButton data={teams} filename="team-website-readiness.csv" columns={exportColumns} />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  {["Team", "Sport", "Season", "Portal", "Fixtures URL", "Members", "Photo Completion", "Fixtures"].map((h) => (
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
                    <td className="px-4 py-2">
                      <StatusBadge ok={t.isPublic} label={t.isPublic ? "Public" : "Private"} />
                    </td>
                    <td className="px-4 py-2 max-w-[200px] truncate">
                      {t.fixturesUrl ? (
                        <a
                          href={t.fixturesUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {t.fixturesUrl}
                        </a>
                      ) : (
                        <span className="text-rose-500 text-xs">Not set</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-slate-700">
                      {t.membersWithPhoto}/{t.totalMembers}
                    </td>
                    <td className="px-4 py-2">
                      <PhotoBar pct={t.photoCompletionPct} />
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge ok={t.hasFixtures} label={t.hasFixtures ? "Yes" : "None"} />
                    </td>
                  </tr>
                ))}
                {teams.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-400">
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
