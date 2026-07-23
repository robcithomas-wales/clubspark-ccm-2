import Link from "next/link"
import { Plus, Users, RefreshCw, Filter } from "lucide-react"
import { PortalLayout } from "@/components/portal-layout"

const PEOPLE_SERVICE = "http://127.0.0.1:4004"
const HEADERS = { "x-tenant-id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" }

async function getSegments() {
  try {
    const res = await fetch(`${PEOPLE_SERVICE}/segments`, { headers: HEADERS, cache: "no-store" })
    if (!res.ok) return []
    const json = await res.json()
    return json.data ?? []
  } catch {
    return []
  }
}

export default async function SegmentsPage() {
  const segments = await getSegments()

  return (
    <PortalLayout title="Segments" description="Named groups of people for targeted communications and reporting">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div />
          <Link
            href="/segments/new"
            className="inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-medium text-white hover:bg-[#1832A8] transition"
          >
            <Plus className="h-4 w-4" />
            New segment
          </Link>
        </div>

        {segments.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-700">No segments yet</h3>
            <p className="mt-1 text-sm text-slate-400">Create a static or dynamic segment to group people for communications and reports.</p>
            <Link
              href="/segments/new"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-medium text-white hover:bg-[#1832A8] transition"
            >
              <Plus className="h-4 w-4" />
              Create first segment
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {segments.map((s: any) => (
                <Link
                  key={s.id}
                  href={`/segments/${s.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition"
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${s.type === "dynamic" ? "bg-purple-100" : "bg-blue-100"}`}>
                    {s.type === "dynamic"
                      ? <Filter className="h-4 w-4 text-purple-600" />
                      : <Users className="h-4 w-4 text-blue-600" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-900">{s.name}</div>
                    {s.description && <div className="text-xs text-slate-500 truncate">{s.description}</div>}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-semibold text-slate-900">{s.memberCount}</div>
                    <div className="text-xs text-slate-400">member{s.memberCount !== 1 ? "s" : ""}</div>
                  </div>
                  <div className="shrink-0">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      s.type === "dynamic" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                    }`}>
                      {s.type}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-sm text-slate-600 space-y-1">
          <p><strong className="text-slate-700">Static segments</strong> — you manually add or remove people. Good for hand-picked lists, VIPs, or one-off campaigns.</p>
          <p><strong className="text-slate-700">Dynamic segments</strong> — automatically populated based on rules (lifecycle state, engagement band, etc.). Rebuilt on demand or when conditions change.</p>
        </div>
      </div>
    </PortalLayout>
  )
}
