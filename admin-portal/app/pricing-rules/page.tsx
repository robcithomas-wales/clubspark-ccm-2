import Link from "next/link"
import { Plus, Clock, Zap } from "lucide-react"
import { PortalLayout } from "@/components/portal-layout"
import { getPricingRules } from "@/lib/api"
import { DeletePricingRuleButton } from "./delete-pricing-rule-button"

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const SCOPE_LABELS: Record<string, string> = {
  organisation: "All venues",
  venue: "Venue",
  resource_group: "Resource group",
  resource: "Resource",
  bookable_unit: "Bookable unit",
}

function formatDays(days: number[]): string {
  if (!days || days.length === 0) return "All days"
  if (days.length === 7) return "All days"
  return days.map((d) => DAYS[d]).join(", ")
}

function formatTime(rule: { timeFrom?: string | null; timeTo?: string | null }): string {
  if (!rule.timeFrom && !rule.timeTo) return "All hours"
  return `${rule.timeFrom ?? "00:00"} – ${rule.timeTo ?? "24:00"}`
}

export default async function PricingRulesPage() {
  let rules: any[] = []
  try {
    const res = await getPricingRules()
    rules = res.data ?? []
  } catch {
    // booking service not running
  }

  return (
    <PortalLayout
      title="Pricing Rules"
      description="Configure time-based rates, peak/off-peak pricing, and lighting surcharges. Rules are evaluated at booking time — the most specific matching rule wins."
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-500">
            {rules.length} rule{rules.length !== 1 ? "s" : ""} configured
          </div>
          <Link
            href="/pricing-rules/new"
            className="inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-medium text-white hover:bg-[#1832A8] transition"
          >
            <Plus className="h-4 w-4" />
            Add rule
          </Link>
        </div>

        {rules.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1857E0]/10">
              <Zap className="h-7 w-7 text-[#1857E0]" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">No pricing rules yet</h3>
            <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
              Without pricing rules, bookings use whatever price the admin enters manually. Add a rule to auto-price by time of day, day of week, or venue.
            </p>
            <Link
              href="/pricing-rules/new"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1832A8] transition"
            >
              <Plus className="h-4 w-4" />
              Add first rule
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 text-left">Rule</th>
                  <th className="px-5 py-3 text-left">Scope</th>
                  <th className="px-5 py-3 text-left">When</th>
                  <th className="px-5 py-3 text-left">Rate / hr</th>
                  <th className="px-5 py-3 text-left">Lighting</th>
                  <th className="px-5 py-3 text-left">Member discount</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rules.map((rule: any) => (
                  <tr key={rule.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-900">{rule.name}</div>
                      {rule.label && (
                        <span className="mt-0.5 inline-block rounded-full bg-[#1857E0]/10 px-2 py-0.5 text-xs font-medium text-[#1857E0]">
                          {rule.label}
                        </span>
                      )}
                      {rule.description && (
                        <div className="mt-0.5 text-xs text-slate-400">{rule.description}</div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {SCOPE_LABELS[rule.scopeType] ?? rule.scopeType}
                      {rule.scopeId && (
                        <div className="text-xs text-slate-400 font-mono">{rule.scopeId.slice(0, 8)}…</div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1 text-slate-600">
                        <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        {formatTime(rule)}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-400">{formatDays(rule.daysOfWeek)}</div>
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      £{Number(rule.ratePerHour).toFixed(2)}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {rule.lightingSurchargePerHour != null
                        ? `+£${Number(rule.lightingSurchargePerHour).toFixed(2)}/hr`
                        : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {rule.memberDiscountPct != null
                        ? `${Number(rule.memberDiscountPct)}% off`
                        : <span className="text-slate-400">From membership</span>}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${rule.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {rule.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/pricing-rules/${rule.id}`}
                          className="text-xs font-medium text-[#1857E0] hover:underline"
                        >
                          Edit
                        </Link>
                        <DeletePricingRuleButton ruleId={rule.id} ruleName={rule.name} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-sm text-slate-600 space-y-2">
          <p className="font-semibold text-slate-800">How pricing rules work</p>
          <ul className="list-disc list-inside space-y-1 text-slate-600">
            <li>When a booking is created, the engine finds all active rules that match the venue, resource, day, and time.</li>
            <li>The most specific scope wins: <strong>Bookable unit → Resource → Venue → Organisation</strong>. Within the same scope, higher priority wins.</li>
            <li>Price is calculated as <strong>rate per hour × duration</strong>.</li>
            <li>If the resource has lighting enabled, the lighting surcharge is added per hour.</li>
            <li>Member discounts are applied last: the rule can override the membership-service value, or leave blank to use it automatically.</li>
            <li>If no rule matches, the admin must enter the price manually.</li>
          </ul>
        </div>
      </div>
    </PortalLayout>
  )
}
