import { PortalLayout } from "@/components/portal-layout"
import { RefundPolicyForm } from "../refund-policy-form"

export default function NewRefundPolicyPage() {
  return (
    <PortalLayout title="New Refund Policy" description="Define when and how much to refund on cancellation">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm max-w-xl">
        <RefundPolicyForm />
      </div>
    </PortalLayout>
  )
}
