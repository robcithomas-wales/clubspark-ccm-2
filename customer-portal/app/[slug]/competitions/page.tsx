"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Trophy, Search, Filter, ChevronRight, Users, Calendar, Loader2 } from "lucide-react"
import { useOrg } from "@/lib/org-context"
import { fetchPublicCompetitions, type Competition } from "@/lib/api"
import { format, parseISO } from "date-fns"

const SPORT_LABELS: Record<string, string> = {
  tennis: "Tennis", padel: "Padel", squash: "Squash", badminton: "Badminton",
  football: "Football", hockey: "Hockey", netball: "Netball", cricket: "Cricket",
  basketball: "Basketball", rugby_union: "Rugby Union",
}

const FORMAT_LABELS: Record<string, string> = {
  LEAGUE: "League", KNOCKOUT: "Knockout", ROUND_ROBIN: "Round Robin",
  GROUP_KNOCKOUT: "Group + Knockout", SWISS: "Swiss", LADDER: "Ladder",
}

const STATUS_COLOURS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  REGISTRATION_OPEN: "bg-green-50 text-green-700",
  REGISTRATION_CLOSED: "bg-amber-50 text-amber-700",
  IN_PROGRESS: "bg-blue-50 text-blue-700",
  COMPLETED: "bg-slate-100 text-slate-500",
  CANCELLED: "bg-red-50 text-red-600",
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  REGISTRATION_OPEN: "Open for entries",
  REGISTRATION_CLOSED: "Registration closed",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
}

export default function CompetitionsPage() {
  const org = useOrg()
  const primary = org.primaryColour
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [sportFilter, setSportFilter] = useState("all")

  useEffect(() => {
    fetchPublicCompetitions(org.tenantId).then(data => {
      setCompetitions(data)
      setLoading(false)
    })
  }, [org.tenantId])

  const sports = Array.from(new Set(competitions.map(c => c.sport)))

  const filtered = competitions.filter(c => {
    const matchSport = sportFilter === "all" || c.sport === sportFilter
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase())
    return matchSport && matchSearch
  })

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="pt-20 pb-12" style={{ background: `linear-gradient(135deg, ${primary} 0%, ${primary}cc 100%)` }}>
        <div className="mx-auto max-w-4xl px-4 md:px-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-white">
            <Trophy size={12} fill="white" /> Competitions
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Competitions &amp; Leagues</h1>
          <p className="mt-1 text-white/70">Enter and follow competitions at {org.name}</p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search competitions…"
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
            />
          </div>
          {sports.length > 1 && (
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-400" />
              <select
                value={sportFilter}
                onChange={e => setSportFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
              >
                <option value="all">All sports</option>
                {sports.map(s => <option key={s} value={s}>{SPORT_LABELS[s] ?? s}</option>)}
              </select>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="animate-spin text-slate-400" size={28} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center shadow-sm">
            <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: primary + "18" }}>
              <Trophy size={24} style={{ color: primary }} />
            </div>
            <h2 className="text-lg font-bold text-slate-900">No competitions yet</h2>
            <p className="mt-1 text-sm text-slate-500">Check back soon for upcoming competitions and leagues.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(comp => (
              <Link
                key={comp.id}
                href={`/${org.slug}/competitions/${comp.id}`}
                className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLOURS[comp.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {STATUS_LABELS[comp.status] ?? comp.status}
                    </span>
                    <span className="text-xs text-slate-400">{SPORT_LABELS[comp.sport] ?? comp.sport} · {FORMAT_LABELS[comp.format] ?? comp.format}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 truncate">{comp.name}</h3>
                  {comp.description && (
                    <p className="mt-0.5 text-sm text-slate-500 line-clamp-1">{comp.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
                    {comp.startDate && (
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {format(parseISO(comp.startDate), "d MMM yyyy")}
                        {comp.endDate && ` – ${format(parseISO(comp.endDate), "d MMM yyyy")}`}
                      </span>
                    )}
                    {comp.maxEntries && (
                      <span className="flex items-center gap-1"><Users size={12} /> Max {comp.maxEntries}</span>
                    )}
                    {comp.entryFee && Number(comp.entryFee) > 0 && (
                      <span>£{Number(comp.entryFee).toFixed(2)} entry fee</span>
                    )}
                    {(!comp.entryFee || Number(comp.entryFee) === 0) && (
                      <span className="text-green-600 font-medium">Free entry</span>
                    )}
                  </div>
                </div>
                <ChevronRight size={18} className="ml-4 shrink-0 text-slate-400 transition group-hover:text-slate-600" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
