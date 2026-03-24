"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  CalendarDays,
  Users,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Shield,
  CreditCard,
  Send,
} from "lucide-react"
import { PortalLayout } from "@/components/portal-layout"

type AvailabilityEntry = {
  teamMemberId: string
  response: string
  notes?: string
  respondedAt?: string
  teamMember: { displayName: string; shirtNumber?: number; position?: string }
}

type AvailabilitySummary = {
  available: number
  unavailable: number
  maybe: number
  no_response: number
  total: number
}

type SelectionEntry = {
  teamMemberId: string
  role: string
  position?: string
  shirtNumber?: number
  publishedAt?: string
  teamMember: { displayName: string }
}

type SelectionSummary = {
  starters: number
  substitutes: number
  reserves: number
  isPublished: boolean
}

type ChargeRun = {
  id: string
  status: string
  notes?: string
  createdAt: string
  charges: Array<{
    id: string
    amount: string
    status: string
    teamMember: { displayName: string }
  }>
}

type Fixture = {
  id: string
  opponent: string
  homeAway: string
  venue?: string
  kickoffAt: string
  meetTime?: string
  durationMinutes?: number
  matchType?: string
  status: string
  notes?: string
}

const RESPONSE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  available:   { label: "Available",   icon: <CheckCircle2 className="h-4 w-4" />, color: "text-green-600" },
  unavailable: { label: "Unavailable", icon: <XCircle className="h-4 w-4" />,      color: "text-red-500" },
  maybe:       { label: "Maybe",       icon: <HelpCircle className="h-4 w-4" />,   color: "text-amber-500" },
  no_response: { label: "No response", icon: <Clock className="h-4 w-4" />,        color: "text-slate-400" },
}

const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-amber-50 text-amber-700",
  completed: "bg-green-50 text-green-700",
  failed:    "bg-red-50 text-red-700",
  paid:      "bg-green-50 text-green-700",
  waived:    "bg-slate-100 text-slate-500",
}

type Tab = "availability" | "selection" | "charges"

export default function FixtureDetailPage() {
  const { id: teamId, fixtureId } = useParams<{ id: string; fixtureId: string }>()

  const [tab, setTab] = useState<Tab>("availability")
  const [fixture, setFixture] = useState<Fixture | null>(null)
  const [availability, setAvailability] = useState<AvailabilityEntry[]>([])
  const [availSummary, setAvailSummary] = useState<AvailabilitySummary | null>(null)
  const [selection, setSelection] = useState<SelectionEntry[]>([])
  const [selectionSummary, setSelectionSummary] = useState<SelectionSummary | null>(null)
  const [chargeRuns, setChargeRuns] = useState<ChargeRun[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [fixRes, availRes, selRes, chargeRes] = await Promise.all([
        fetch(`/api/teams/${teamId}/fixtures/${fixtureId}`),
        fetch(`/api/teams/${teamId}/fixtures/${fixtureId}/availability`),
        fetch(`/api/teams/${teamId}/fixtures/${fixtureId}/selection`),
        fetch(`/api/teams/${teamId}/fixtures/${fixtureId}/charge-runs`),
      ])

      if (fixRes.ok) {
        const j = await fixRes.json()
        setFixture(j.data)
      }
      if (availRes.ok) {
        const j = await availRes.json()
        setAvailability(j.data ?? [])
        setAvailSummary(j.summary ?? null)
      }
      if (selRes.ok) {
        const j = await selRes.json()
        setSelection(j.data ?? [])
        setSelectionSummary(j.summary ?? null)
      }
      if (chargeRes.ok) {
        const j = await chargeRes.json()
        setChargeRuns(j.data ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [teamId, fixtureId])

  useEffect(() => { loadData() }, [loadData])

  async function requestAvailability() {
    setActionLoading(true)
    await fetch(`/api/teams/${teamId}/fixtures/${fixtureId}/availability/request`, { method: "POST" })
    await loadData()
    setActionLoading(false)
  }

  async function publishSelection() {
    setActionLoading(true)
    await fetch(`/api/teams/${teamId}/fixtures/${fixtureId}/selection/publish`, { method: "POST" })
    await loadData()
    setActionLoading(false)
  }

  async function initiateChargeRun() {
    setActionLoading(true)
    await fetch(`/api/teams/${teamId}/fixtures/${fixtureId}/charge-runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    await loadData()
    setActionLoading(false)
  }

  if (loading) {
    return (
      <PortalLayout title="" description="">
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      </PortalLayout>
    )
  }

  if (!fixture) {
    return (
      <PortalLayout title="Fixture not found" description="">
        <div className="flex flex-col items-center gap-3 py-16">
          <p className="text-sm font-medium text-slate-500">Fixture not found.</p>
          <Link href={`/teams/${teamId}`} className="text-sm text-blue-600 hover:underline">
            Back to team
          </Link>
        </div>
      </PortalLayout>
    )
  }

  const kickoff = new Date(fixture.kickoffAt)

  return (
    <PortalLayout
      title={`${fixture.homeAway === "home" ? "vs" : "@"} ${fixture.opponent}`}
      description={kickoff.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
    >
      <div className="space-y-6">
        {/* Back link */}
        <Link
          href={`/teams/${teamId}`}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to team
        </Link>

        {/* Fixture header */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <CalendarDays className="h-4 w-4" />
                  {kickoff.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  {" at "}
                  {kickoff.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </div>
                <h1 className="mt-1 text-2xl font-bold text-slate-900">
                  {fixture.homeAway === "home" ? "vs" : "@"} {fixture.opponent}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                  {fixture.venue && <span>{fixture.venue}</span>}
                  {fixture.matchType && <span className="capitalize">{fixture.matchType}</span>}
                  {fixture.durationMinutes && <span>{fixture.durationMinutes} min</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                  fixture.status === "completed" ? "bg-green-50 text-green-700" :
                  fixture.status === "cancelled" ? "bg-red-50 text-red-700" :
                  fixture.status === "squad_selected" ? "bg-indigo-50 text-indigo-700" :
                  fixture.status === "fees_requested" ? "bg-amber-50 text-amber-700" :
                  "bg-blue-50 text-blue-700"
                }`}>
                  {fixture.status.replace("_", " ")}
                </span>
              </div>
            </div>
          </div>

          {/* Summary pills */}
          <div className="flex flex-wrap gap-4 px-6 py-4">
            {availSummary && (
              <>
                <div className="flex items-center gap-1.5 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" /> {availSummary.available} available
                </div>
                <div className="flex items-center gap-1.5 text-sm text-red-500">
                  <XCircle className="h-4 w-4" /> {availSummary.unavailable} unavailable
                </div>
                <div className="flex items-center gap-1.5 text-sm text-amber-500">
                  <HelpCircle className="h-4 w-4" /> {availSummary.maybe} maybe
                </div>
                <div className="flex items-center gap-1.5 text-sm text-slate-400">
                  <Clock className="h-4 w-4" /> {availSummary.no_response} no response
                </div>
              </>
            )}
            {selectionSummary && selectionSummary.starters > 0 && (
              <div className="ml-auto flex items-center gap-1.5 text-sm text-indigo-600">
                <Shield className="h-4 w-4" />
                {selectionSummary.starters} starters · {selectionSummary.substitutes} subs
                {selectionSummary.isPublished && (
                  <span className="ml-1 rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">Published</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {(["availability", "selection", "charges"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                tab === t
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === "charges" && chargeRuns.length > 0 && (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${tab === t ? "bg-blue-500" : "bg-slate-100 text-slate-600"}`}>
                  {chargeRuns.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Availability tab */}
        {tab === "availability" && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-900">Availability responses</h2>
              <button
                onClick={requestAvailability}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                Request availability
              </button>
            </div>
            {availability.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <Users className="h-10 w-10 text-slate-300" />
                <p className="text-sm text-slate-500">No responses yet. Send an availability request to all players.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {availability.map((a) => {
                  const cfg = RESPONSE_CONFIG[a.response] ?? RESPONSE_CONFIG.no_response
                  return (
                    <li key={a.teamMemberId} className="flex items-center gap-4 px-6 py-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                        {a.teamMember.shirtNumber ?? "—"}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{a.teamMember.displayName}</p>
                        {a.teamMember.position && (
                          <p className="text-xs text-slate-400">{a.teamMember.position}</p>
                        )}
                      </div>
                      <div className={`flex items-center gap-1.5 text-sm font-medium ${cfg.color}`}>
                        {cfg.icon}
                        {cfg.label}
                      </div>
                      {a.notes && (
                        <p className="hidden text-xs text-slate-400 md:block">{a.notes}</p>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )}

        {/* Selection tab */}
        {tab === "selection" && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Squad selection</h2>
                {selectionSummary && (
                  <p className="mt-0.5 text-sm text-slate-500">
                    {selectionSummary.starters} starters · {selectionSummary.substitutes} subs · {selectionSummary.reserves} reserves
                  </p>
                )}
              </div>
              {selectionSummary && !selectionSummary.isPublished && selectionSummary.starters > 0 && (
                <button
                  onClick={publishSelection}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-semibold !text-white shadow-sm transition hover:bg-[#1832A8] disabled:opacity-50"
                >
                  <Send className="h-4 w-4 !text-white" />
                  Publish selection
                </button>
              )}
            </div>
            {selection.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <Shield className="h-10 w-10 text-slate-300" />
                <p className="text-sm text-slate-500">No selection set yet.</p>
              </div>
            ) : (
              <>
                {["starter", "substitute", "reserve"].map((role) => {
                  const group = selection.filter((s) => s.role === role)
                  if (group.length === 0) return null
                  return (
                    <div key={role}>
                      <div className="border-b border-slate-100 bg-slate-50 px-6 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        {role === "starter" ? "Starters" : role === "substitute" ? "Substitutes" : "Reserves"}
                      </div>
                      <ul className="divide-y divide-slate-100">
                        {group.map((s) => (
                          <li key={s.teamMemberId} className="flex items-center gap-4 px-6 py-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                              {s.shirtNumber ?? "—"}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-900">{s.teamMember.displayName}</p>
                              {s.position && <p className="text-xs text-slate-400">{s.position}</p>}
                            </div>
                            {s.publishedAt && (
                              <span className="text-xs text-green-600">Published</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </>
            )}
          </section>
        )}

        {/* Charges tab */}
        {tab === "charges" && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-900">Charge runs</h2>
              {fixture.status !== "cancelled" && (
                <button
                  onClick={initiateChargeRun}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-semibold !text-white shadow-sm transition hover:bg-[#1832A8] disabled:opacity-50"
                >
                  <CreditCard className="h-4 w-4 !text-white" />
                  Charge fees
                </button>
              )}
            </div>
            {chargeRuns.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <CreditCard className="h-10 w-10 text-slate-300" />
                <p className="text-sm text-slate-500">
                  No charges yet. Set a squad selection then click "Charge fees" to collect match fees.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {chargeRuns.map((run) => {
                  const total = run.charges.reduce((sum, c) => sum + Number(c.amount), 0)
                  const paid = run.charges.filter((c) => c.status === "paid").length
                  return (
                    <div key={run.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            Charge run · {run.charges.length} player{run.charges.length !== 1 ? "s" : ""}
                          </p>
                          <p className="text-xs text-slate-400">
                            {new Date(run.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                            {run.notes ? ` · ${run.notes}` : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900">£{total.toFixed(2)}</p>
                          <p className="text-xs text-slate-400">{paid}/{run.charges.length} paid</p>
                        </div>
                      </div>
                      <ul className="mt-3 divide-y divide-slate-50 rounded-xl border border-slate-100">
                        {run.charges.map((charge) => (
                          <li key={charge.id} className="flex items-center justify-between px-4 py-2.5">
                            <span className="text-sm text-slate-700">{charge.teamMember.displayName}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-900">£{Number(charge.amount).toFixed(2)}</span>
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[charge.status] ?? "bg-slate-100 text-slate-600"}`}>
                                {charge.status}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </PortalLayout>
  )
}
