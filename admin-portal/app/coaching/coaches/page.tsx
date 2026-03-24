import Link from "next/link"
import { Plus, GraduationCap } from "lucide-react"
import { getCoaches } from "@/lib/api"
import { PortalLayout } from "@/components/portal-layout"
import { PaginationBar } from "@/components/pagination-bar"

export default async function CoachesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)

  const result = await getCoaches(page, 25)
  const coaches = result.data ?? []
  const pagination = result.pagination

  return (
    <PortalLayout
      title="Coaches"
      description="Manage coaching staff, their specialties, and lesson types they deliver."
    >
      <div className="space-y-6">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Coach roster</h2>
              <p className="mt-1 text-sm text-slate-500">{pagination?.total ?? 0} coaches registered</p>
            </div>
            <Link
              href="/coaching/coaches/new"
              className="inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-semibold !text-white shadow-sm transition hover:bg-[#1832A8]"
            >
              <Plus className="h-4 w-4 !text-white" />
              Add coach
            </Link>
          </div>

          {coaches.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <GraduationCap className="h-12 w-12 text-slate-300" />
              <p className="text-sm font-medium text-slate-500">No coaches yet</p>
              <p className="text-sm text-slate-400">Add your first coach to get started with lessons.</p>
              <Link
                href="/coaching/coaches/new"
                className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-semibold !text-white shadow-sm transition hover:bg-[#1832A8]"
              >
                <Plus className="h-4 w-4 !text-white" />
                Add coach
              </Link>
            </div>
          ) : (
            <>
              <div className="hidden grid-cols-4 gap-4 border-b border-slate-200 bg-slate-100 px-6 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 lg:grid">
                <div>Coach</div>
                <div>Specialties</div>
                <div>Lesson types</div>
                <div>Status</div>
              </div>

              <div className="divide-y divide-slate-200">
                {coaches.map((coach) => (
                  <Link
                    key={coach.id}
                    href={`/coaching/coaches/${coach.id}`}
                    className="block px-6 py-5 transition hover:bg-blue-50/40"
                  >
                    <div className="grid gap-4 lg:grid-cols-4 lg:items-center">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-900">{coach.displayName}</div>
                        {coach.bio && (
                          <div className="mt-0.5 truncate text-sm text-slate-500">{coach.bio}</div>
                        )}
                      </div>

                      <div className="min-w-0">
                        {coach.specialties.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {coach.specialties.slice(0, 3).map((s) => (
                              <span key={s} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                                {s}
                              </span>
                            ))}
                            {coach.specialties.length > 3 && (
                              <span className="text-xs text-slate-400">+{coach.specialties.length - 3}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">No specialties</span>
                        )}
                      </div>

                      <div className="text-sm text-slate-700">
                        {(coach.lessonTypes?.length ?? 0) === 0
                          ? "None assigned"
                          : `${coach.lessonTypes!.length} type${coach.lessonTypes!.length === 1 ? "" : "s"}`}
                      </div>

                      <div>
                        <span className={[
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          coach.isActive
                            ? "bg-green-50 text-green-700"
                            : "bg-slate-100 text-slate-500",
                        ].join(" ")}>
                          {coach.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {pagination && (
                <PaginationBar
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  total={pagination.total}
                  limit={pagination.limit}
                  basePath="/coaching/coaches"
                />
              )}
            </>
          )}
        </section>
      </div>
    </PortalLayout>
  )
}
