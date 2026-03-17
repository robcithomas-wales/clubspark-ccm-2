import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ChevronLeft, Pencil } from "lucide-react"
import {
  deleteMembership,
  getMembershipById,
  getCustomers,
} from "@/lib/api"
import { PortalLayout } from "@/components/portal-layout"
import { DeleteMembershipButton } from "@/components/delete-membership-button"

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

function DetailCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </section>
  )
}

function DetailItem({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-sm text-slate-700">{value}</div>
    </div>
  )
}

function SummaryStat({
  label,
  value,
  mono = false,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </div>
      <div
        className={`mt-2 text-sm text-slate-800 ${
          mono ? "font-mono break-all" : "font-medium"
        }`}
      >
        {value}
      </div>
    </div>
  )
}

export default async function MembershipDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  async function deleteMembershipAction() {
    "use server"
    await deleteMembership(id)
    redirect("/membership/memberships")
  }

  const [membershipResponse, customersResponse] = await Promise.all([
    getMembershipById(id).catch(() => null),
    getCustomers(),
  ])

  if (!membershipResponse?.data) {
    notFound()
  }

  const membership = membershipResponse.data
  const customers = Array.isArray(customersResponse) ? customersResponse : []

  const customer =
    membership.customerId
      ? customers.find((entry: Customer) => entry.id === membership.customerId) || null
      : null

  const customerName = getCustomerName(customer)
  const pageTitle = `${customerName} - ${(membership.planName ?? "Standard")} Membership`

  return (
    <PortalLayout
      title={pageTitle}
      description="View membership details, status and administrative information."
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <Link
              href="/membership/memberships"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to memberships
            </Link>

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                  {pageTitle}
                </h2>

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
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <DeleteMembershipButton action={deleteMembershipAction} />

            <Link
              href={`/membership/memberships/${membership.id}/edit`}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#1832A8] px-5 py-3 text-sm font-semibold !text-white shadow-sm transition hover:bg-[#142a8c]"
            >
              <Pencil className="h-4 w-4" />
              Edit Membership
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryStat label="Membership ID" value={membership.id} mono />
          <SummaryStat label="Start Date" value={formatDate(membership.startDate)} />
          <SummaryStat label="Renewal Date" value={formatDate(membership.renewalDate)} />
          <SummaryStat
            label="Auto Renew"
            value={membership.autoRenew ? "Enabled" : "Disabled"}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <DetailCard title="Membership Overview">
              <div className="grid gap-6 md:grid-cols-2">
                <DetailItem
                  label="Plan"
                  value={membership.planName || "Unknown plan"}
                />
                <DetailItem
                  label="Status"
                  value={formatLabel(membership.status)}
                />
                <DetailItem
                  label="Payment Status"
                  value={formatLabel(membership.paymentStatus)}
                />
                <DetailItem
                  label="Source"
                  value={membership.source ? formatLabel(membership.source) : "Not set"}
                />
                <DetailItem
                  label="Reference"
                  value={membership.reference || "Not set"}
                />
              </div>
            </DetailCard>

            <DetailCard title="Dates">
              <div className="grid gap-6 md:grid-cols-3">
                <DetailItem
                  label="Start Date"
                  value={formatDate(membership.startDate)}
                />
                <DetailItem
                  label="End Date"
                  value={formatDate(membership.endDate)}
                />
                <DetailItem
                  label="Renewal Date"
                  value={formatDate(membership.renewalDate)}
                />
              </div>
            </DetailCard>

            <DetailCard title="Notes">
              <div className="text-sm text-slate-700">
                {membership.notes || "No notes recorded."}
              </div>
            </DetailCard>
          </div>

          <div className="space-y-6">
            <DetailCard title="Customer Details">
              <div className="space-y-5">
                <DetailItem
                  label="Customer Name"
                  value={customerName}
                />
                <DetailItem
                  label="Email"
                  value={customer?.email || "No email"}
                />
                <DetailItem
                  label="Phone"
                  value={customer?.phone || "No phone"}
                />
                <DetailItem
                  label="Customer ID"
                  value={membership.customerId || "Not set"}
                />
              </div>
            </DetailCard>

            <DetailCard title="Operational Settings">
              <div className="space-y-5">
                <DetailItem
                  label="Owner Type"
                  value={formatLabel(membership.ownerType)}
                />
                <DetailItem
                  label="Owner ID"
                  value={membership.ownerId || "Not set"}
                />
                <DetailItem
                  label="Created"
                  value={formatDate(membership.createdAt)}
                />
                <DetailItem
                  label="Last Updated"
                  value={formatDate(membership.updatedAt)}
                />
              </div>
            </DetailCard>
          </div>
        </div>
      </div>
    </PortalLayout>
  )
}