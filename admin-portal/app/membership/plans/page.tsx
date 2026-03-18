import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { getMembershipPlans } from "@/lib/api"
import { PortalLayout } from "@/components/portal-layout"
import { PaginationBar } from "@/components/pagination-bar"

function formatLabel(value?: string | null) {
  if (!value) return "Not set"
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export default async function MembershipPlansPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)

  const data = await getMembershipPlans(page)
  const plans = data.data || []
  const pagination = data.pagination

  const householdPlans = plans.filter((plan: any) => plan.ownershipType === "household").length
  const activePlans = plans.filter((plan: any) => plan.status === "active").length
  const publicPlans = plans.filter((plan: any) => plan.visibility === "public").length

  return (
    <PortalLayout
      title="Membership Plans"
      description="Plans that customers can purchase or be assigned to."
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md transition-shadow hover:shadow-lg">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Total Plans
            </div>
            <div className="mt-3 text-4xl font-bold tracking-tight text-slate-900">
              {pagination?.total ?? plans.length}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md transition-shadow hover:shadow-lg">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Active Plans
            </div>
            <div className="mt-3 text-4xl font-bold tracking-tight text-slate-900">
              {activePlans}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md transition-shadow hover:shadow-lg">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Household Plans
            </div>
            <div className="mt-3 text-4xl font-bold tracking-tight text-slate-900">
              {householdPlans}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md transition-shadow hover:shadow-lg">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Public Plans
            </div>
            <div className="mt-3 text-4xl font-bold tracking-tight text-slate-900">
              {publicPlans}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">All Plans</h2>
            <p className="mt-1 text-sm text-slate-600">
              Membership products available across the organisation
            </p>
          </div>

          <Link
            href="/membership/plans/new"
            className="inline-flex items-center rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-medium !text-white transition hover:bg-[#1832A8]"
          >
            New Plan
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
          {plans.length === 0 ? (
            <div className="px-6 py-12 text-sm text-slate-500">
              No membership plans found.
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-200">
                {plans.map((plan: any) => (
                  <Link
                    key={plan.id}
                    href={`/membership/plans/${plan.id}`}
                    className="group block px-6 py-5 transition hover:bg-blue-50/40"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <div className="text-lg font-semibold text-slate-900 transition group-hover:text-[#1857E0]">
                            {plan.name}
                          </div>

                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                            {formatLabel(plan.status)}
                          </span>
                        </div>

                        <div className="mt-2 text-sm text-slate-600">
                          Scheme: {plan.schemeName || "Unassigned"}
                        </div>

                        <div className="mt-3 h-px w-24 bg-slate-200"></div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {plan.membershipType && (
                            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
                              {formatLabel(plan.membershipType)}
                            </span>
                          )}
                          {plan.pricingModel && (
                            <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 ring-1 ring-violet-200">
                              {formatLabel(plan.pricingModel)}
                            </span>
                          )}
                          {plan.price != null && (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                              {plan.currency ?? "GBP"} {Number(plan.price).toFixed(2)}
                              {plan.billingInterval ? ` / ${plan.billingInterval}` : ""}
                            </span>
                          )}
                          {plan.durationType && (
                            <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                              {formatLabel(plan.durationType)}
                            </span>
                          )}
                          {plan.sportCategory && (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                              {plan.sportCategory}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="grid min-w-[220px] grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                              Code
                            </div>
                            <div className="mt-1 font-medium text-slate-900">
                              {plan.code || "Not set"}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                              Sort Order
                            </div>
                            <div className="mt-1 font-medium text-slate-900">
                              {plan.sortOrder ?? "Not set"}
                            </div>
                          </div>
                        </div>

                        <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 transition group-hover:text-[#1857E0]" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {pagination && (
                <PaginationBar
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  total={pagination.total}
                  limit={pagination.limit}
                  basePath="/membership/plans"
                />
              )}
            </>
          )}
        </div>
      </div>
    </PortalLayout>
  )
}
