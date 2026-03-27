"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Trophy, ArrowLeft, Users, Calendar, TrendingUp, List, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import { useOrg } from "@/lib/org-context"
import {
  fetchPublicCompetition, fetchPublicStandings, fetchPublicMatches,
  type Competition, type Standing, type CompetitionMatch
} from "@/lib/api"
import { format, parseISO } from "date-fns"

const FORMAT_LABELS: Record<string, string> = {
  LEAGUE: "League", KNOCKOUT: "Knockout", ROUND_ROBIN: "Round Robin",
  GROUP_KNOCKOUT: "Group + Knockout", SWISS: "Swiss", LADDER: "Ladder",
}
const SPORT_LABELS: Record<string, string> = {
  tennis: "Tennis", padel: "Padel", squash: "Squash", badminton: "Badminton",
  football: "Football", hockey: "Hockey", netball: "Netball", cricket: "Cricket",
  basketball: "Basketball", rugby_union: "Rugby Union",
}
const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft", REGISTRATION_OPEN: "Open for entries",
  REGISTRATION_CLOSED: "Entries closed", IN_PROGRESS: "In progress",
  COMPLETED: "Completed", CANCELLED: "Cancelled",
}

function StandingsTable({ standings, primary }: { standings: Standing[]; primary: string }) {
  if (standings.length === 0) return (
    <div className="py-12 text-center text-sm text-slate-400">No standings yet — results will appear here once matches are played.</div>
  )
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
            <th className="pb-2 pr-4 text-left font-medium w-6">#</th>
            <th className="pb-2 pr-4 text-left font-medium">Player / Team</th>
            <th className="pb-2 px-2 text-center font-medium">P</th>
            <th className="pb-2 px-2 text-center font-medium">W</th>
            <th className="pb-2 px-2 text-center font-medium">D</th>
            <th className="pb-2 px-2 text-center font-medium">L</th>
            <th className="pb-2 px-2 text-center font-medium">+/-</th>
            <th className="pb-2 pl-2 text-center font-bold">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => (
            <tr key={s.entryId} className={`border-b border-slate-50 ${i === 0 ? "font-semibold" : ""}`}>
              <td className="py-2.5 pr-4 text-slate-500">{s.position}</td>
              <td className="py-2.5 pr-4 text-slate-900">{s.entry?.displayName ?? "—"}</td>
              <td className="py-2.5 px-2 text-center text-slate-600">{s.played}</td>
              <td className="py-2.5 px-2 text-center text-slate-600">{s.won}</td>
              <td className="py-2.5 px-2 text-center text-slate-600">{s.drawn}</td>
              <td className="py-2.5 px-2 text-center text-slate-600">{s.lost}</td>
              <td className={`py-2.5 px-2 text-center ${Number(s.pointsDifference) >= 0 ? "text-green-600" : "text-red-500"}`}>
                {Number(s.pointsDifference) > 0 ? "+" : ""}{s.pointsDifference}
              </td>
              <td className="py-2.5 pl-2 text-center font-bold" style={{ color: primary }}>{s.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FixturesList({ matches }: { matches: CompetitionMatch[] }) {
  const [expandedRound, setExpandedRound] = useState<number | null>(null)

  if (matches.length === 0) return (
    <div className="py-12 text-center text-sm text-slate-400">No fixtures yet — check back once the draw has been generated.</div>
  )

  const byRound = matches.reduce<Record<number, CompetitionMatch[]>>((acc, m) => {
    ;(acc[m.round] ??= []).push(m)
    return acc
  }, {})
  const rounds = Object.keys(byRound).map(Number).sort((a, b) => a - b)

  return (
    <div className="space-y-3">
      {rounds.map(round => {
        const roundMatches = byRound[round]!
        const isOpen = expandedRound === round || rounds.length === 1
        const completed = roundMatches.filter(m => m.status === "COMPLETED").length
        return (
          <div key={round} className="rounded-xl border border-slate-200 overflow-hidden">
            <button
              onClick={() => setExpandedRound(isOpen ? null : round)}
              className="flex w-full items-center justify-between px-4 py-3 bg-slate-50 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              <span>Round {round}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">{completed}/{roundMatches.length} played</span>
                {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </button>
            {isOpen && (
              <div className="divide-y divide-slate-100">
                {roundMatches.map(m => (
                  <div key={m.id} className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className={`flex-1 text-right pr-3 ${m.winnerId === m.homeEntryId ? "font-bold text-slate-900" : "text-slate-600"}`}>
                      {m.homeEntry?.displayName ?? "TBD"}
                    </span>
                    <div className="shrink-0 text-center w-24">
                      {m.score ? (
                        <span className="font-mono font-bold text-slate-900">{m.score.home} – {m.score.away}</span>
                      ) : (
                        <span className="text-xs text-slate-400 uppercase tracking-wide">{m.status === "COMPLETED" ? "—" : "vs"}</span>
                      )}
                    </div>
                    <span className={`flex-1 text-left pl-3 ${m.winnerId === m.awayEntryId ? "font-bold text-slate-900" : "text-slate-600"}`}>
                      {m.awayEntry?.displayName ?? "TBD"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function CompetitionDetailPage() {
  const org = useOrg()
  const { id } = useParams<{ slug: string; id: string }>()
  const primary = org.primaryColour

  const [comp, setComp] = useState<Competition | null>(null)
  const [standings, setStandings] = useState<Standing[]>([])
  const [matches, setMatches] = useState<CompetitionMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"info" | "standings" | "fixtures">("info")
  const [activeDivisionId, setActiveDivisionId] = useState<string | null>(null)

  useEffect(() => {
    fetchPublicCompetition(org.tenantId, id).then(async c => {
      if (!c) { setLoading(false); return }
      setComp(c)
      const divId = c.divisions?.[0]?.id ?? null
      setActiveDivisionId(divId)
      if (divId) {
        const [s, m] = await Promise.all([
          fetchPublicStandings(org.tenantId, id, divId),
          fetchPublicMatches(org.tenantId, id, divId),
        ])
        setStandings(s)
        setMatches(m)
      }
      setLoading(false)
    })
  }, [org.tenantId, id])

  async function switchDivision(divId: string) {
    setActiveDivisionId(divId)
    const [s, m] = await Promise.all([
      fetchPublicStandings(org.tenantId, id, divId),
      fetchPublicMatches(org.tenantId, id, divId),
    ])
    setStandings(s)
    setMatches(m)
  }

  const isLeague = comp?.format === "LEAGUE" || comp?.format === "ROUND_ROBIN"
  const canEnter = comp?.status === "REGISTRATION_OPEN"

  const tabs = [
    { key: "info" as const, label: "Overview" },
    ...(isLeague ? [{ key: "standings" as const, label: "Standings" }] : []),
    { key: "fixtures" as const, label: "Fixtures" },
  ]

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="animate-spin text-slate-400" size={28} />
    </div>
  )

  if (!comp) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <p className="text-slate-500">Competition not found.</p>
        <Link href={`/${org.slug}/competitions`} className="mt-4 inline-block text-sm font-medium" style={{ color: primary }}>← Back to competitions</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="pt-20 pb-10" style={{ background: `linear-gradient(135deg, ${primary} 0%, ${primary}cc 100%)` }}>
        <div className="mx-auto max-w-3xl px-4 md:px-8">
          <Link href={`/${org.slug}/competitions`} className="mb-4 inline-flex items-center gap-1 text-sm text-white/70 hover:text-white transition">
            <ArrowLeft size={14} /> All competitions
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-white/20 text-white">
                  {STATUS_LABELS[comp.status] ?? comp.status}
                </span>
                <span className="text-xs text-white/60">{SPORT_LABELS[comp.sport] ?? comp.sport} · {FORMAT_LABELS[comp.format] ?? comp.format}</span>
              </div>
              <h1 className="text-2xl font-extrabold text-white">{comp.name}</h1>
              {comp.season && <p className="mt-1 text-sm text-white/70">{comp.season}</p>}
            </div>
            {canEnter && (
              <Link
                href={`/${org.slug}/competitions/${id}/enter`}
                className="shrink-0 rounded-xl bg-white px-5 py-2.5 text-sm font-bold shadow transition hover:shadow-md"
                style={{ color: primary }}
              >
                Enter now
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 md:px-8 py-6">
        {/* Division selector */}
        {comp.divisions.length > 1 && (
          <div className="mb-5 flex flex-wrap gap-2">
            {comp.divisions.map(d => (
              <button
                key={d.id}
                onClick={() => switchDivision(d.id)}
                className={`rounded-xl border px-4 py-1.5 text-sm font-medium transition ${activeDivisionId === d.id ? "border-transparent text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
                style={activeDivisionId === d.id ? { backgroundColor: primary, borderColor: primary } : {}}
              >
                {d.name}
              </button>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm w-fit">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${tab === t.key ? "text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
              style={tab === t.key ? { backgroundColor: primary } : {}}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {tab === "info" && (
            <div className="space-y-6">
              {comp.description && <p className="text-slate-600 leading-relaxed">{comp.description}</p>}
              <div className="grid gap-4 sm:grid-cols-2">
                {comp.startDate && (
                  <div className="flex items-start gap-3">
                    <Calendar size={16} className="mt-0.5 shrink-0 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Dates</p>
                      <p className="text-sm text-slate-700">{format(parseISO(comp.startDate), "d MMM yyyy")}{comp.endDate ? ` – ${format(parseISO(comp.endDate), "d MMM yyyy")}` : ""}</p>
                    </div>
                  </div>
                )}
                {comp.registrationOpensAt && (
                  <div className="flex items-start gap-3">
                    <Calendar size={16} className="mt-0.5 shrink-0 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Registration</p>
                      <p className="text-sm text-slate-700">{format(parseISO(comp.registrationOpensAt), "d MMM yyyy")}{comp.registrationClosesAt ? ` – ${format(parseISO(comp.registrationClosesAt), "d MMM yyyy")}` : ""}</p>
                    </div>
                  </div>
                )}
                {comp.maxEntries && (
                  <div className="flex items-start gap-3">
                    <Users size={16} className="mt-0.5 shrink-0 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Max entries</p>
                      <p className="text-sm text-slate-700">{comp.maxEntries}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <TrendingUp size={16} className="mt-0.5 shrink-0 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Entry fee</p>
                    <p className="text-sm text-slate-700">{comp.entryFee && Number(comp.entryFee) > 0 ? `£${Number(comp.entryFee).toFixed(2)}` : "Free"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <List size={16} className="mt-0.5 shrink-0 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Format</p>
                    <p className="text-sm text-slate-700">{FORMAT_LABELS[comp.format] ?? comp.format} · {comp.entryType.replace(/_/g, " ").toLowerCase()}</p>
                  </div>
                </div>
              </div>
              {canEnter && (
                <div className="pt-4 border-t border-slate-100">
                  <Link
                    href={`/${org.slug}/competitions/${id}/enter`}
                    className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow transition hover:shadow-md"
                    style={{ backgroundColor: primary }}
                  >
                    <Trophy size={15} /> Enter this competition
                  </Link>
                </div>
              )}
            </div>
          )}
          {tab === "standings" && <StandingsTable standings={standings} primary={primary} />}
          {tab === "fixtures" && <FixturesList matches={matches} />}
        </div>
      </div>
    </div>
  )
}
