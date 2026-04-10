import { PortalLayout } from "@/components/portal-layout"
import { ShieldAlert } from "lucide-react"
import Link from "next/link"

const STATUS_COLOURS: Record<string, string> = {
  OPEN: "bg-red-100 text-red-700",
  UNDER_REVIEW: "bg-amber-100 text-amber-700",
  RESOLVED: "bg-green-100 text-green-700",
  APPEALED: "bg-purple-100 text-purple-700",
  CLOSED: "bg-slate-100 text-slate-600",
}

async function getAllCases() {
  try {
    const base = process.env.NEXT_PUBLIC_COMPETITION_SERVICE_URL || "http://127.0.0.1:4009"
    // Service-to-service call with a system token placeholder — replace with proper auth in production
    const res = await fetch(`${base}/discipline`, {
      headers: { Authorization: "Bearer system", "Content-Type": "application/json" },
      cache: "no-store",
    })
    if (!res.ok) return []
    const json = await res.json()
    return json.data ?? []
  } catch {
    return []
  }
}

export default async function DisciplinePage() {
  const cases = await getAllCases()

  return (
    <PortalLayout
      title="Discipline"
      description="All disciplinary cases across competitions."
    >
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {cases.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-20 text-slate-400">
            <ShieldAlert className="h-10 w-10" />
            <p className="text-sm">No disciplinary cases</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Player / Team</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
                <th className="px-4 py-3">Opened</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {cases.map((c: any) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{c.displayName}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{c.description}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOURS[c.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {c.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{c.actions?.length ?? 0}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </PortalLayout>
  )
}
