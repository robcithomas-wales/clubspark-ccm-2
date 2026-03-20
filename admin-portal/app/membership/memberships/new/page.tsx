import { createMembership, getMembershipPlans, getCustomers, getHouseholds } from "@/lib/api"
import { PortalLayout } from "@/components/portal-layout"
import { redirect } from "next/navigation"
import { CreateMembershipForm } from "@/components/create-membership-form"

async function createMembershipAction(formData: FormData) {
  "use server"

  const planId = String(formData.get("planId") || "").trim()
  const ownerType = String(formData.get("ownerType") || "individual").trim()
  const customerId = String(formData.get("customerId") || "").trim()
  const householdId = String(formData.get("householdId") || "").trim()
  const startDate = String(formData.get("startDate") || "").trim()
  const endDate = String(formData.get("endDate") || "").trim()
  const renewalDate = String(formData.get("renewalDate") || "").trim()
  const autoRenew = formData.get("autoRenew") === "on"
  const status = String(formData.get("status") || "active").trim()
  const paymentStatus = String(formData.get("paymentStatus") || "unpaid").trim()
  const reference = String(formData.get("reference") || "").trim()
  const source = String(formData.get("source") || "admin").trim()
  const notes = String(formData.get("notes") || "").trim()
  const memberRole = String(formData.get("memberRole") || "").trim()

  if (!planId) throw new Error("Membership plan is required")
  if (ownerType === "individual" && !customerId) throw new Error("Customer is required")
  if (ownerType === "household" && !householdId) throw new Error("Household is required")
  if (!startDate) throw new Error("Start date is required")

  await createMembership({
    planId,
    customerId: ownerType === "individual" ? customerId : undefined,
    householdId: ownerType === "household" ? householdId : undefined,
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
    memberRole: memberRole || undefined,
  })

  redirect("/membership/memberships")
}

export default async function NewMembershipPage() {
  const [plansResponse, customersResponse, households] = await Promise.all([
    getMembershipPlans(),
    getCustomers(),
    getHouseholds(),
  ])

  const plans = plansResponse.data || []
  const customers = customersResponse.data || []

  return (
    <PortalLayout
      title="Create Membership"
      description="Assign a membership plan to a customer."
    >
      <div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Membership Details
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Create a live membership instance linked to a membership plan.
            </p>
          </div>

          <CreateMembershipForm
            plans={plans}
            customers={customers}
            households={households}
            action={createMembershipAction}
          />

        </div>

      </div>
    </PortalLayout>
  )
}