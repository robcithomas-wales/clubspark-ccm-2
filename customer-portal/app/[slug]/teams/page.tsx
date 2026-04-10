"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Users, ChevronRight, Loader2, ExternalLink } from "lucide-react"
import { useOrg } from "@/lib/org-context"
import { fetchPublicTeams, type PublicTeam } from "@/lib/api"

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

const SPORT_ICONS: Record<string, string> = {
  football: "⚽",
  cricket: "🏏",
  rugby: "🏉",
  hockey: "🏑",
  netball: "🏐",
  basketball: "🏀",
  tennis: "🎾",
  other: "🏆",
}

function groupBySport(teams: PublicTeam[]): Record<string, PublicTeam[]> {
  return teams.reduce<Record<string, PublicTeam[]>>((acc, t) => {
    const key = t.sport
    if (!acc[key]) acc[key] = []
    acc[key].push(t)
    return acc
  }, {})
}

export default function TeamsPage() {
  const org = useOrg()
  const primary = org.primaryColour
  const [teams, setTeams] = useState<PublicTeam[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPublicTeams(org.tenantId).then(data => {
      setTeams(data)
      setLoading(false)
    })
  }, [org.tenantId])

  const grouped = groupBySport(teams)
  const sports = Object.keys(grouped)
  const singleSport = sports.length === 1

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="pt-20 pb-12" style={{ background: `linear-gradient(135deg, ${primary} 0%, ${primary}cc 100%)` }}>
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-white">
            <Users size={12} /> Teams
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Our Teams</h1>
          <p className="mt-1 text-white/70">Meet the squads at {org.name}</p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10 md:px-8">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="animate-spin text-slate-400" size={28} />
          </div>
        ) : teams.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center shadow-sm">
            <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: primary + "18" }}>
              <Users size={24} style={{ color: primary }} />
            </div>
            <h2 className="text-lg font-bold text-slate-900">No teams yet</h2>
            <p className="mt-1 text-sm text-slate-500">Check back soon — teams will appear here once they've been added.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {sports.map(sport => (
              <div key={sport}>
                {!singleSport && (
                  <div className="mb-4 flex items-center gap-3">
                    <span className="text-2xl">{SPORT_ICONS[sport] ?? "🏆"}</span>
                    <h2 className="text-xl font-bold text-slate-900">{SPORT_LABELS[sport] ?? sport}</h2>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {grouped[sport].map(team => (
                    <Link
                      key={team.id}
                      href={`/${org.slug}/teams/${team.id}`}
                      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      {/* Sport colour bar */}
                      <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: primary }} />

                      <div className="mb-4 flex items-start justify-between">
                        <div
                          className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
                          style={{ backgroundColor: primary + "15" }}
                        >
                          {SPORT_ICONS[team.sport] ?? "🏆"}
                        </div>
                        <ChevronRight size={16} className="mt-1 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-600" />
                      </div>

                      <h3 className="text-base font-bold text-slate-900 leading-snug">{team.name}</h3>

                      <div className="mt-1 flex flex-wrap gap-2">
                        {team.ageGroup && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                            {team.ageGroup}
                          </span>
                        )}
                        {team.gender && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 capitalize">
                            {team.gender}
                          </span>
                        )}
                        {team.season && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                            {team.season}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-sm text-slate-500">
                          <Users size={13} />
                          {team._count.members} {team._count.members === 1 ? "player" : "players"}
                        </span>
                        {team.fixturesUrl && (
                          <span
                            className="flex items-center gap-1 text-xs font-semibold"
                            style={{ color: primary }}
                            onClick={e => { e.preventDefault(); window.open(team.fixturesUrl!, "_blank", "noopener") }}
                          >
                            Fixtures <ExternalLink size={11} />
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
