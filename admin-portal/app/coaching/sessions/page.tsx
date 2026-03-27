import Link from "next/link"
import { Plus, CalendarDays } from "lucide-react"
import { getSessions, getCoaches, getLessonTypes } from "@/lib/api"
import { PortalLayout } from "@/components/portal-layout"
import { PaginationBar } from "@/components/pagination-bar"

const STATUS_COLOURS: Record<string, string> = {
  scheduled: "bg-blue-50 text-blue-700 ring-blue-600/20",
  confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  completed: "bg-slate-100 text-slate-600 ring-slate-500/20",
  cancelled: "bg-red-50 text-red-700 ring-red-600/20",
  no_show: "bg-amber-50 text-amber-700 ring-amber-600/20",
}

const PAYMENT_COLOURS: Record<string, string> = {
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  unpaid: "bg-red-50 text-red-700 ring-red-600/20",
  waived: "bg-slate-100 text-slate-600 ring-slate-500/20",
}

function formatDateTime(v: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(v))
}

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; coachId?: string; status?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)

  const [sessionsResult, coachesResult] = await Promise.allSettled([
    getSessions(page, 25, {
      coachId: params.coachId,
      status: params.status,
    }),
    getCoaches(1, 100),
  ])

  const sessions = sessionsResult.status === "fulfilled" ? (sessionsResult.value.data ?? []) : []
  const pagination = sessionsResult.status === "fulfilled" ? sessionsResult.value.pagination : null
  const coaches = coachesResult.status === "fulfilled" ? (coachesResult.value.data ?? []) : []

  return (
    <PortalLayout
      title="Lesson Sessions"
      description="Scheduled and completed coaching sessions — view, create, and update individual lessons."
    >
      <div className="space-y-6">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Sessions</h2>
              <p className="mt-1 text-sm text-slate-500">{pagination?.total ?? 0} sessions total</p>
            </div>
            <Link
              href="/coaching/sessions/new"
              className="inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-semibold !text-white shadow-sm transition hover:bg-[#1832A8]"
            >
              <Plus className="h-4 w-4 !text-white" />
              Book session
            </Link>
          </div>

          {/* Filters */}
          <form className="flex flex-wrap gap-3 border-b border-slate-100 px-6 py-3">
            <select
              name="coachId"
              defaultValue={params.coachId ?? ""}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-[#1857E0]"
            >
              <option value="">All coaches</option>
              {coaches.map((c: any) => (
                <option key={c.id} value={c.id}>{c.displayName}</option>
              ))}
            </select>
            <select
              name="status"
              defaultValue={params.status ?? ""}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-[#1857E0]"
            >
              <option value="">All statuses</option>
              {["scheduled", "confirmed", "completed", "cancelled", "no_show"].map((s) => (
                <option key={s} value={s}>{s.replace("_", " ")}</option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-xl bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
            >
              Filter
            </button>
          </form>

          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <CalendarDays className="h-10 w-10 text-slate-300" />
              <p className="text-sm text-slate-500">No sessions found.</p>
              <Link
                href="/coaching/sessions/new"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-semibold !text-white transition hover:bg-[#1832A8]"
              >
                <Plus className="h-4 w-4 !text-white" /> Book first session
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  <th className="px-6 py-3">Date & time</th>
                  <th className="px-6 py-3">Coach</th>
                  <th className="px-6 py-3">Lesson type</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Payment</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((s: any) => (
                  <tr key={s.id} className="transition hover:bg-slate-50/60">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {formatDateTime(s.startsAt)}
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {s.coach?.displayName ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {s.lessonType?.name ?? "—"}
                      {s.lessonType?.sport && (
                        <span className="ml-1.5 text-xs text-slate-400 capitalize">({s.lessonType.sport})</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset capitalize ${STATUS_COLOURS[s.status] ?? "bg-slate-100 text-slate-600 ring-slate-500/20"}`}>
                        {s.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset capitalize ${PAYMENT_COLOURS[s.paymentStatus] ?? "bg-slate-100 text-slate-600 ring-slate-500/20"}`}>
                        {s.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/coaching/sessions/${s.id}`}
                        className="text-xs font-medium text-[#1857E0] transition hover:text-[#1832A8]"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="border-t border-slate-100 px-6 py-4">
              <PaginationBar
                page={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                limit={pagination.limit}
                basePath="/coaching/sessions"
              />
            </div>
          )}
        </section>
      </div>
    </PortalLayout>
  )
}
