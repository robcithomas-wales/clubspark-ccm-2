import Link from "next/link"
import { Plus } from "lucide-react"
import { getMembershipsWithFilter, getCustomers } from "@/lib/api"
import { PortalLayout } from "@/components/portal-layout"
import { PaginationBar } from "@/components/pagination-bar"
import { BulkMembershipActions } from "@/components/bulk-membership-actions"

type Customer = {
  id: string
  firstName?: string | null
  lastName?: string | null
  email?: string | null
}

const STATUS_TABS = [
  { label: "All", tab: "all" },
  { label: "Pending", tab: "pending" },
  { label: "Active", tab: "active" },
  { label: "Suspended", tab: "suspended" },
  { label: "Lapsed", tab: "lapsed" },
  { label: "Cancelled", tab: "cancelled" },
  { label: "Expired", tab: "expired" },
  { label: "Renewals Due", tab: "renewals" },
]

const PAYMENT_TABS = [
  { label: "All payments", value: "" },
  { label: "Unpaid", value: "unpaid" },
  { label: "Paid", value: "paid" },
  { label: "Part paid", value: "part_paid" },
  { label: "Failed", value: "failed" },
  { label: "Waived", value: "waived" },
]

function formatLabel(value?: string | null) {
  if (!value) return "—"
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export default async function MembershipsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tab?: string; paymentStatus?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)
  const tab = params.tab ?? "all"
  const paymentStatus = params.paymentStatus || undefined
  const isRenewalTab = tab === "renewals"
  const status = tab === "all" || isRenewalTab ? undefined : tab

  const filterOpts = isRenewalTab
    ? { page, renewingWithinDays: 30, paymentStatus }
    : { page, status, paymentStatus }

  const [membershipsResponse, customersResponse] = await Promise.all([
    getMembershipsWithFilter(filterOpts),
    getCustomers(),
  ])

  const memberships = membershipsResponse.data || []
  const pagination = membershipsResponse.pagination
  const customers: Customer[] = customersResponse.data || []
  const customerMap = new Map(customers.map((c) => [c.id, c]))

  function buildHref(newTab?: string, newPayment?: string, newPage?: number) {
    const qs = new URLSearchParams()
    const t = newTab ?? tab
    if (t && t !== "all") qs.set("tab", t)
    const p = newPayment !== undefined ? newPayment : (paymentStatus ?? "")
    if (p) qs.set("paymentStatus", p)
    if (newPage && newPage > 1) qs.set("page", String(newPage))
    const str = qs.toString()
    return `/membership/memberships${str ? `?${str}` : ""}`
  }

  return (
    <PortalLayout title="Memberships" description="Manage memberships assigned to customers.">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {isRenewalTab ? "Renewals Due" : "All Memberships"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {pagination?.total ?? memberships.length}{" "}
              {isRenewalTab
                ? "memberships renewing in the next 30 days"
                : `memberships${status ? ` · ${formatLabel(status)}` : ""}${paymentStatus ? ` · ${formatLabel(paymentStatus)}` : ""}`}
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

        {/* Status tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          {STATUS_TABS.map((t) => {
            const isActive = tab === t.tab
            return (
              <Link
                key={t.tab}
                href={buildHref(t.tab, paymentStatus)}
                className={[
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition",
                  isActive
                    ? t.tab === "renewals"
                      ? "bg-amber-500 text-white"
                      : "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-100",
                ].join(" ")}
              >
                {t.label}
              </Link>
            )
          })}
        </div>

        {/* Payment status filter */}
        {!isRenewalTab && (
          <div className="flex flex-wrap gap-2">
            {PAYMENT_TABS.map((pt) => {
              const isActive = (paymentStatus ?? "") === pt.value
              return (
                <Link
                  key={pt.label}
                  href={buildHref(tab, pt.value)}
                  className={[
                    "rounded-lg border px-3 py-1 text-xs font-medium transition",
                    isActive
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50",
                  ].join(" ")}
                >
                  {pt.label}
                </Link>
              )
            })}
          </div>
        )}

        {/* List with bulk actions */}
        <BulkMembershipActions
          memberships={memberships}
          customers={customers}
          customerMap={customerMap}
          isRenewalTab={isRenewalTab}
        />

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <PaginationBar
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={pagination.limit}
              basePath={buildHref(tab, paymentStatus)}
            />
          </div>
        )}
      </div>
    </PortalLayout>
  )
}
