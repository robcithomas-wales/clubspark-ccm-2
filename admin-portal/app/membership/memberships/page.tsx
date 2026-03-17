import Link from "next/link"
import { ChevronRight, Plus } from "lucide-react"
import { getMemberships, getCustomers } from "@/lib/api"
import { PortalLayout } from "@/components/portal-layout"
import { PaginationBar } from "@/components/pagination-bar"

type Customer = {
  id: string
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
}

function formatLabel(value?: string | null) {
  if (!value) return "Unknown"

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatDate(value?: string | null) {
  if (!value) return "Not set"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}

function getCustomerName(customer?: Customer | null) {
  if (!customer) return "Unknown customer"

  const firstName = customer.firstName?.trim() || ""
  const lastName = customer.lastName?.trim() || ""
  const fullName = `${firstName} ${lastName}`.trim()

  return fullName || "Unnamed customer"
}

function getStatusBadgeClass(status?: string | null) {
  switch (status) {
    case "active":
      return "bg-emerald-100 text-emerald-700"
    case "pending":
      return "bg-amber-100 text-amber-700"
    case "expired":
      return "bg-slate-200 text-slate-700"
    case "cancelled":
      return "bg-rose-100 text-rose-700"
    default:
      return "bg-slate-100 text-slate-700"
  }
}

function getPaymentBadgeClass(status?: string | null) {
  switch (status) {
    case "paid":
      return "bg-emerald-100 text-emerald-700"
    case "part_paid":
      return "bg-amber-100 text-amber-700"
    case "failed":
      return "bg-rose-100 text-rose-700"
    case "waived":
      return "bg-sky-100 text-sky-700"
    case "unpaid":
    default:
      return "bg-slate-100 text-slate-700"
  }
}

export default async function MembershipsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)

  const [membershipsResponse, customersResponse] = await Promise.all([
    getMemberships(page),
    getCustomers(),
  ])

  const memberships = membershipsResponse.data || []
  const pagination = membershipsResponse.pagination
  const customers: Customer[] = customersResponse.data || []

  const customerMap = new Map<string, Customer>(
    customers.map((customer: Customer) => [customer.id, customer])
  )

  const activeCount = memberships.filter((m: any) => m.status === "active").length
  const expiredCount = memberships.filter((m: any) => m.status === "expired").length

  return (
    <PortalLayout
      title="Memberships"
      description="Manage memberships assigned to customers or households."
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Active Memberships
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Memberships represent customers subscribed to a plan.
            </p>
          </div>

          <Link
            href="/membership/memberships/new"
            className="inline-flex items-center gap-2 rounded-2xl bg-[#1832A8] px-5 py-3 text-sm font-semibold !text-white shadow-sm transition hover:bg-[#142a8c]"
          >
            <Plus className="h-4 w-4" />
            Create Membership
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Total Memberships
            </div>
            <div className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">
              {pagination?.total ?? memberships.length}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Active
            </div>
            <div className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">
              {activeCount}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Expired
            </div>
            <div className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">
              {expiredCount}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {memberships.length === 0 ? (
            <div className="flex flex-col items-start gap-4 px-6 py-12">
              <div>
                <div className="text-sm font-medium text-slate-900">
                  No memberships found yet
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  Create your first membership to start assigning plans to customers.
                </div>
              </div>

              <Link
                href="/membership/memberships/new"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#1832A8] px-4 py-2.5 text-sm font-semibold !text-white shadow-sm transition hover:bg-[#142a8c]"
              >
                <Plus className="h-4 w-4" />
                Create First Membership
              </Link>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-200">
                {memberships.map((membership: any) => {
                  const customer = membership.customerId
                    ? customerMap.get(membership.customerId)
                    : null

                  return (
                    <Link
                      key={membership.id}
                      href={`/membership/memberships/${membership.id}`}
                      className="group block px-6 py-5 transition hover:bg-slate-50"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="text-xl font-semibold text-slate-900">
                              {getCustomerName(customer)}
                            </div>

                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                              {membership.planName || "Unknown plan"}
                            </span>

                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusBadgeClass(
                                membership.status
                              )}`}
                            >
                              {formatLabel(membership.status)}
                            </span>

                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getPaymentBadgeClass(
                                membership.paymentStatus
                              )}`}
                            >
                              {formatLabel(membership.paymentStatus)}
                            </span>
                          </div>

                          <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-4">
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                                Start
                              </div>
                              <div className="mt-1">{formatDate(membership.startDate)}</div>
                            </div>

                            <div>
                              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                                Renewal
                              </div>
                              <div className="mt-1">{formatDate(membership.renewalDate)}</div>
                            </div>

                            <div>
                              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                                Reference
                              </div>
                              <div className="mt-1">{membership.reference || "Not set"}</div>
                            </div>

                            <div>
                              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                                Source
                              </div>
                              <div className="mt-1">{formatLabel(membership.source) || "Not set"}</div>
                            </div>
                          </div>

                          {membership.notes ? (
                            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                              {membership.notes}
                            </div>
                          ) : null}
                        </div>

                        <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-300 group-hover:text-slate-500" />
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
                  basePath="/membership/memberships"
                />
              )}
            </>
          )}
        </div>
      </div>
    </PortalLayout>
  )
}
