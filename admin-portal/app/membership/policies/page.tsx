import Link from "next/link"
import { ChevronRight, Plus } from "lucide-react"
import { getEntitlementPolicies } from "@/lib/api"
import { PortalLayout } from "@/components/portal-layout"

function formatLabel(value?: string | null) {
  if (!value) return "Unknown"

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export default async function MembershipPoliciesPage() {
  const data = await getEntitlementPolicies()
  const policies = data.data || []

  return (
    <PortalLayout
      title="Membership Policies"
      description="Reusable entitlement rules used by membership plans."
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Policy Library
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Create and manage reusable entitlement policies for membership plans.
            </p>
          </div>

          <Link
            href="/membership/policies/new"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1832A8] px-5 py-3 text-sm font-semibold !text-white shadow-sm transition hover:bg-[#142a8c]"
          >
            <Plus className="h-4 w-4" />
            Create Policy
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Total Policies
            </div>
            <div className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">
              {policies.length}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Policy Types
            </div>
            <div className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">
              {new Set(policies.map((p: any) => p.policy_type)).size}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Active Usage
            </div>
            <div className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">
              Plans
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {policies.length === 0 ? (
            <div className="flex flex-col items-start gap-4 px-6 py-12">
              <div className="text-sm text-slate-500">
                No entitlement policies found.
              </div>

              <Link
                href="/membership/policies/new"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#1832A8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#142a8c]"
              >
                <Plus className="h-4 w-4" />
                Create First Policy
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {policies.map((policy: any) => (
                <Link
                  key={policy.id}
                  href={`/membership/policies/${policy.id}`}
                  className="group flex items-center justify-between px-6 py-5 hover:bg-slate-50"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="text-lg font-semibold text-slate-900">
                        {policy.name}
                      </div>

                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {formatLabel(policy.policy_type)}
                      </span>
                    </div>

                    <div className="mt-2 text-sm text-slate-600">
                      {policy.description || "No description"}
                    </div>
                  </div>

                  <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-slate-500" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  )
}