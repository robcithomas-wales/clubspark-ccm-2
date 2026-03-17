import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { PortalLayout } from "@/components/portal-layout"
import { NewCustomerForm } from "@/components/new-customer-form"

export default async function NewCustomerPage({
  searchParams,
}: {
  searchParams?: Promise<{ returnTo?: string }>
}) {
  const params = searchParams ? await searchParams : {}
  const returnTo = params?.returnTo || "/customers"

  return (
    <PortalLayout
      title="New Customer"
      description="Create a customer record for assisted bookings and future self service journeys."
    >
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <Link
            href={returnTo}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>

        <NewCustomerForm returnTo={returnTo} />
      </div>
    </PortalLayout>
  )
}