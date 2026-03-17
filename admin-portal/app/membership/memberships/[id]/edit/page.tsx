import { notFound, redirect } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import {
  getMembershipById,
  getMembershipPlans,
  getCustomers,
  updateMembership,
} from "@/lib/api"
import { PortalLayout } from "@/components/portal-layout"
import { EditMembershipForm } from "@/components/edit-membership-form"

async function updateMembershipAction(id: string, formData: FormData) {
  "use server"

  const planId = String(formData.get("planId") || "").trim()
  const customerId = String(formData.get("customerId") || "").trim()
  const startDate = String(formData.get("startDate") || "").trim()
  const endDate = String(formData.get("endDate") || "").trim()
  const renewalDate = String(formData.get("renewalDate") || "").trim()
  const autoRenew = formData.get("autoRenew") === "on"
  const status = String(formData.get("status") || "active").trim()
  const paymentStatus = String(formData.get("paymentStatus") || "unpaid").trim()
  const reference = String(formData.get("reference") || "").trim()
  const source = String(formData.get("source") || "admin").trim()
  const notes = String(formData.get("notes") || "").trim()

  if (!planId) throw new Error("Membership plan is required")
  if (!customerId) throw new Error("Customer is required")
  if (!startDate) throw new Error("Start date is required")

  await updateMembership(id, {
    planId,
    customerId,
    startDate,
    endDate: endDate || undefined,
    renewalDate: renewalDate || undefined,
    autoRenew,
    status: status as "active" | "pending" | "expired" | "cancelled",
    paymentStatus: paymentStatus as
      | "unpaid"
      | "paid"
      | "part_paid"
      | "failed"
      | "waived",
    reference: reference || undefined,
    source: source || undefined,
    notes: notes || undefined,
  })

  redirect(`/membership/memberships/${id}`)
}

export default async function EditMembershipPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [membershipResponse, plansResponse, customersResponse] = await Promise.all([
    getMembershipById(id).catch(() => null),
    getMembershipPlans(),
    getCustomers(),
  ])

  if (!membershipResponse?.data) {
    notFound()
  }

  const membership = membershipResponse.data
  const plans = plansResponse.data || []
  const customers = Array.isArray(customersResponse) ? customersResponse : []

  return (
    <PortalLayout
      title={`Edit ${membership.planName || "Membership"}`}
      description="Update membership details, customer assignment and administrative fields."
    >
      <div className="space-y-6">

        <Link
          href={`/membership/memberships/${id}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to membership
        </Link>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Edit Membership
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Update membership details and save your changes.
            </p>
          </div>

          <EditMembershipForm
            membership={membership}
            plans={plans}
            customers={customers}
            action={updateMembershipAction.bind(null, id)}
          />
        </div>

      </div>
    </PortalLayout>
  )
}