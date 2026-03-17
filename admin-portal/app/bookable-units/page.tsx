import Link from "next/link"
import { Plus, Layers } from "lucide-react"
import { getBookableUnits } from "@/lib/api"
import { PortalLayout } from "@/components/portal-layout"

export default async function BookableUnitsPage() {
  const units = await getBookableUnits()

  return (
    <PortalLayout
      title="Bookable Units"
      description="Courts, pitches, and optional extras (changing rooms, ball machines) that can be booked. Flag a unit as an optional extra to make it selectable alongside a primary booking."
    >
      <div className="space-y-6">
        <div className="flex items-center justify-end">
          <Link
            href="/bookable-units/new"
            className="inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-medium !text-white shadow-sm transition hover:bg-[#174ED0]"
          >
            <Plus className="h-4 w-4" />
            Create Unit
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
          {units.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1857E0]/10">
                <Layers className="h-7 w-7 text-[#1857E0]" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">No bookable units yet</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                Create units for courts, pitches, or optional extras like changing rooms and ball
                machines.
              </p>
              <Link
                href="/bookable-units/new"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-5 py-2.5 text-sm font-semibold !text-white shadow-sm transition hover:bg-[#174ED0]"
              >
                <Plus className="h-4 w-4" />
                Create Unit
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Capacity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Optional Extra
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {units.map((unit: any) => (
                    <tr key={unit.id} className="cursor-pointer transition hover:bg-blue-50/40">
                      <td className="p-0">
                        <Link href={`/bookable-units/${unit.id}`} className="block px-6 py-4">
                          <div className="font-medium text-slate-900">{unit.name}</div>
                          {unit.parentUnitId && (
                            <div className="mt-1 text-xs text-slate-400">Sub-unit</div>
                          )}
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={`/bookable-units/${unit.id}`} className="block px-6 py-4 text-sm capitalize text-slate-700">
                          {unit.unitType || "—"}
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={`/bookable-units/${unit.id}`} className="block px-6 py-4 text-sm text-slate-700">
                          {unit.capacity ?? "—"}
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={`/bookable-units/${unit.id}`} className="block px-6 py-4">
                          {unit.isOptionalExtra ? (
                            <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 ring-1 ring-violet-200">
                              Optional extra
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                              Primary
                            </span>
                          )}
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={`/bookable-units/${unit.id}`} className="block px-6 py-4">
                          <span className={[
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                            unit.isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700",
                          ].join(" ")}>
                            {unit.isActive ? "Active" : "Inactive"}
                          </span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  )
}
