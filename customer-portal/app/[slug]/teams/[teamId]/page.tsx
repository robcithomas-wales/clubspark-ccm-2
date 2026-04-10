"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { use } from "react"
import {
  ArrowLeft, ExternalLink, Users, User, Briefcase, Calendar,
  MapPin, Loader2, ChevronRight,
} from "lucide-react"
import { useOrg } from "@/lib/org-context"
import {
  fetchPublicTeam, fetchPublicSponsors,
  type PublicTeamDetail, type PublicMember, type PublicFixture, type Sponsor,
} from "@/lib/api"
import { format, parseISO, isFuture } from "date-fns"

const SPORT_ICONS: Record<string, string> = {
  football: "⚽", cricket: "🏏", rugby: "🏉", hockey: "🏑",
  netball: "🏐", basketball: "🏀", tennis: "🎾", other: "🏆",
}

const FIXTURE_STATUS_COLOURS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-500",
  scheduled: "bg-blue-50 text-blue-700",
  squad_selected: "bg-indigo-50 text-indigo-700",
  fees_requested: "bg-amber-50 text-amber-700",
  completed: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-600",
}

const FIXTURE_STATUS_LABELS: Record<string, string> = {
  draft: "TBC", scheduled: "Scheduled", squad_selected: "Squad selected",
  fees_requested: "Fees requested", completed: "Result", cancelled: "Cancelled",
}

function MemberCard({ member, primary }: { member: PublicMember; primary: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-sm">
      {member.photoUrl ? (
        <img
          src={member.photoUrl}
          alt={member.displayName}
          className="mb-3 h-20 w-20 rounded-full object-cover border-2 border-white shadow"
        />
      ) : (
        <div
          className="mb-3 flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white shadow"
          style={{ backgroundColor: primary }}
        >
          {member.displayName.charAt(0).toUpperCase()}
        </div>
      )}
      {member.shirtNumber != null && (
        <span
          className="mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: primary }}
        >
          {member.shirtNumber}
        </span>
      )}
      <p className="text-sm font-bold text-slate-900 leading-snug">{member.displayName}</p>
      {member.position && (
        <p className="mt-0.5 text-xs text-slate-500">{member.position}</p>
      )}
    </div>
  )
}

function FixtureRow({ fixture }: { fixture: PublicFixture }) {
  const kickoff = parseISO(fixture.kickoffAt)
  const isUpcoming = isFuture(kickoff)
  const hasResult = fixture.homeScore != null && fixture.awayScore != null

  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
      {/* Date */}
      <div className="w-14 shrink-0 text-center">
        <p className="text-xs font-bold uppercase text-slate-400">{format(kickoff, "MMM")}</p>
        <p className="text-2xl font-extrabold leading-none text-slate-900">{format(kickoff, "d")}</p>
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${FIXTURE_STATUS_COLOURS[fixture.status] ?? "bg-slate-100 text-slate-500"}`}>
            {FIXTURE_STATUS_LABELS[fixture.status] ?? fixture.status}
          </span>
          {fixture.matchType && (
            <span className="text-xs text-slate-400">{fixture.matchType}</span>
          )}
        </div>
        <p className="text-sm font-semibold text-slate-900 truncate">
          {fixture.homeAway === "home" ? "vs" : "@"} {fixture.opponent}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span>{format(kickoff, "HH:mm")}</span>
          {fixture.venue && (
            <span className="flex items-center gap-1"><MapPin size={10} />{fixture.venue}</span>
          )}
        </div>
      </div>

      {/* Score or H/A */}
      <div className="shrink-0 text-right">
        {hasResult ? (
          <p className="text-lg font-extrabold text-slate-900">
            {fixture.homeScore} – {fixture.awayScore}
          </p>
        ) : (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500 uppercase">
            {fixture.homeAway}
          </span>
        )}
      </div>
    </div>
  )
}

function SponsorCarousel({ sponsors, primary }: { sponsors: Sponsor[]; primary: string }) {
  if (sponsors.length === 0) return null

  return (
    <div className="mt-16 border-t border-slate-200 pt-10">
      <h2 className="mb-6 text-center text-sm font-semibold uppercase tracking-widest text-slate-400">
        Our Partners
      </h2>
      <div className="flex flex-wrap items-center justify-center gap-6">
        {sponsors.map(sponsor => (
          sponsor.websiteUrl ? (
            <a
              key={sponsor.id}
              href={sponsor.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md hover:-translate-y-0.5"
              style={{ minWidth: 120, maxWidth: 160 }}
              title={sponsor.name}
            >
              <img src={sponsor.logoUrl} alt={sponsor.name} className="max-h-12 w-auto object-contain" />
            </a>
          ) : (
            <div
              key={sponsor.id}
              className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              style={{ minWidth: 120, maxWidth: 160 }}
              title={sponsor.name}
            >
              <img src={sponsor.logoUrl} alt={sponsor.name} className="max-h-12 w-auto object-contain" />
            </div>
          )
        ))}
      </div>
    </div>
  )
}

export default function TeamDetailPage({ params }: { params: Promise<{ slug: string; teamId: string }> }) {
  const { teamId } = use(params)
  const org = useOrg()
  const primary = org.primaryColour

  const [team, setTeam] = useState<PublicTeamDetail | null>(null)
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetchPublicTeam(org.tenantId, teamId),
      fetchPublicSponsors(org.tenantId),
    ]).then(([teamData, sponsorData]) => {
      setTeam(teamData)
      setSponsors(sponsorData)
      setLoading(false)
    })
  }, [org.tenantId, teamId])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={28} />
      </div>
    )
  }

  if (!team) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-slate-500">Team not found.</p>
        <Link href={`/${org.slug}/teams`} className="text-sm font-semibold" style={{ color: primary }}>
          ← Back to teams
        </Link>
      </div>
    )
  }

  const players = team.members.filter(m => m.role === "player")
  const coaches = team.members.filter(m => m.role === "coach" || m.role === "manager")
  const upcomingFixtures = team.fixtures.filter(f => isFuture(parseISO(f.kickoffAt)) && f.status !== "cancelled")
  const recentResults = team.fixtures.filter(f => !isFuture(parseISO(f.kickoffAt)) && f.homeScore != null).slice(0, 5)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="pt-20 pb-12" style={{ background: `linear-gradient(135deg, ${primary} 0%, ${primary}cc 100%)` }}>
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          <Link
            href={`/${org.slug}/teams`}
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-white/70 transition hover:text-white"
          >
            <ArrowLeft size={14} /> All teams
          </Link>

          <div className="flex items-center gap-4">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl shadow-lg"
              style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
            >
              {SPORT_ICONS[team.sport] ?? "🏆"}
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">{team.name}</h1>
              <div className="mt-1 flex flex-wrap gap-2">
                {team.ageGroup && <span className="text-sm text-white/70">{team.ageGroup}</span>}
                {team.ageGroup && team.gender && <span className="text-white/40">·</span>}
                {team.gender && <span className="text-sm capitalize text-white/70">{team.gender}</span>}
                {team.season && <span className="text-white/40">·</span>}
                {team.season && <span className="text-sm text-white/70">{team.season}</span>}
              </div>
            </div>
          </div>

          {/* Fixtures CTA */}
          {team.fixturesUrl && (
            <a
              href={team.fixturesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              <Calendar size={15} />
              View full fixture list
              <ExternalLink size={13} />
            </a>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10 md:px-8 space-y-12">

        {/* ── Coaching Staff ── */}
        {coaches.length > 0 && (
          <section>
            <div className="mb-5 flex items-center gap-3">
              <Briefcase size={18} style={{ color: primary }} />
              <h2 className="text-xl font-bold text-slate-900">Coaching Staff</h2>
            </div>
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {coaches.map(m => <MemberCard key={m.id} member={m} primary={primary} />)}
            </div>
          </section>
        )}

        {/* ── Squad ── */}
        {players.length > 0 && (
          <section>
            <div className="mb-5 flex items-center gap-3">
              <Users size={18} style={{ color: primary }} />
              <h2 className="text-xl font-bold text-slate-900">
                Squad <span className="text-base font-normal text-slate-400">({players.length})</span>
              </h2>
            </div>
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {players.map(m => <MemberCard key={m.id} member={m} primary={primary} />)}
            </div>
          </section>
        )}

        {/* ── Upcoming Fixtures ── */}
        {upcomingFixtures.length > 0 && (
          <section>
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar size={18} style={{ color: primary }} />
                <h2 className="text-xl font-bold text-slate-900">Upcoming Fixtures</h2>
              </div>
              {team.fixturesUrl && (
                <a
                  href={team.fixturesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm font-semibold transition hover:opacity-70"
                  style={{ color: primary }}
                >
                  Full list <ExternalLink size={13} />
                </a>
              )}
            </div>
            <div className="space-y-3">
              {upcomingFixtures.map(f => <FixtureRow key={f.id} fixture={f} />)}
            </div>
          </section>
        )}

        {/* ── Recent Results ── */}
        {recentResults.length > 0 && (
          <section>
            <div className="mb-5 flex items-center gap-3">
              <ChevronRight size={18} style={{ color: primary }} />
              <h2 className="text-xl font-bold text-slate-900">Recent Results</h2>
            </div>
            <div className="space-y-3">
              {recentResults.map(f => <FixtureRow key={f.id} fixture={f} />)}
            </div>
          </section>
        )}

        {/* ── Empty state ── */}
        {players.length === 0 && coaches.length === 0 && upcomingFixtures.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center shadow-sm">
            <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: primary + "18" }}>
              <User size={24} style={{ color: primary }} />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Squad coming soon</h2>
            <p className="mt-1 text-sm text-slate-500">Player profiles and fixtures will appear here once they're added.</p>
          </div>
        )}

        {/* ── Sponsors ── */}
        <SponsorCarousel sponsors={sponsors} primary={primary} />
      </div>
    </div>
  )
}
