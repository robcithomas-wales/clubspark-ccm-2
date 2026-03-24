import Link from "next/link"
import { Plus } from "lucide-react"
import { getLessonTypes } from "@/lib/api"
import { PortalLayout } from "@/components/portal-layout"

function formatPrice(price: string, currency: string) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(Number(price))
}

export default async function LessonTypesPage() {
  const result = await getLessonTypes(1, 100)
  const lessonTypes = result.data ?? []

  return (
    <PortalLayout
      title="Lesson Types"
      description="Define the types of lessons and sessions your venue offers — used when coaches set up their availability."
    >
      <div className="space-y-6">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Lesson types</h2>
              <p className="mt-1 text-sm text-slate-500">{lessonTypes.length} types configured</p>
            </div>
            <Link
              href="/coaching/lesson-types/new"
              className="inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-semibold !text-white shadow-sm transition hover:bg-[#1832A8]"
            >
              <Plus className="h-4 w-4 !text-white" />
              New lesson type
            </Link>
          </div>

          {lessonTypes.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-500">
              No lesson types yet. Create one to start setting up coaching.
            </div>
          ) : (
            <>
              <div className="hidden grid-cols-5 gap-4 border-b border-slate-200 bg-slate-100 px-6 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 lg:grid">
                <div>Name</div>
                <div>Sport</div>
                <div>Duration</div>
                <div>Price</div>
                <div>Status</div>
              </div>

              <div className="divide-y divide-slate-200">
                {lessonTypes.map((lt) => (
                  <Link
                    key={lt.id}
                    href={`/coaching/lesson-types/${lt.id}`}
                    className="block px-6 py-5 transition hover:bg-blue-50/40"
                  >
                    <div className="grid gap-4 lg:grid-cols-5 lg:items-center">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-900">{lt.name}</div>
                        {lt.description && (
                          <div className="mt-0.5 truncate text-sm text-slate-500">{lt.description}</div>
                        )}
                      </div>

                      <div className="text-sm text-slate-700 capitalize">{lt.sport ?? "—"}</div>

                      <div className="text-sm text-slate-700">{lt.durationMinutes} min</div>

                      <div className="text-sm text-slate-700">
                        {formatPrice(lt.pricePerSession, lt.currency)}
                      </div>

                      <div>
                        <span className={[
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          lt.isActive
                            ? "bg-green-50 text-green-700"
                            : "bg-slate-100 text-slate-500",
                        ].join(" ")}>
                          {lt.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </PortalLayout>
  )
}
