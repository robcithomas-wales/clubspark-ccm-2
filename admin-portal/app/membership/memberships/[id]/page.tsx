import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ChevronLeft, Pencil, ArrowRight } from "lucide-react"
import {
  deleteMembership,
  getMembershipById,
  getMembershipHistory,
  getCustomers,
} from "@/lib/api"
import { PortalLayout } from "@/components/portal-layout"
import { DeleteMembershipButton } from "@/components/delete-membership-button"
import { MembershipLifecycleActions } from "@/components/membership-lifecycle-actions"

type Customer = {
  id: string
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
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

function formatDateTime(value?: string | null) {
  if (!value) return "—"
  const d = new Date(value)
  if (isNaN(d.getTime())) return value
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(d)
}

function customerName(c?: Customer | null) {
  if (!c) return "Unknown customer"
  return `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "Unnamed"
}

const STATUS_BADGE: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-700",
  active:    "bg-emerald-100 text-emerald-700",
  suspended: "bg-orange-100 text-orange-700",
  lapsed:    "bg-slate-100 text-slate-600",
  cancelled: "bg-rose-100 text-rose-700",
  expired:   "bg-slate-200 text-slate-600",
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </section>
  )
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</div>
      <div className="mt-1 text-sm text-slate-700">{value}</div>
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

  const [membershipResponse, customersResponse, history] = await Promise.all([
    getMembershipById(id).catch(() => null),
    getCustomers(),
    getMembershipHistory(id).catch(() => []),
  ])

  if (!membershipResponse?.data) notFound()

  const membership = membershipResponse.data
  const customers: Customer[] = Array.isArray(customersResponse) ? customersResponse : (customersResponse?.data ?? [])
  const customer = membership.customerId
    ? customers.find((c) => c.id === membership.customerId) ?? null
    : null

  const name = customerName(customer)
  const statusCls = STATUS_BADGE[membership.status] ?? "bg-slate-100 text-slate-600"

  return (
    <PortalLayout
      title={`${name} — ${membership.planName ?? "Membership"}`}
      description="Membership details, lifecycle management, and history."
    >
      <div className="space-y-6">
        {/* Back + actions header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <Link
            href="/membership/memberships"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to memberships
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <DeleteMembershipButton action={deleteMembershipAction} />
            <Link
              href={`/membership/memberships/${membership.id}/edit`}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          </div>
        </div>

        {/* Status banner */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold text-slate-900">{name}</h2>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{membership.planName}</span>
              {membership.membershipType && (
                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs text-blue-700">{formatLabel(membership.membershipType)}</span>
              )}
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusCls}`}>
                {formatLabel(membership.status)}
              </span>
            </div>
            {membership.price != null && (
              <p className="mt-1 text-sm text-slate-500">
                {membership.currency ?? "GBP"} {Number(membership.price).toFixed(2)}
                {membership.pricingModel === "recurring" && membership.billingInterval
                  ? ` / ${membership.billingInterval}`
                  : ""}
                {" · "}{formatLabel(membership.pricingModel ?? "fixed")}
              </p>
            )}
          </div>

          {/* Lifecycle action buttons */}
          <MembershipLifecycleActions
            membershipId={membership.id}
            currentStatus={membership.status}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <DetailCard title="Membership Details">
              <div className="grid gap-5 md:grid-cols-2">
                <DetailItem label="Plan" value={membership.planName ?? "—"} />
                <DetailItem label="Status" value={formatLabel(membership.status)} />
                <DetailItem label="Payment Status" value={formatLabel(membership.paymentStatus)} />
                <DetailItem label="Source" value={formatLabel(membership.source)} />
                <DetailItem label="Reference" value={membership.reference ?? "—"} />
                <DetailItem label="Auto Renew" value={membership.autoRenew ? "Enabled" : "Disabled"} />
              </div>
            </DetailCard>

            <DetailCard title="Dates">
              <div className="grid gap-5 md:grid-cols-3">
                <DetailItem label="Start" value={formatDate(membership.startDate)} />
                <DetailItem label="End" value={formatDate(membership.endDate)} />
                <DetailItem label="Renewal" value={formatDate(membership.renewalDate)} />
                {membership.activatedAt && <DetailItem label="Activated" value={formatDateTime(membership.activatedAt)} />}
                {membership.suspendedAt && <DetailItem label="Suspended" value={formatDateTime(membership.suspendedAt)} />}
                {membership.cancelledAt && <DetailItem label="Cancelled" value={formatDateTime(membership.cancelledAt)} />}
                {membership.lapsedAt    && <DetailItem label="Lapsed"    value={formatDateTime(membership.lapsedAt)} />}
                {membership.expiredAt   && <DetailItem label="Expired"   value={formatDateTime(membership.expiredAt)} />}
              </div>
            </DetailCard>

            {/* Lifecycle history */}
            <DetailCard title="Lifecycle History">
              {history.length === 0 ? (
                <p className="text-sm text-slate-400">No status changes recorded yet.</p>
              ) : (
                <ol className="space-y-3">
                  {history.map((event: any) => (
                    <li key={event.id} className="flex items-start gap-3 text-sm">
                      <span className="mt-0.5 shrink-0 text-xs text-slate-400 w-32">{formatDateTime(event.createdAt)}</span>
                      <span className="flex items-center gap-1.5 font-medium text-slate-700">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{formatLabel(event.fromStatus)}</span>
                        <ArrowRight className="h-3 w-3 text-slate-400" />
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{formatLabel(event.toStatus)}</span>
                      </span>
                      {event.reason && <span className="text-slate-500">— {event.reason}</span>}
                      {event.createdBy && <span className="ml-auto text-xs text-slate-400">{event.createdBy}</span>}
                    </li>
                  ))}
                </ol>
              )}
            </DetailCard>

            {membership.notes && (
              <DetailCard title="Notes">
                <p className="text-sm text-slate-700">{membership.notes}</p>
              </DetailCard>
            )}
          </div>

          <div className="space-y-6">
            <DetailCard title="Customer">
              <div className="space-y-4">
                <DetailItem label="Name" value={name} />
                <DetailItem label="Email" value={customer?.email ?? "—"} />
                <DetailItem label="Phone" value={customer?.phone ?? "—"} />
              </div>
            </DetailCard>

            <DetailCard title="System">
              <div className="space-y-4">
                <DetailItem label="Membership ID" value={<span className="font-mono text-xs break-all">{membership.id}</span>} />
                <DetailItem label="Owner Type" value={formatLabel(membership.ownerType)} />
                <DetailItem label="Created" value={formatDate(membership.createdAt)} />
                <DetailItem label="Updated" value={formatDate(membership.updatedAt)} />
              </div>
            </DetailCard>
          </div>
        </div>
      </div>
    </PortalLayout>
  )
}
