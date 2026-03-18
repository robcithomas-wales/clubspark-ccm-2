import Link from "next/link"
import { PortalLayout } from "@/components/portal-layout"
import { getResources } from "@/lib/api"

export default async function ResourcesPage() {
  const resources = await getResources()

  return (
    <PortalLayout
      title="Resources"
      description="Physical facilities such as courts, pitches, and pools."
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">{resources.length} resource{resources.length !== 1 ? "s" : ""}</p>
          <Link
            href="/resources/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Add resource
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Sport</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Surface</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {resources.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-400">
                    No resources yet.{" "}
                    <Link href="/resources/new" className="font-medium text-[#1857E0] hover:underline">
                      Add one
                    </Link>
                  </td>
                </tr>
              ) : (
                resources.map((resource: any) => (
                  <tr key={resource.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-0">
                      <Link href={`/resources/${resource.id}`} className="block px-6 py-4 font-medium text-slate-900">
                        {resource.name}
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link href={`/resources/${resource.id}`} className="block px-6 py-4 text-slate-600">
                        {resource.resourceType}
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link href={`/resources/${resource.id}`} className="block px-6 py-4 text-slate-600">
                        {resource.sport || <span className="text-slate-400">—</span>}
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link href={`/resources/${resource.id}`} className="block px-6 py-4 text-slate-600 capitalize">
                        {resource.surface || <span className="text-slate-400">—</span>}
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link href={`/resources/${resource.id}`} className="block px-6 py-4">
                        <span className={[
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          resource.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500",
                        ].join(" ")}>
                          {resource.isActive ? "Active" : "Inactive"}
                        </span>
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
