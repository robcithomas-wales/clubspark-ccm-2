import Link from "next/link"
import { Plus } from "lucide-react"
import { getProgrammes, getCoaches } from "@/lib/api"
import { PortalLayout } from "@/components/portal-layout"
import { PaginationBar } from "@/components/pagination-bar"

const STATUS_COLOURS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600 ring-slate-500/20",
  published: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  closed: "bg-amber-50 text-amber-700 ring-amber-600/20",
  ended: "bg-slate-100 text-slate-500 ring-slate-400/20",
  cancelled: "bg-red-50 text-red-700 ring-red-600/20",
}

function formatDate(v?: string | null) {
  if (!v) return "—"
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(v))
}

export default async function ProgrammesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; sport?: string; coachId?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)

  const [programmesResult, coachesResult] = await Promise.allSettled([
    getProgrammes(page, 25, { status: params.status, sport: params.sport, coachId: params.coachId }),
    getCoaches(1, 100, true),
  ])

  const programmes = programmesResult.status === "fulfilled" ? (programmesResult.value.data ?? []) : []
  const pagination = programmesResult.status === "fulfilled" ? programmesResult.value.pagination : null
  const coaches = coachesResult.status === "fulfilled" ? (coachesResult.value.data ?? []) : []

  return (
    <PortalLayout title="Programmes" description="Group coaching offers — courses, camps, academies, and structured sessions.">
      <div className="space-y-6">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Programmes</h2>
              <p className="mt-1 text-sm text-slate-500">{pagination?.total ?? 0} total</p>
            </div>
            <Link
              href="/coaching/programmes/new"
              className="inline-flex items-center gap-2 rounded-xl bg-[#1832A8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#142a8c]"
            >
              <Plus className="h-4 w-4" /> New programme
            </Link>
          </div>

          {/* Filters */}
          <form method="GET" className="flex flex-wrap gap-3 border-b border-slate-100 bg-slate-50 px-6 py-3">
            <select name="status" defaultValue={params.status ?? ""} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none">
              <option value="">All statuses</option>
              {["draft", "published", "closed", "ended", "cancelled"].map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
            <select name="coachId" defaultValue={params.coachId ?? ""} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none">
              <option value="">All coaches</option>
              {coaches.map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}
            </select>
            <button type="submit" className="h-9 rounded-lg bg-[#1832A8] px-4 text-sm font-medium text-white hover:bg-[#142a8c]">Filter</button>
            <Link href="/coaching/programmes" className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50">Clear</Link>
          </form>

          {programmes.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-slate-500">No programmes found. <Link href="/coaching/programmes/new" className="text-[#1832A8] underline">Create the first one.</Link></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {programmes.map((p) => (
                <Link key={p.id} href={`/coaching/programmes/${p.id}`} className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50 transition">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-slate-900 truncate">{p.name}</span>
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${STATUS_COLOURS[p.status] ?? STATUS_COLOURS.draft}`}>
                        {p.status}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      {p.sport && <span>{p.sport}</span>}
                      {p.coach && <span>Coach: {p.coach.displayName}</span>}
                      <span>Enrols {formatDate(p.enrollsFrom)} – {formatDate(p.enrollsUntil)}</span>
                      <span>{p._count?.enrolments ?? 0} / {p.maxParticipants} enrolled</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-sm font-semibold text-slate-700">
                    £{Number(p.price).toFixed(2)}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="border-t border-slate-100 px-6 py-4">
              <PaginationBar page={page} totalPages={pagination.totalPages} total={pagination.total} limit={25} basePath="/coaching/programmes" />
            </div>
          )}
        </section>
      </div>
    </PortalLayout>
  )
}
