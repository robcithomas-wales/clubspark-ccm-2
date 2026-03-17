import Link from "next/link"
import { getBookableUnits } from "@/lib/api"
import { PortalLayout } from "@/components/portal-layout"

export default async function UnitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const units = await getBookableUnits()
  const unit = units.find((item: any) => item.id === id)

  if (!unit) {
    return (
      <PortalLayout
        title="Bookable Unit"
        description="Bookable unit details"
      >
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm font-medium text-rose-700">
          Bookable unit not found.
        </div>
      </PortalLayout>
    )
  }

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
                Resource id
              </div>
              <div className="mt-2 break-all text-sm text-slate-900">
                {unit.resourceId || "Unknown"}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Parent unit id
              </div>
              <div className="mt-2 break-all text-sm text-slate-900">
                {unit.parentUnitId || "None"}
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Unit id
              </div>
              <div className="mt-2 break-all text-sm text-slate-900">
                {unit.id}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Link
            href="/facilities"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Back to facilities
          </Link>
        </div>
      </div>
    </PortalLayout>
  )
}