import Link from "next/link"
import { Plus, Leaf } from "lucide-react"
import { PortalLayout } from "@/components/portal-layout"

const VENUE_SERVICE = "http://127.0.0.1:4003"
const HEADERS = { "x-tenant-id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" }

async function getSeasons() {
  try {
    const res = await fetch(`${VENUE_SERVICE}/v1/seasonal-schedules`, {
      headers: HEADERS,
      cache: "no-store",
    })
    if (!res.ok) return []
    const json = await res.json()
    return json.data ?? []
  } catch {
    return []
  }
}

const STATUS_COLOURS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  draft: "bg-slate-100 text-slate-600",
  ended: "bg-slate-100 text-slate-400",
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export default async function SeasonsPage() {
  const seasons = await getSeasons()

  return (
    <PortalLayout title="Seasonal Schedules" description="Named seasons with date ranges to organise availability and booking rules">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div />
          <Link
            href="/seasons/new"
            className="inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-medium text-white hover:bg-[#1832A8] transition"
          >
            <Plus className="h-4 w-4" />
            New season
          </Link>
        </div>

        {seasons.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <Leaf className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-700">No seasons yet</h3>
            <p className="mt-1 text-sm text-slate-400">Create a seasonal schedule to organise availability windows (e.g. Summer 2026, Winter 2025/26).</p>
            <Link
              href="/seasons/new"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-medium text-white hover:bg-[#1832A8] transition"
            >
              <Plus className="h-4 w-4" />
              Create first season
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {seasons.map((s: any) => (
                <Link
                  key={s.id}
                  href={`/seasons/${s.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-100">
                    <Leaf className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-900">{s.name}</div>
                    <div className="text-xs text-slate-500">{fmt(s.startDate)} – {fmt(s.endDate)}</div>
                    {s.notes && <div className="text-xs text-slate-400 truncate mt-0.5">{s.notes}</div>}
                  </div>
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOURS[s.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {s.status}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  )
}
