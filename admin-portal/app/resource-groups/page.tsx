import Link from "next/link"
import { PortalLayout } from "@/components/portal-layout"
import { getResourceGroups } from "@/lib/api"

export default async function ResourceGroupsPage() {
  const groups = await getResourceGroups()

  return (
    <PortalLayout
      title="Resource Groups"
      description="Organise resources into groups for shared availability and pricing rules."
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">{groups.length} group{groups.length !== 1 ? "s" : ""}</p>
          <Link
            href="/resource-groups/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Add group
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Sport</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Colour</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Sort</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {groups.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-sm text-slate-400">
                    No resource groups yet.{" "}
                    <Link href="/resource-groups/new" className="font-medium text-[#1857E0] hover:underline">
                      Create one
                    </Link>
                  </td>
                </tr>
              ) : (
                groups.map((group: any) => (
                  <tr key={group.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-0">
                      <Link href={`/resource-groups/${group.id}`} className="block px-6 py-4 font-medium text-slate-900">
                        {group.name}
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link href={`/resource-groups/${group.id}`} className="block px-6 py-4 text-slate-600 capitalize">
                        {group.sport || <span className="text-slate-400">—</span>}
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link href={`/resource-groups/${group.id}`} className="block px-6 py-4">
                        {group.colour ? (
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block h-4 w-4 rounded-full border border-slate-200"
                              style={{ backgroundColor: group.colour }}
                            />
                            <span className="text-slate-600">{group.colour}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link href={`/resource-groups/${group.id}`} className="block px-6 py-4 text-slate-600">
                        {group.sortOrder ?? 0}
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PortalLayout>
  )
}
