import Link from "next/link"
import { PortalLayout } from "@/components/portal-layout"

export default function NewVenuePage() {
  return (
    <PortalLayout
      title="Create Venue"
      description="Stub page for creating a new venue."
    >
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold text-slate-900">
            Create Venue
          </div>
          <p className="mt-2 text-sm text-slate-500">
            This page is ready for the venue creation form.
          </p>
        </div>

        <Link
          href="/facilities"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Back to facilities
        </Link>
      </div>
    </PortalLayout>
  )
}