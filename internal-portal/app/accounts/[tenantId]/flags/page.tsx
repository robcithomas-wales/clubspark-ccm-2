"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { InternalShell } from "@/components/internal-shell"
import { RotateCcw } from "lucide-react"

type Flag = {
  flag: string
  enabled: boolean
  overrideReason?: string | null
  setByEmail?: string | null
  updatedAt?: string | null
  isOverridden?: boolean
}

const FLAG_LABELS: Record<string, { label: string; description: string }> = {
  coaching: { label: "Coaching", description: "Lessons, sessions and coach management" },
  competitions: { label: "Competitions", description: "Club-run competitions and leagues" },
  team_management: { label: "Team management", description: "Squad, fixtures and match fees" },
  smart_access: { label: "Smart Access", description: "Hardware-linked door and gate access" },
  analytics_ai: { label: "AI Analytics", description: "Churn scoring, LTV and anomaly detection" },
  payments_gocardless: { label: "GoCardless", description: "Direct debit payment processing" },
  payments_stripe: { label: "Stripe", description: "Card payment processing" },
  website_manager: { label: "Website Manager", description: "Public site and content management" },
  communications_sms: { label: "SMS", description: "SMS channel for communications" },
  onboarding_checklist: { label: "Onboarding checklist", description: "Guided setup experience" },
  beta_calendar: { label: "Beta: Calendar", description: "New unified calendar view" },
  beta_automation: { label: "Beta: Automation", description: "Rule-based workflow engine" },
}

export default function FlagsPage() {
  const { tenantId } = useParams<{ tenantId: string }>()
  const [flags, setFlags] = React.useState<Flag[]>([])
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState<string | null>(null)
  const [reasonInputs, setReasonInputs] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    fetch(`/api/accounts/${tenantId}/flags`)
      .then(r => r.json())
      .then(j => { setFlags(j.data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [tenantId])

  async function toggle(flag: string, enabled: boolean) {
    setSaving(flag)
    try {
      const body = { enabled, overrideReason: reasonInputs[flag] || undefined }
      const res = await fetch(`/api/accounts/${tenantId}/flags/${flag}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setFlags(prev => prev.map(f => f.flag === flag ? { ...f, enabled, isOverridden: true } : f))
      }
    } finally {
      setSaving(null)
    }
  }

  async function reset(flag: string) {
    if (!confirm(`Reset "${flag}" to global default?`)) return
    setSaving(flag)
    try {
      await fetch(`/api/accounts/${tenantId}/flags/${flag}`, { method: "DELETE" })
      setFlags(prev => prev.map(f => f.flag === flag ? { ...f, enabled: false, isOverridden: false, overrideReason: null, setByEmail: null } : f))
    } finally {
      setSaving(null)
    }
  }

  const enabledCount = flags.filter(f => f.enabled).length

  return (
    <InternalShell
      title="Feature flags"
      description={`${enabledCount} of ${flags.length} flags enabled for this account`}
      breadcrumb={[
        { label: "Accounts", href: "/accounts" },
        { label: "Account", href: `/accounts/${tenantId}` },
      ]}
    >
      {loading ? (
        <div className="py-20 text-center text-sm text-slate-400">Loading…</div>
      ) : (
        <div className="space-y-3">
          {flags.map((flag) => {
            const meta = FLAG_LABELS[flag.flag]
            const isSaving = saving === flag.flag
            return (
              <div
                key={flag.flag}
                className={`rounded-2xl border bg-white p-5 shadow-sm transition ${flag.enabled ? "border-emerald-200" : "border-slate-200"}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className="font-semibold text-slate-900">{meta?.label ?? flag.flag}</span>
                      {flag.isOverridden && (
                        <span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-600">
                          overridden
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-slate-500">{meta?.description ?? flag.flag}</p>
                    {flag.setByEmail && (
                      <p className="mt-1 text-xs text-slate-400">
                        Set by {flag.setByEmail}
                        {flag.updatedAt && ` · ${new Date(flag.updatedAt).toLocaleDateString("en-GB")}`}
                      </p>
                    )}
                    {flag.overrideReason && (
                      <p className="mt-1 text-xs text-amber-600">Reason: {flag.overrideReason}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {flag.isOverridden && (
                      <button
                        onClick={() => reset(flag.flag)}
                        disabled={isSaving}
                        className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:text-slate-700 hover:border-slate-300 transition"
                        title="Reset to global default"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    )}

                    {/* Toggle */}
                    <button
                      onClick={() => toggle(flag.flag, !flag.enabled)}
                      disabled={isSaving}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${flag.enabled ? "bg-emerald-500" : "bg-slate-200"} disabled:opacity-60`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${flag.enabled ? "translate-x-6" : "translate-x-1"}`}
                      />
                    </button>
                  </div>
                </div>

                {/* Reason input (shown when disabling or changing) */}
                <div className="mt-3">
                  <input
                    value={reasonInputs[flag.flag] ?? ""}
                    onChange={e => setReasonInputs(prev => ({ ...prev, [flag.flag]: e.target.value }))}
                    placeholder="Override reason (optional)…"
                    className="h-8 w-full max-w-sm rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-orange-300"
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </InternalShell>
  )
}
