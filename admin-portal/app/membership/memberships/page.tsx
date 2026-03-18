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
}

const STATUS_TABS = [
  { label: "All", value: undefined },
  { label: "Pending", value: "pending" },
  { label: "Active", value: "active" },
  { label: "Suspended", value: "suspended" },
  { label: "Lapsed", value: "lapsed" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Expired", value: "expired" },
]

const STATUS_BADGE: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-700 ring-amber-200",
  active:    "bg-emerald-100 text-emerald-700 ring-emerald-200",
  suspended: "bg-orange-100 text-orange-700 ring-orange-200",
  lapsed:    "bg-slate-100 text-slate-600 ring-slate-200",
  cancelled: "bg-rose-100 text-rose-700 ring-rose-200",
  expired:   "bg-slate-200 text-slate-600 ring-slate-300",
}

const PAYMENT_BADGE: Record<string, string> = {
  paid:      "bg-emerald-100 text-emerald-700",
  part_paid: "bg-amber-100 text-amber-700",
  failed:    "bg-rose-100 text-rose-700",
  waived:    "bg-sky-100 text-sky-700",
  unpaid:    "bg-slate-100 text-slate-600",
}

function formatLabel(value?: string | null) {
  if (!value) return "—"
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatDate(value?: string | null) {
  if (!value) return "—"
  const d = new Date(value)
  if (isNaN(d.getTime())) return value
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(d)
}

function customerName(c?: Customer | null) {
  if (!c) return "Unknown"
  return `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "Unnamed"
}

export default async function MembershipsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)
  const status = params.status || undefined

  const [membershipsResponse, customersResponse] = await Promise.all([
    getMemberships(page, 25, status),
    getCustomers(),
  ])

  const memberships = membershipsResponse.data || []
  const pagination = membershipsResponse.pagination
  const customers: Customer[] = customersResponse.data || []
  const customerMap = new Map(customers.map((c) => [c.id, c]))

  return (
    <PortalLayout title="Memberships" description="Manage memberships assigned to customers.">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">All Memberships</h2>
            <p className="mt-1 text-sm text-slate-500">
              {pagination?.total ?? memberships.length} memberships
              {status ? ` · ${formatLabel(status)}` : ""}
            </p>
          </div>
          <Link
            href="/membership/memberships/new"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Create Membership
          </Link>
        </div>

        {/* Status filter tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          {STATUS_TABS.map((tab) => {
            const isActive = (status ?? undefined) === tab.value
            const href = tab.value
              ? `/membership/memberships?status=${tab.value}`
              : `/membership/memberships`
            return (
              <Link
                key={tab.label}
                href={href}
                className={[
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition",
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-100",
                ].join(" ")}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>

        {/* List */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {memberships.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-slate-500">
              No memberships found{status ? ` with status "${status}"` : ""}.
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-100">
                {memberships.map((m: any) => {
                  const customer = m.customerId ? customerMap.get(m.customerId) : null
                  const statusCls = STATUS_BADGE[m.status] ?? "bg-slate-100 text-slate-600 ring-slate-200"
                  const paymentCls = PAYMENT_BADGE[m.paymentStatus] ?? "bg-slate-100 text-slate-600"

                  return (
                    <Link
                      key={m.id}
                      href={`/membership/memberships/${m.id}`}
                      className="group flex items-center justify-between gap-4 px-6 py-4 transition hover:bg-slate-50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">
                            {customerName(customer)}
                          </span>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                            {m.planName ?? "Unknown plan"}
                          </span>
                          {m.membershipType && (
                            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                              {formatLabel(m.membershipType)}
                            </span>
                          )}
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${statusCls}`}>
                            {formatLabel(m.status)}
                          </span>
                          {m.paymentStatus && (
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${paymentCls}`}>
                              {formatLabel(m.paymentStatus)}
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-4 text-xs text-slate-500">
                          <span>Start: {formatDate(m.startDate)}</span>
                          {m.renewalDate && <span>Renews: {formatDate(m.renewalDate)}</span>}
                          {m.price != null && (
                            <span>{m.currency ?? "GBP"} {Number(m.price).toFixed(2)}{m.pricingModel === "recurring" && m.billingInterval ? ` / ${m.billingInterval}` : ""}</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-slate-500" />
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
                  basePath={status ? `/membership/memberships?status=${status}` : "/membership/memberships"}
                />
              )}
            </>
          )}
        </div>
      </div>
    </PortalLayout>
  )
}
