import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { getMembershipSchemes, getMembershipPlans } from "@/lib/api"
import { PortalLayout } from "@/components/portal-layout"
import { PaginationBar } from "@/components/pagination-bar"

function formatLabel(value?: string | null) {
  if (!value) return "Not set"
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export default async function MembershipSchemesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)

  const [schemeData, planData] = await Promise.all([
    getMembershipSchemes(page),
    getMembershipPlans(),
  ])

  const schemes = schemeData.data || []
  const pagination = schemeData.pagination
  const plans = planData.data || []

  const activeSchemes = schemes.filter((scheme: any) => scheme.status === "active").length

  return (
    <PortalLayout
      title="Membership Schemes"
      description="Define the main membership structures used across the organisation."
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md transition-shadow hover:shadow-lg">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Total Schemes
            </div>
            <div className="mt-3 text-4xl font-bold tracking-tight text-slate-900">
              {pagination?.total ?? schemes.length}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md transition-shadow hover:shadow-lg">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Active Schemes
            </div>
            <div className="mt-3 text-4xl font-bold tracking-tight text-slate-900">
              {activeSchemes}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md transition-shadow hover:shadow-lg">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Linked Plans
            </div>
            <div className="mt-3 text-4xl font-bold tracking-tight text-slate-900">
              {plans.length}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">All Schemes</h2>
            <p className="mt-1 text-sm text-slate-600">
              Top level membership structures used to organise plans
            </p>
          </div>

          <Link
            href="/membership/schemes/new"
            className="inline-flex items-center rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-medium !text-white transition hover:bg-[#1832A8]"
          >
            New Scheme
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
          {schemes.length === 0 ? (
            <div className="px-6 py-12 text-sm text-slate-500">
              No membership schemes found.
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-200">
                {schemes.map((scheme: any) => {
                  const linkedPlanCount = plans.filter(
                    (plan: any) => plan.schemeId === scheme.id
                  ).length

                  return (
                    <Link
                      key={scheme.id}
                      href={`/membership/schemes/${scheme.id}`}
                      className="group block px-6 py-5 transition hover:bg-blue-50/40"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3">
                            <div className="text-lg font-semibold text-slate-900 transition group-hover:text-[#1857E0]">
                              {scheme.name}
                            </div>

                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                              {formatLabel(scheme.status)}
                            </span>
                          </div>

                          <div className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                            {scheme.description || "No description"}
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="grid min-w-[220px] grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                Code
                              </div>
                              <div className="mt-1 font-medium text-slate-900">
                                {scheme.code || "Not set"}
                              </div>
                            </div>

                            <div>
                              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                Linked Plans
                              </div>
                              <div className="mt-1 font-medium text-slate-900">
                                {linkedPlanCount}
                              </div>
                            </div>
                          </div>

                          <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 transition group-hover:text-[#1857E0]" />
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>

              {pagination && (
                <PaginationBar
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  total={pagination.total}
                  limit={pagination.limit}
                  basePath="/membership/schemes"
                />
              )}
            </>
          )}
        </div>
      </div>
    </PortalLayout>
  )
}
