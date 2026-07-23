"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, X, ChevronDown, Plus, Pencil } from "lucide-react"

type Feature = { id: string; name: string; description: string | null }
type Plan = {
  id: string
  name: string
  priceMonthly: number | null
  priceAnnually: number | null
  transactionFeePercent: number | null
  includedSites: number
  isCustom: boolean
  features: Feature[]
}
type Subscription = {
  id: string
  organisationId: string
  planId: string
  billingCycle: string
  status: string
  plan: Plan
}

const PLAN_COLOURS: Record<string, string> = {
  core:       "bg-slate-100 text-slate-700 border-slate-200",
  growth:     "bg-emerald-50 text-emerald-700 border-emerald-200",
  pro:        "bg-blue-50 text-[#1857E0] border-blue-200",
  enterprise: "bg-purple-50 text-purple-700 border-purple-200",
}

const STATUS_COLOURS: Record<string, string> = {
  active:    "bg-emerald-50 text-emerald-700",
  trial:     "bg-amber-50 text-amber-700",
  past_due:  "bg-red-50 text-red-600",
  cancelled: "bg-slate-100 text-slate-500",
}

// All features in display order
const FEATURE_ORDER = [
  "system_of_record", "booking", "membership",
  "payments_online", "payments_offline", "advanced_payments",
  "team_management", "multisport", "multisite",
  "website_basic", "website_growth", "website_pro",
  "reporting_basic", "reporting_advanced",
  "integrations", "comms_basic", "comms_standard", "comms_advanced",
]

export function PricingManager({
  initialPlans,
  initialSubscriptions,
}: {
  initialPlans: Plan[]
  initialSubscriptions: Subscription[]
}) {
  const router = useRouter()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(initialSubscriptions)
  const [assigning, setAssigning] = useState(false)
  const [editingSub, setEditingSub] = useState<Subscription | null>(null)
  const [form, setForm] = useState({ organisationId: "", planId: "core", billingCycle: "monthly" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const plans = initialPlans

  // Gather all unique feature IDs across all plans (in order)
  const allFeatureIds = FEATURE_ORDER.filter((fid) =>
    plans.some((p) => p.features.some((f) => f.id === fid)),
  )
  const featureMap: Record<string, string> = {}
  plans.forEach((p) => p.features.forEach((f) => { featureMap[f.id] = f.name }))

  function openCreate() {
    setEditingSub(null)
    setForm({ organisationId: "", planId: "core", billingCycle: "monthly" })
    setError("")
    setAssigning(true)
  }

  function openEdit(sub: Subscription) {
    setAssigning(false)
    setForm({ organisationId: sub.organisationId, planId: sub.planId, billingCycle: sub.billingCycle })
    setError("")
    setEditingSub(sub)
  }

  function closePanel() {
    setAssigning(false)
    setEditingSub(null)
    setError("")
  }

  async function handleSave() {
    if (!form.organisationId.trim()) { setError("Organisation ID is required"); return }
    setSaving(true)
    setError("")
    try {
      let res: Response
      if (editingSub) {
        res = await fetch(`/api/entitlements/subscriptions/org/${editingSub.organisationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId: form.planId, billingCycle: form.billingCycle }),
        })
      } else {
        res = await fetch("/api/entitlements/subscriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })
      }
      const json = await res.json()
      if (!res.ok) throw new Error(json?.message ?? "Save failed")
      router.refresh()
      // Optimistic update
      const updated: Subscription = json.data
      if (editingSub) {
        setSubscriptions((prev) => prev.map((s) => s.organisationId === editingSub.organisationId ? updated : s))
      } else {
        setSubscriptions((prev) => [updated, ...prev])
      }
      closePanel()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const panelOpen = assigning || !!editingSub

  return (
    <div className="space-y-6">

      {/* ── Plan matrix ── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Plan comparison</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Feature</th>
                {plans.map((plan) => (
                  <th key={plan.id} className="px-4 py-3 text-center">
                    <div className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${PLAN_COLOURS[plan.id] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>
                      {plan.name}
                    </div>
                    <div className="mt-1 text-xs font-normal text-slate-500">
                      {plan.isCustom
                        ? "Custom"
                        : plan.priceMonthly === 0
                          ? "Free"
                          : `£${plan.priceMonthly}/mo`}
                    </div>
                    {plan.transactionFeePercent != null && (
                      <div className="text-xs font-normal text-slate-400">{plan.transactionFeePercent}% fee</div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allFeatureIds.map((fid, i) => (
                <tr key={fid} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                  <td className="px-6 py-2.5 text-sm text-slate-700">{featureMap[fid] ?? fid}</td>
                  {plans.map((plan) => {
                    const has = plan.features.some((f) => f.id === fid)
                    return (
                      <td key={plan.id} className="px-4 py-2.5 text-center">
                        {has
                          ? <Check size={15} className="mx-auto text-emerald-500" />
                          : <X size={15} className="mx-auto text-slate-200" />}
                      </td>
                    )
                  })}
                </tr>
              ))}
              {/* Multi-site included */}
              <tr className="border-t border-slate-100 bg-slate-50/50">
                <td className="px-6 py-2.5 text-sm font-medium text-slate-700">Included sites</td>
                {plans.map((plan) => (
                  <td key={plan.id} className="px-4 py-2.5 text-center text-xs text-slate-500">
                    {plan.includedSites > 0 ? plan.includedSites : "—"}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Subscriptions ── */}
      <div className="flex gap-6">
        <div className={`flex flex-col gap-4 ${panelOpen ? "w-1/2" : "w-full"} transition-all`}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
              Organisation subscriptions
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal normal-case text-slate-500">
                {subscriptions.length}
              </span>
            </h2>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1245b8]"
            >
              <Plus size={16} />
              Assign plan
            </button>
          </div>

          {subscriptions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-400">
              <p className="text-sm">No organisations have been assigned a plan yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className={[
                    "flex items-center justify-between gap-4 rounded-2xl border bg-white p-4 shadow-sm transition",
                    editingSub?.id === sub.id ? "border-[#1857E0] ring-1 ring-[#1857E0]/20" : "border-slate-200",
                  ].join(" ")}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-sm font-medium text-slate-900 truncate">{sub.organisationId}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${PLAN_COLOURS[sub.planId] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>
                        {sub.plan?.name ?? sub.planId}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOURS[sub.status] ?? "bg-slate-100 text-slate-500"}`}>
                        {sub.status}
                      </span>
                      <span className="text-xs text-slate-400 capitalize">{sub.billingCycle}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => openEdit(sub)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-slate-300 hover:text-slate-700"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Assignment panel ── */}
        {panelOpen && (
          <div className="w-1/2 shrink-0">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {assigning ? "Assign plan" : "Edit subscription"}
                </h2>
                <button onClick={closePanel} className="text-slate-400 transition hover:text-slate-700">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                {assigning && (
                  <Field label="Organisation ID" required>
                    <input
                      className={input}
                      value={form.organisationId}
                      onChange={(e) => setForm((f) => ({ ...f, organisationId: e.target.value }))}
                      placeholder="e.g. org_abc123"
                      autoFocus
                    />
                    <p className="mt-1 text-xs text-slate-400">The organisation ID from the venue service.</p>
                  </Field>
                )}

                {editingSub && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-xs text-slate-500">Organisation</p>
                    <p className="mt-0.5 font-mono text-sm font-medium text-slate-900">{editingSub.organisationId}</p>
                  </div>
                )}

                <Field label="Plan">
                  <div className="relative">
                    <select
                      className={`${input} appearance-none pr-8`}
                      value={form.planId}
                      onChange={(e) => setForm((f) => ({ ...f, planId: e.target.value }))}
                    >
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}{p.priceMonthly !== null && p.priceMonthly > 0 ? ` — £${p.priceMonthly}/mo` : p.isCustom ? " — Custom pricing" : " — Free"}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </Field>

                <Field label="Billing cycle">
                  <div className="relative">
                    <select
                      className={`${input} appearance-none pr-8`}
                      value={form.billingCycle}
                      onChange={(e) => setForm((f) => ({ ...f, billingCycle: e.target.value }))}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="annual">Annual</option>
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </Field>

                {/* Plan features preview */}
                {form.planId && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="mb-2 text-xs font-medium text-slate-500">Included features</p>
                    <div className="flex flex-wrap gap-1.5">
                      {plans
                        .find((p) => p.id === form.planId)
                        ?.features.map((f) => (
                          <span key={f.id} className="rounded-full bg-white border border-slate-200 px-2 py-0.5 text-xs text-slate-600">
                            {f.name}
                          </span>
                        ))}
                    </div>
                  </div>
                )}

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex h-10 flex-1 items-center justify-center rounded-xl bg-[#1857E0] text-sm font-semibold text-white transition hover:bg-[#1245b8] disabled:opacity-50"
                  >
                    {saving ? "Saving…" : assigning ? "Assign plan" : "Save changes"}
                  </button>
                  <button
                    onClick={closePanel}
                    className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-4 text-sm text-slate-600 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}{required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}

const input = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#1857E0] focus:bg-white focus:ring-2 focus:ring-[#1857E0]/20"
