"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Star, BadgeCheck, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { fetchMembershipPlans, fetchMyMembership, joinMembership, type MembershipPlan, type Membership } from "@/lib/api"
import { useOrg } from "@/lib/org-context"
import { format, parseISO } from "date-fns"

export default function MembershipsPage() {
  const org = useOrg()
  const router = useRouter()
  const primary = org.primaryColour

  const [user, setUser] = useState<any>(null)
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [currentMembership, setCurrentMembership] = useState<Membership | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState<string | null>(null) // planId being joined
  const [joined, setJoined] = useState<Membership | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (!data.user) { router.push(`/${org.slug}/login`); return }
      setUser(data.user)
      Promise.all([
        fetchMembershipPlans(org.tenantId, org.id),
        fetchMyMembership(org.tenantId, data.user.id),
      ]).then(([p, m]) => {
        setPlans(p)
        setCurrentMembership(m)
      }).finally(() => setLoading(false))
    })
  }, [org.tenantId, org.slug, router])

  async function handleJoin(plan: MembershipPlan) {
    if (!user) return
    setJoining(plan.id)
    setError("")
    try {
      const m = await joinMembership(org.tenantId, plan.id, user.id)
      setJoined(m)
      setCurrentMembership(m)
    } catch (e: any) {
      setError(e.message ?? "Something went wrong")
    } finally {
      setJoining(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="pt-24 pb-16 text-center" style={{ background: `linear-gradient(135deg, ${primary} 0%, ${primary}cc 100%)` }}>
        <div className="mx-auto max-w-2xl px-4">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-white">
            <Star size={12} fill="white" /> Membership
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">
            Join the club
          </h1>
          <p className="mt-4 text-lg text-white/70">
            Unlock priority booking, exclusive rates and member-only benefits.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-24 md:px-8 -mt-8">

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200" style={{ borderTopColor: primary }} />
          </div>

        ) : joined ? (
          /* ── Success state ── */
          <div className="rounded-3xl bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full" style={{ backgroundColor: primary + "18" }}>
              <BadgeCheck size={44} style={{ color: primary }} />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">You're now a member!</h2>
            <p className="mt-2 text-slate-500">Welcome to the club. Your membership is active from today.</p>
            <div className="mx-auto mt-6 max-w-xs rounded-2xl border border-slate-100 p-5 text-left">
              <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">Your plan</div>
              <div className="mt-1 text-lg font-bold text-slate-900">{joined.planName}</div>
              <div className="mt-1 text-sm text-slate-500">Active from {format(parseISO(joined.startDate), "d MMMM yyyy")}</div>
            </div>
            <button
              onClick={() => router.push(`/${org.slug}/account`)}
              className="mt-8 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white shadow transition hover:-translate-y-0.5"
              style={{ backgroundColor: primary }}
            >
              View my account
            </button>
          </div>

        ) : currentMembership ? (
          /* ── Already a member ── */
          <div className="rounded-3xl bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full" style={{ backgroundColor: primary + "18" }}>
              <BadgeCheck size={44} style={{ color: primary }} />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">You're already a member</h2>
            <div className="mx-auto mt-6 max-w-xs rounded-2xl border border-slate-100 p-5 text-left">
              <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">Active plan</div>
              <div className="mt-1 text-lg font-bold text-slate-900">{currentMembership.planName}</div>
              <div className="mt-1 text-sm text-slate-500">
                Active from {format(parseISO(currentMembership.startDate), "d MMMM yyyy")}
                {currentMembership.endDate && ` · Expires ${format(parseISO(currentMembership.endDate), "d MMMM yyyy")}`}
              </div>
            </div>
            <button
              onClick={() => router.push(`/${org.slug}/account`)}
              className="mt-8 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white shadow transition hover:-translate-y-0.5"
              style={{ backgroundColor: primary }}
            >
              View my account
            </button>
          </div>

        ) : plans.length === 0 ? (
          <div className="rounded-3xl bg-white p-12 text-center shadow-sm">
            <Star size={36} className="mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500">No membership plans available yet. Check back soon.</p>
          </div>

        ) : (
          /* ── Plans grid ── */
          <>
            {error && (
              <div className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}
            <div className={`grid gap-6 ${plans.length === 1 ? "max-w-sm mx-auto" : plans.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
              {plans.map((plan, i) => {
                const featured = plans.length > 1 && i === Math.floor(plans.length / 2)
                const isJoining = joining === plan.id
                return (
                  <div
                    key={plan.id}
                    className={[
                      "relative flex flex-col rounded-3xl p-8 shadow-sm transition hover:shadow-xl",
                      featured ? "text-white scale-105" : "bg-white border border-slate-100",
                    ].join(" ")}
                    style={featured ? { backgroundColor: primary } : {}}
                  >
                    {featured && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border-2 border-white bg-white px-4 py-1 text-xs font-bold" style={{ color: primary }}>
                        Most popular
                      </div>
                    )}

                    <div className={`mb-1 text-xs font-semibold uppercase tracking-widest ${featured ? "text-white/60" : "text-slate-400"}`}>
                      {plan.billingPeriod ?? "Membership"}
                    </div>
                    <div className={`text-xl font-extrabold ${featured ? "text-white" : "text-slate-900"}`}>
                      {plan.name}
                    </div>

                    <div className="my-6 flex items-end gap-1">
                      <span className={`text-4xl font-extrabold ${featured ? "text-white" : "text-slate-900"}`}>
                        £{parseFloat(plan.price).toFixed(2)}
                      </span>
                      <span className={`mb-1 text-sm ${featured ? "text-white/60" : "text-slate-400"}`}>
                        /{plan.billingPeriod?.toLowerCase() ?? "period"}
                      </span>
                    </div>

                    {plan.description && (
                      <p className={`mb-6 text-sm leading-relaxed ${featured ? "text-white/80" : "text-slate-500"}`}>
                        {plan.description}
                      </p>
                    )}

                    <div className="mt-auto space-y-2.5">
                      {["Member booking rates", "Priority court access", "Member-only events"].map((benefit) => (
                        <div key={benefit} className="flex items-center gap-2.5">
                          <CheckCircle2 size={15} className={featured ? "text-white/80" : ""} style={!featured ? { color: primary } : {}} />
                          <span className={`text-sm ${featured ? "text-white/80" : "text-slate-600"}`}>{benefit}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => handleJoin(plan)}
                      disabled={!!joining}
                      className={[
                        "mt-8 flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed",
                        featured ? "bg-white hover:bg-slate-50" : "text-white",
                      ].join(" ")}
                      style={featured ? { color: primary } : { backgroundColor: primary }}
                    >
                      {isJoining ? <><Loader2 size={15} className="animate-spin" /> Joining…</> : "Get started"}
                    </button>
                  </div>
                )
              })}
            </div>
          </>
        )}

        <div className="mt-12 rounded-3xl bg-white p-8 shadow-sm border border-slate-100 text-center">
          <p className="text-slate-500 text-sm">
            Questions about membership?{" "}
            {org.email && (
              <a href={`mailto:${org.email}`} className="font-semibold" style={{ color: primary }}>
                Contact us
              </a>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
