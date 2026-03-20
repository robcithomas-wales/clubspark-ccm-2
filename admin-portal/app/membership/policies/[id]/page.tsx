import Link from "next/link"
import { PortalLayout } from "@/components/portal-layout"
import {
  getEntitlementPolicyById,
  getMembershipPlans,
  getMembershipPlanEntitlements,
} from "@/lib/api"
import { EditPolicyPanel } from "@/components/edit-policy-panel"

function formatLabel(value?: string | null) {
  if (!value) return "Unknown"

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export default async function MembershipPolicyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [policyData, plansData] = await Promise.all([
    getEntitlementPolicyById(id),
    getMembershipPlans(),
  ])

  const policy = policyData.data
  const plans = plansData.data || []

  const planUsageResults = await Promise.all(
    plans.map(async (plan: any) => {
      try {
        const entitlementsData = await getMembershipPlanEntitlements(plan.id)
        const entitlements = entitlementsData.data || []
        const usesPolicy = entitlements.some(
          (entitlement: any) => entitlement.entitlement_policy_id === id
        )

        return usesPolicy ? plan : null
      } catch {
        return null
      }
    })
  )

  const linkedPlans = planUsageResults.filter(Boolean)

  return (
    <PortalLayout
      title={policy.name}
      description="Reusable entitlement policy"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/membership/policies"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Back to policies
          </Link>
          <EditPolicyPanel
            policyId={policy.id}
            initial={{
              name: policy.name,
              description: policy.description,
              policyType: policy.policy_type,
              status: policy.status,
            }}
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Policy Name
              </div>
              <div className="mt-2 text-lg font-semibold text-slate-900">
                {policy.name}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Policy Type
              </div>
              <div className="mt-2">
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  {formatLabel(policy.policy_type)}
                </span>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Status
              </div>
              <div className="mt-2 text-sm text-slate-600">
                {formatLabel(policy.status)}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Organisation
              </div>
              <div className="mt-2 text-sm text-slate-600">
                {policy.organisation_id}
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Description
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-600">
                {policy.description || "No description"}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Policy Usage
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Membership plans currently using this policy
          </p>

          {linkedPlans.length === 0 ? (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              This policy is not currently attached to any membership plans.
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
              <div className="divide-y divide-slate-200 bg-white">
                {linkedPlans.map((plan: any) => (
                  <Link
                    key={plan.id}
                    href={`/membership/plans/${plan.id}`}
                    className="block px-5 py-4 transition hover:bg-slate-50"
                  >
                    <div className="font-medium text-slate-900">{plan.name}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      {plan.schemeName || "No scheme"}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Architecture Note
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Policies are reusable entitlement rules. Plans attach policies through
            plan entitlements, allowing the platform to apply booking access,
            windows and other future membership rules in a configurable way.
          </p>
        </div>
      </div>
    </PortalLayout>
  )
}