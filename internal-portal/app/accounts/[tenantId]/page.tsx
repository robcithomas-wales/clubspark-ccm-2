"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { InternalShell } from "@/components/internal-shell"
import {
  CheckCircle2, AlertCircle, XCircle, Flag, UserX, ScrollText,
  CreditCard, Users, Percent, Building2,
} from "lucide-react"

type Organisation = {
  id: string
  tenantId: string
  name: string
  slug?: string | null
  sport?: string | null
  region?: string | null
  plan: string
  status: string
  paymentConnected: boolean
  onboardingPct: number
  adminEmail?: string | null
  createdAt: string
  updatedAt: string
  adminCount?: number
  featureFlags: { flag: string; enabled: boolean }[]
  _count?: { impersonationSessions: number }
}

const PLAN_COLOURS: Record<string, string> = {
  trial: "bg-slate-100 text-slate-600",
  starter: "bg-blue-50 text-blue-700",
  pro: "bg-violet-50 text-violet-700",
  enterprise: "bg-amber-50 text-amber-700",
}

const PLANS = ["trial", "starter", "pro", "enterprise"]
const STATUSES = ["active", "suspended", "churned"]

export default function AccountDetailPage() {
  const { tenantId } = useParams<{ tenantId: string }>()
  const [org, setOrg] = React.useState<Organisation | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [editPlan, setEditPlan] = React.useState(false)
  const [editStatus, setEditStatus] = React.useState(false)

  React.useEffect(() => {
    fetch(`/api/accounts/${tenantId}`)
      .then(r => r.json())
      .then(j => { setOrg(j.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [tenantId])

  async function updateField(field: string, value: unknown) {
    setSaving(true)
    try {
      const res = await fetch(`/api/accounts/${tenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      })
      const j = await res.json()
      if (res.ok) setOrg(j.data)
    } finally {
      setSaving(false)
      setEditPlan(false)
      setEditStatus(false)
    }
  }

  if (loading) return (
    <InternalShell title="Account" breadcrumb={[{ label: "Accounts", href: "/accounts" }]}>
      <div className="py-20 text-center text-sm text-slate-400">Loading…</div>
    </InternalShell>
  )

  if (!org) return (
    <InternalShell title="Account" breadcrumb={[{ label: "Accounts", href: "/accounts" }]}>
      <div className="py-20 text-center text-sm text-slate-500">Organisation not found.</div>
    </InternalShell>
  )

  const activeFlags = org.featureFlags.filter(f => f.enabled)

  return (
    <InternalShell
      title={org.name}
      description={`Tenant ${org.tenantId}`}
      breadcrumb={[{ label: "Accounts", href: "/accounts" }]}
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: health indicators */}
        <div className="lg:col-span-2 space-y-5">
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Plan", value: org.plan, icon: CreditCard, colour: "text-violet-600" },
              { label: "Onboarding", value: `${org.onboardingPct}%`, icon: Percent, colour: "text-orange-500" },
              { label: "Admin users", value: org.adminCount ?? "—", icon: Users, colour: "text-blue-600" },
              { label: "Active flags", value: activeFlags.length, icon: Flag, colour: "text-emerald-600" },
            ].map(({ label, value, icon: Icon, colour }) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <Icon className={`mb-2 h-5 w-5 ${colour}`} />
                <div className="text-2xl font-bold text-slate-900">{value}</div>
                <div className="mt-0.5 text-xs text-slate-500">{label}</div>
              </div>
            ))}
          </div>

          {/* Onboarding progress */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">Onboarding progress</h2>
              <span className="text-sm font-bold text-orange-500">{org.onboardingPct}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-orange-400 transition-all"
                style={{ width: `${org.onboardingPct}%` }}
              />
            </div>
            <div className="mt-3 flex justify-between text-xs text-slate-400">
              <span>Signed up</span>
              <span>Payment connected</span>
              <span>First booking</span>
              <span>Setup complete</span>
            </div>
          </div>

          {/* Details */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-3.5">
              <h2 className="text-sm font-semibold text-slate-700">Organisation details</h2>
            </div>
            <div className="divide-y divide-slate-50 text-sm">
              <Row label="Tenant ID" value={<code className="text-xs text-slate-600">{org.tenantId}</code>} />
              <Row label="Slug" value={org.slug ?? "—"} />
              <Row label="Sport" value={org.sport ?? "—"} />
              <Row label="Region" value={org.region ?? "—"} />
              <Row label="Admin email" value={org.adminEmail ?? "—"} />
              <Row label="Payment" value={org.paymentConnected ? <span className="font-medium text-emerald-600">Connected</span> : <span className="text-slate-400">Not connected</span>} />
              <Row label="Created" value={new Date(org.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} />

              {/* Editable plan */}
              <Row label="Plan" value={
                editPlan ? (
                  <div className="flex items-center gap-2">
                    <select
                      defaultValue={org.plan}
                      onChange={e => updateField("plan", e.target.value)}
                      className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none"
                    >
                      {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <button onClick={() => setEditPlan(false)} className="text-xs text-slate-400 hover:text-slate-700">Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PLAN_COLOURS[org.plan] ?? PLAN_COLOURS.trial}`}>{org.plan}</span>
                    <button onClick={() => setEditPlan(true)} className="text-xs text-orange-500 hover:text-orange-700">Change</button>
                  </div>
                )
              } />

              {/* Editable status */}
              <Row label="Status" value={
                editStatus ? (
                  <div className="flex items-center gap-2">
                    <select
                      defaultValue={org.status}
                      onChange={e => updateField("status", e.target.value)}
                      className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none"
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button onClick={() => setEditStatus(false)} className="text-xs text-slate-400 hover:text-slate-700">Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {org.status === "active" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                    {org.status === "suspended" && <AlertCircle className="h-4 w-4 text-amber-500" />}
                    {org.status === "churned" && <XCircle className="h-4 w-4 text-slate-400" />}
                    <span className="capitalize text-slate-700">{org.status}</span>
                    <button onClick={() => setEditStatus(true)} className="text-xs text-orange-500 hover:text-orange-700">Change</button>
                  </div>
                )
              } />
            </div>
          </div>
        </div>

        {/* Right: quick actions */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">Quick actions</h2>
            <div className="space-y-2">
              <Link
                href={`/accounts/${tenantId}/flags`}
                className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm hover:border-orange-300 hover:bg-orange-50 transition"
              >
                <Flag className="h-4 w-4 text-orange-500" />
                <div>
                  <div className="font-medium text-slate-800">Feature flags</div>
                  <div className="text-xs text-slate-500">{activeFlags.length} enabled</div>
                </div>
              </Link>
              <Link
                href={`/impersonation?tenantId=${tenantId}`}
                className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm hover:border-orange-300 hover:bg-orange-50 transition"
              >
                <UserX className="h-4 w-4 text-orange-500" />
                <div>
                  <div className="font-medium text-slate-800">Impersonation</div>
                  <div className="text-xs text-slate-500">{org._count?.impersonationSessions ?? 0} sessions total</div>
                </div>
              </Link>
              <Link
                href={`/audit?tenantId=${tenantId}`}
                className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm hover:border-orange-300 hover:bg-orange-50 transition"
              >
                <ScrollText className="h-4 w-4 text-orange-500" />
                <div>
                  <div className="font-medium text-slate-800">Audit log</div>
                  <div className="text-xs text-slate-500">All staff actions for this account</div>
                </div>
              </Link>
            </div>
          </div>

          {/* Active flags summary */}
          {activeFlags.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-slate-700">Active flags</h2>
              <div className="space-y-1.5">
                {activeFlags.map(f => (
                  <div key={f.flag} className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-medium text-emerald-700">{f.flag}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </InternalShell>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 px-5 py-3">
      <span className="w-32 shrink-0 text-xs font-medium text-slate-500">{label}</span>
      <span className="text-slate-800">{value}</span>
    </div>
  )
}
