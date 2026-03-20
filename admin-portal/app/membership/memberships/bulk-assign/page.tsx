import { getMembershipPlans, getCustomers } from "@/lib/api"
import { PortalLayout } from "@/components/portal-layout"
import { BulkAssignForm } from "@/components/bulk-assign-form"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function BulkAssignPage() {
  const [plansResponse, customersResponse] = await Promise.all([
    getMembershipPlans(1, 100),
    getCustomers(),
  ])

  const plans = plansResponse.data || []
  const customers = customersResponse.data || []

  return (
    <PortalLayout
      title="Bulk Assign Membership"
      description="Assign a plan to multiple people at once."
    >
      <div className="space-y-6">
        <Link
          href="/membership/memberships"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#0F1B3D] transition hover:text-[#1832A8]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to memberships
        </Link>

        <BulkAssignForm plans={plans} customers={customers} />
      </div>
    </PortalLayout>
  )
}
