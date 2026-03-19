import { PortalLayout } from "@/components/portal-layout"

export default function EventsPage() {
  return (
    <PortalLayout title="Events" description="Manage events shown on your customer portal.">
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-400">
        <p className="text-sm">Events — coming soon</p>
      </div>
    </PortalLayout>
  )
}
