import Link from "next/link"
import {
  ArrowLeft,
  CalendarClock,
  Layers3,
  ShieldCheck,
  Sparkles,
  Tag,
} from "lucide-react"
import { PortalLayout } from "@/components/portal-layout"
import {
  getMembershipPlanById,
  getMembershipPlanEntitlements,
  getMembershipPlanEligibility,
} from "@/lib/api"
import { PageSection } from "@/components/ui/page-section"
import { SurfaceCard } from "@/components/ui/surface-card"
import { EditPlanEligibilityPanel } from "@/components/edit-plan-eligibility-panel"
import { EditPlanConfigPanel } from "@/components/edit-plan-config-panel"

type EntitlementItem = {
  id?: string
  entitlementPolicyId?: string
  entitlement_policy_id?: string
  policyName?: string
  policy_name?: string
  policyType?: string
  policy_type?: string
  scopeType?: string
  scope_type?: string
  scopeId?: string | null
  scope_id?: string | null
  configuration?: Record<string, unknown>
  priority?: number
}

function formatLabel(value?: string | null) {
  if (!value) return "Unknown"

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function getBenefitSummary(entitlementItems: EntitlementItem[]) {
  let advanceBooking = "Not configured"
  let peakAccess = "Not configured"
  let eligibleDays = "Not configured"

  for (const item of entitlementItems) {
    const config = item.configuration || {}
    const policyName = (item.policyName || item.policy_name || "").toLowerCase()
    const policyType = (item.policyType || item.policy_type || "").toLowerCase()

    if (policyName.includes("advance booking") || policyType.includes("advance")) {
      const days = config["advance_days"]
      if (days !== undefined) {
        advanceBooking = `${days} days ahead`
      }
    }

    if (policyName.includes("peak booking") || policyType.includes("booking window")) {
      const start = config["start_time"]
      const end = config["end_time"]
      const days = config["days"]

      if (start && end) {
        peakAccess = `${start} to ${end}`
      }

      if (Array.isArray(days) && days.length > 0) {
        const mapped = days.map((day) =>
          String(day).charAt(0).toUpperCase() + String(day).slice(1)
        )
        eligibleDays = mapped.join(", ")
      }
    }
  }

  return {
    advanceBooking,
    peakAccess,
    eligibleDays,
  }
}

function getConfigValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.join(", ")
  }

  return String(value)
}

function SummaryStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-[#B7BBC1] bg-slate-50/70 p-4 shadow-soft">
      <div className="flex items-center gap-2 text-[#868B97]">
        {icon}
        <div className="text-xs font-semibold uppercase tracking-[0.14em]">
          {label}
        </div>
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-[#0F1B3D]">
        {value}
      </div>
    </div>
  )
}

export default async function MembershipPlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await getMembershipPlanById(id)
  const plan = data.data

  let entitlementItems: EntitlementItem[] = []
  let entitlementLoadFailed = false
  let eligibility: Record<string, unknown> = {}

  try {
    const entitlementData = await getMembershipPlanEntitlements(id)
    entitlementItems = Array.isArray(entitlementData?.data)
      ? entitlementData.data
      : Array.isArray(entitlementData)
        ? entitlementData
        : []
  } catch {
    entitlementLoadFailed = true
  }

  try {
    const eligibilityData = await getMembershipPlanEligibility(id)
    eligibility = (eligibilityData?.data ?? {}) as Record<string, unknown>
  } catch {
    // non-critical
  }

  const benefitSummary = getBenefitSummary(entitlementItems)

  return (
    <PortalLayout
      title={plan.name}
      description="Membership plan detail"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/membership/plans"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#0F1B3D] transition hover:text-[#1832A8]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to plans
          </Link>
        </div>

        <SurfaceCard className="p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="xl:col-span-3">
              <div className="text-sm leading-7 text-[#868B97]">
                {plan.description || "No description provided"}
              </div>
            </div>

            <SummaryStat
              icon={<Layers3 className="h-4 w-4" />}
              label="Scheme"
              value={plan.schemeName || "No scheme"}
            />
            <SummaryStat
              icon={<Tag className="h-4 w-4" />}
              label="Code"
              value={plan.code || "No code"}
            />
            <SummaryStat
              icon={<ShieldCheck className="h-4 w-4" />}
              label="Status"
              value={formatLabel(plan.status)}
            />
            <SummaryStat
              icon={<Tag className="h-4 w-4" />}
              label="Ownership"
              value={formatLabel(plan.ownershipType)}
            />
            <SummaryStat
              icon={<CalendarClock className="h-4 w-4" />}
              label="Duration"
              value={formatLabel(plan.durationType)}
            />
            <SummaryStat
              icon={<Layers3 className="h-4 w-4" />}
              label="Visibility"
              value={formatLabel(plan.visibility)}
            />
          </div>
        </SurfaceCard>

        <PageSection
          title="Eligibility Rules"
          description="Restrict who can enrol in this plan"
        >
          <EditPlanEligibilityPanel planId={id} initial={eligibility as any} />
        </PageSection>

        <PageSection
          title="Plan Configuration"
          description="Grace period and terms & conditions"
        >
          <EditPlanConfigPanel
            planId={id}
            gracePeriodDays={plan.gracePeriodDays}
            termsAndConditions={plan.termsAndConditions}
          />
        </PageSection>

        <PageSection
          title="Membership Benefits"
          description="Summary of the access rules applied to this membership plan"
        >
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-[#A9BDD5] bg-blue-50/70 p-5">
              <div className="flex items-center gap-2 text-[#1832A8]">
                <CalendarClock className="h-4 w-4" />
                <div className="text-xs font-semibold uppercase tracking-[0.14em]">
                  Advance Booking
                </div>
              </div>
              <div className="mt-4 text-3xl font-semibold tracking-tight text-[#0F1B3D]">
                {benefitSummary.advanceBooking}
              </div>
            </div>

            <div className="rounded-2xl border border-[#A9D4B2] bg-green-50/70 p-5">
              <div className="flex items-center gap-2 text-emerald-700">
                <ShieldCheck className="h-4 w-4" />
                <div className="text-xs font-semibold uppercase tracking-[0.14em]">
                  Peak Access
                </div>
              </div>
              <div className="mt-4 text-3xl font-semibold tracking-tight text-[#0F1B3D]">
                {benefitSummary.peakAccess}
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
              <div className="flex items-center gap-2 text-amber-700">
                <Sparkles className="h-4 w-4" />
                <div className="text-xs font-semibold uppercase tracking-[0.14em]">
                  Eligible Days
                </div>
              </div>
              <div className="mt-4 text-3xl font-semibold tracking-tight text-[#0F1B3D]">
                {benefitSummary.eligibleDays}
              </div>
            </div>
          </div>
        </PageSection>

        <PageSection
          title="Entitlement Policies"
          description="Reusable policies currently attached to this membership plan"
        >
          {entitlementLoadFailed ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Policies could not be loaded yet.
            </div>
          ) : entitlementItems.length === 0 ? (
            <div className="rounded-2xl border border-[#B7BBC1] bg-slate-50 px-4 py-3 text-sm text-[#868B97]">
              No entitlement policies assigned to this plan.
            </div>
          ) : (
            <div className="grid gap-4">
              {entitlementItems.map((item, index) => {
                const policyName =
                  item.policyName ||
                  item.policy_name ||
                  item.entitlementPolicyId ||
                  item.entitlement_policy_id ||
                  "Unknown policy"

                const policyType = item.policyType || item.policy_type || "Unknown"
                const scopeType = item.scopeType || item.scope_type || "Unknown"

                return (
                  <div
                    key={item.id || `${policyName}-${index}`}
                    className="rounded-2xl border border-[#B7BBC1] bg-slate-50/60 p-5 transition hover:bg-slate-50"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-lg font-semibold text-[#0F1B3D]">
                          {policyName}
                        </div>
                        <div className="mt-1 text-sm text-[#868B97]">
                          Scope: {formatLabel(scopeType)}
                        </div>
                      </div>

                      <span className="inline-flex items-center rounded-full border border-[#B7BBC1] bg-white px-3 py-1 text-xs font-medium text-[#1832A8]">
                        {formatLabel(policyType)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </PageSection>

        <PageSection
          title="Entitlement Configuration"
          description="Rule configuration currently applied to this membership plan"
        >
          {entitlementLoadFailed ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Entitlements could not be loaded yet.
            </div>
          ) : entitlementItems.length === 0 ? (
            <div className="rounded-2xl border border-[#B7BBC1] bg-slate-50 px-4 py-3 text-sm text-[#868B97]">
              No entitlements assigned to this plan.
            </div>
          ) : (
            <div className="grid gap-4">
              {entitlementItems.map((item, index) => {
                const policyName =
                  item.policyName ||
                  item.policy_name ||
                  item.entitlementPolicyId ||
                  item.entitlement_policy_id ||
                  "Unknown policy"

                const policyType = item.policyType || item.policy_type || "Unknown"
                const scopeType = item.scopeType || item.scope_type || "Unknown"
                const priority = item.priority ?? "Not set"

                return (
                  <div
                    key={item.id || `${policyName}-${index}`}
                    className="overflow-hidden rounded-2xl border border-[#B7BBC1] bg-white"
                  >
                    <div className="border-b border-[#B7BBC1] bg-slate-50 px-5 py-4">
                      <div className="text-lg font-semibold text-[#0F1B3D]">
                        {policyName}
                      </div>
                      <div className="mt-1 text-sm text-[#868B97]">
                        {formatLabel(policyType)} • {formatLabel(scopeType)} • Priority {priority}
                      </div>
                    </div>

                    <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
                      {Object.entries(item.configuration || {}).map(([key, value]) => (
                        <div
                          key={key}
                          className="rounded-2xl border border-[#B7BBC1] bg-slate-50/70 px-4 py-4"
                        >
                          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#868B97]">
                            {key.replace(/_/g, " ")}
                          </div>
                          <div className="mt-2 text-base font-semibold text-[#0F1B3D]">
                            {getConfigValue(value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </PageSection>
      </div>
    </PortalLayout>
  )
}