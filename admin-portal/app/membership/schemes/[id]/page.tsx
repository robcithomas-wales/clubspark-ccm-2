import Link from "next/link"
import { PortalLayout } from "@/components/portal-layout"
import { getMembershipSchemeById } from "@/lib/api"
import { EditSchemePanel } from "@/components/edit-scheme-panel"

export default async function MembershipSchemeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await getMembershipSchemeById(id)
  const scheme = data.data

  return (
    <PortalLayout
      title={scheme.name}
      description="Membership scheme detail"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/membership/schemes"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Back to schemes
          </Link>
          <EditSchemePanel
            schemeId={scheme.id}
            initial={{ name: scheme.name, description: scheme.description, status: scheme.status }}
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Name
              </div>
              <div className="mt-2 text-lg font-semibold text-slate-900">
                {scheme.name}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Status
              </div>
              <div className="mt-2 text-lg font-semibold text-slate-900">
                {scheme.status}
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Description
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-600">
                {scheme.description || "No description"}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Created
              </div>
              <div className="mt-2 text-sm text-slate-600">
                {scheme.createdAt}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Updated
              </div>
              <div className="mt-2 text-sm text-slate-600">
                {scheme.updatedAt}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  )
}