import { PortalLayout } from "@/components/portal-layout"
import { SegmentForm } from "../segment-form"

export default function NewSegmentPage() {
  return (
    <PortalLayout title="New segment" description="Create a static or dynamic people segment">
      <div className="max-w-2xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <SegmentForm />
        </div>
      </div>
    </PortalLayout>
  )
}
