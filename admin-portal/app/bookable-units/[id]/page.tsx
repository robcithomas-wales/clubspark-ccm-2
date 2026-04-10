import Link from "next/link"
import { getBookableUnits, getResources } from "@/lib/api"
import { notFound } from "next/navigation"
import { PortalLayout } from "@/components/portal-layout"

export default async function UnitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [units, resources] = await Promise.all([getBookableUnits(), getResources()])
  const unit = units.find((item: any) => item.id === id)

  if (!unit) notFound()

  return (
    <PortalLayout
      title={unit.name}
      description="Bookable unit details"
    >
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Name
              </div>
              <div className="mt-2 text-lg font-semibold text-slate-900">
                {unit.name}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Type
              </div>
              <div className="mt-2 text-sm text-slate-900">
                {unit.unitType || "Unknown"}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Capacity
              </div>
              <div className="mt-2 text-sm text-slate-900">
                {unit.capacity ?? "n/a"}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Status
              </div>
              <div className="mt-2 text-sm text-slate-900">
                {unit.isActive ? "Active" : "Inactive"}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Resource
              </div>
              <div className="mt-2 text-sm text-slate-900">
                {resources.find((r: any) => r.id === unit.resourceId)?.name ?? unit.resourceId ?? "Unknown"}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Parent unit
              </div>
              <div className="mt-2 text-sm text-slate-900">
                {unit.parentUnitId
                  ? (units.find((u: any) => u.id === unit.parentUnitId)?.name ?? unit.parentUnitId)
                  : "None"}
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Unit id
              </div>
              <div className="mt-2 break-all text-sm font-mono text-slate-400">
                {unit.id}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Link
            href="/facilities"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[#1857E0] bg-white px-5 text-sm font-medium text-[#1857E0] transition hover:bg-blue-50"
          >
            Back to facilities
          </Link>
          <Link
            href={`/bookable-units/${unit.id}/edit`}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[#1857E0] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1445c0]"
          >
            Edit unit
          </Link>
        </div>
      </div>
    </PortalLayout>
  )
}