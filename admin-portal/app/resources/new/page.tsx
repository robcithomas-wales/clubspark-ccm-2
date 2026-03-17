import Link from "next/link"
import { PortalLayout } from "@/components/portal-layout"

export default async function NewResourcePage({
  searchParams,
}: {
  searchParams?: Promise<{ venueId?: string }>
}) {
  const params = searchParams ? await searchParams : {}
  const venueId = params?.venueId || ""

  return (
    <PortalLayout
      title="Create Resource"
      description="Stub page for creating a new resource."
    >
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold text-slate-900">
            Create Resource
          </div>
          <p className="mt-2 text-sm text-slate-500">
            This page is ready for the resource creation form.
          </p>

          {venueId ? (
            <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              Prefilled venue id: <span className="font-medium">{venueId}</span>
            </div>
          ) : null}
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