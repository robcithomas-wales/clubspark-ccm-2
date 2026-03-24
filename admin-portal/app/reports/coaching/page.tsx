import { PortalLayout } from "@/components/portal-layout"
import { ExportButton } from "@/components/reports/export-button"
import { HBarChart, DonutChart, VBarChart } from "@/components/reports/charts"
import { getCoaches, getLessonTypes } from "@/lib/api"

function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 2,
  }).format(v)
}

export default async function CoachingReportPage() {
  const [coachesRes, lessonTypesRes] = await Promise.allSettled([
    getCoaches(1, 200, false),
    getLessonTypes(1, 200, false),
  ])

  const allCoaches =
    coachesRes.status === "fulfilled" ? coachesRes.value.data : []
  const allLessonTypes =
    lessonTypesRes.status === "fulfilled" ? lessonTypesRes.value.data : []

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const activeCoaches = allCoaches.filter((c) => c.isActive)
  const inactiveCoaches = allCoaches.filter((c) => !c.isActive)
  const activeLessonTypes = allLessonTypes.filter((lt) => lt.isActive)
  const inactiveLessonTypes = allLessonTypes.filter((lt) => !lt.isActive)

  const prices = activeLessonTypes.map((lt) => parseFloat(lt.pricePerSession))
  const avgPrice =
    prices.length > 0 ? prices.reduce((s, p) => s + p, 0) / prices.length : 0
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0

  // Coaches with no lesson types assigned
  const coachesWithNoTypes = activeCoaches.filter(
    (c) => !c.lessonTypes || c.lessonTypes.length === 0
  )

  // ── Sport breakdown (from lesson types) ──────────────────────────────────
  const sportMap: Record<string, { count: number; revenue: number }> = {}
  for (const lt of activeLessonTypes) {
    const sport = lt.sport ?? "unspecified"
    if (!sportMap[sport]) sportMap[sport] = { count: 0, revenue: 0 }
    sportMap[sport].count += 1
    sportMap[sport].revenue += parseFloat(lt.pricePerSession)
  }
  const sportSlices = Object.entries(sportMap)
    .map(([label, v]) => ({ label, value: v.count }))
    .sort((a, b) => b.value - a.value)

  const sportRevenueRows = Object.entries(sportMap)
    .filter(([, v]) => v.revenue > 0)
    .map(([label, v]) => ({
      label,
      value: Math.round(v.revenue * 100) / 100,
      valueFormatted: formatCurrency(v.revenue),
    }))
    .sort((a, b) => b.value - a.value)

  // ── Specialty coverage (from coaches) ────────────────────────────────────
  const specialtyMap: Record<string, number> = {}
  for (const coach of activeCoaches) {
    for (const s of coach.specialties ?? []) {
      specialtyMap[s] = (specialtyMap[s] ?? 0) + 1
    }
  }
  const specialtyRows = Object.entries(specialtyMap)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)

  // ── Duration breakdown ───────────────────────────────────────────────────
  const durationBuckets: Record<string, number> = {}
  for (const lt of activeLessonTypes) {
    const label = `${lt.durationMinutes} min`
    durationBuckets[label] = (durationBuckets[label] ?? 0) + 1
  }
  const durationRows = Object.entries(durationBuckets)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => parseInt(a.label) - parseInt(b.label))

  // ── Price distribution (sorted by price) ─────────────────────────────────
  const priceRows = [...activeLessonTypes]
    .sort((a, b) => parseFloat(b.pricePerSession) - parseFloat(a.pricePerSession))
    .slice(0, 15)
    .map((lt) => ({
      label: lt.name,
      value: parseFloat(lt.pricePerSession),
      valueFormatted: formatCurrency(parseFloat(lt.pricePerSession)),
    }))

  // ── Lesson types per coach ───────────────────────────────────────────────
  const lessonTypesPerCoach = activeCoaches
    .map((c) => ({
      label: c.displayName,
      value: c.lessonTypes?.length ?? 0,
    }))
    .sort((a, b) => b.value - a.value)

  // ── Export columns ───────────────────────────────────────────────────────
  const coachExportColumns = [
    { key: "displayName", header: "Name" },
    { key: "isActive", header: "Active" },
    { key: "specialties", header: "Specialties" },
    { key: "lessonTypeCount", header: "Lesson Types" },
    { key: "createdAt", header: "Created" },
  ]

  const ltExportColumns = [
    { key: "name", header: "Name" },
    { key: "sport", header: "Sport" },
    { key: "durationMinutes", header: "Duration (mins)" },
    { key: "maxParticipants", header: "Max Participants" },
    { key: "pricePerSession", header: "Price (£)" },
    { key: "currency", header: "Currency" },
    { key: "isActive", header: "Active" },
  ]

  const coachExportData = allCoaches.map((c) => ({
    ...c,
    specialties: (c.specialties ?? []).join(", "),
    lessonTypeCount: c.lessonTypes?.length ?? 0,
  }))

  return (
    <PortalLayout
      title="Coaching Report"
      description="Coach roster health, lesson type catalogue, sport coverage and pricing analysis."
    >
      <div className="space-y-6">

        {/* KPI row */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">Active coaches</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{activeCoaches.length}</div>
            <div className="mt-1 text-xs text-slate-400">
              {inactiveCoaches.length} inactive
              {coachesWithNoTypes.length > 0 && (
                <span className="ml-2 text-amber-500">· {coachesWithNoTypes.length} with no lesson types</span>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5 shadow-sm">
            <div className="text-sm font-medium text-indigo-700">Active lesson types</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{activeLessonTypes.length}</div>
            <div className="mt-1 text-xs text-slate-400">{inactiveLessonTypes.length} inactive</div>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm">
            <div className="text-sm font-medium text-emerald-700">Avg price per session</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{formatCurrency(avgPrice)}</div>
            <div className="mt-1 text-xs text-slate-400">
              {formatCurrency(minPrice)} – {formatCurrency(maxPrice)}
            </div>
          </div>
          <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-5 shadow-sm">
            <div className="text-sm font-medium text-violet-700">Sports covered</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{sportSlices.filter(s => s.label !== 'unspecified').length}</div>
            <div className="mt-1 text-xs text-slate-400">{sportSlices.length} total categories incl. unspecified</div>
          </div>
        </div>

        {/* Coaches with no lesson types — amber warning */}
        {coachesWithNoTypes.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm">
            <div className="text-sm font-semibold text-amber-800">
              {coachesWithNoTypes.length} active {coachesWithNoTypes.length === 1 ? "coach has" : "coaches have"} no lesson types assigned
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {coachesWithNoTypes.map((c) => (
                <span key={c.id} className="rounded-full bg-amber-100 px-3 py-0.5 text-xs font-medium text-amber-800">
                  {c.displayName}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Sport and specialty breakdown */}
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Lesson types by sport</h3>
            {sportSlices.length > 0 ? (
              <DonutChart
                slices={sportSlices}
                colours={["#1857E0", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#f97316"]}
              />
            ) : (
              <p className="text-sm text-slate-400">No lesson type data.</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Coach specialties coverage</h3>
            {specialtyRows.length > 0 ? (
              <HBarChart rows={specialtyRows} colour="#1857E0" />
            ) : (
              <p className="text-sm text-slate-400">No specialty data recorded on coaches.</p>
            )}
          </div>
        </div>

        {/* Pricing and duration */}
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-1 text-base font-semibold text-slate-900">Session price by lesson type</h3>
            <p className="mb-4 text-xs text-slate-400">Active lesson types, highest priced first (top 15)</p>
            {priceRows.length > 0 ? (
              <HBarChart rows={priceRows} colour="#10b981" />
            ) : (
              <p className="text-sm text-slate-400">No active lesson types with pricing.</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-1 text-base font-semibold text-slate-900">Lesson types by duration</h3>
            <p className="mb-4 text-xs text-slate-400">Active types only</p>
            {durationRows.length > 0 ? (
              <VBarChart rows={durationRows} colour="#6366f1" />
            ) : (
              <p className="text-sm text-slate-400">No duration data available.</p>
            )}
          </div>
        </div>

        {/* Price by sport */}
        {sportRevenueRows.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-1 text-base font-semibold text-slate-900">Catalogue value by sport</h3>
            <p className="mb-4 text-xs text-slate-400">Sum of session prices across active lesson types per sport</p>
            <HBarChart rows={sportRevenueRows} colour="#8b5cf6" />
          </div>
        )}

        {/* Lesson types per coach */}
        {lessonTypesPerCoach.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-1 text-base font-semibold text-slate-900">Lesson types per coach</h3>
            <p className="mb-4 text-xs text-slate-400">Active coaches only</p>
            <HBarChart rows={lessonTypesPerCoach} colour="#1857E0" />
          </div>
        )}

        {/* Coach roster table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-semibold text-slate-900">Coach roster ({allCoaches.length})</h3>
            <ExportButton
              data={coachExportData as unknown as Record<string, unknown>[]}
              filename="coaches-report.csv"
              columns={coachExportColumns}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  {["Coach", "Status", "Specialties", "Lesson types", "Assigned types"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allCoaches.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium text-slate-800">{c.displayName}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}>
                        {c.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {(c.specialties ?? []).length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {c.specialties.map((s) => (
                            <span key={s} className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700 capitalize">{s}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {c.lessonTypes?.length ?? 0}
                    </td>
                    <td className="px-4 py-2 text-slate-500 text-xs max-w-xs">
                      {(c.lessonTypes ?? []).length > 0
                        ? c.lessonTypes!.map((lt) => lt.lessonType.name).join(", ")
                        : <span className="text-amber-500">None assigned</span>
                      }
                    </td>
                  </tr>
                ))}
                {allCoaches.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-400">
                      No coaches found. Add coaches in the Coaching section.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lesson types table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-semibold text-slate-900">
              Lesson type catalogue ({allLessonTypes.length})
            </h3>
            <ExportButton
              data={allLessonTypes as unknown as Record<string, unknown>[]}
              filename="lesson-types-report.csv"
              columns={ltExportColumns}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  {["Name", "Sport", "Duration", "Max participants", "Price/session", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...allLessonTypes]
                  .sort((a, b) => parseFloat(b.pricePerSession) - parseFloat(a.pricePerSession))
                  .map((lt) => (
                    <tr key={lt.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-medium text-slate-800">{lt.name}</td>
                      <td className="px-4 py-2 text-slate-600 capitalize">{lt.sport ?? "—"}</td>
                      <td className="px-4 py-2 text-slate-600">{lt.durationMinutes} min</td>
                      <td className="px-4 py-2 text-slate-600">{lt.maxParticipants}</td>
                      <td className="px-4 py-2 font-semibold text-emerald-700">
                        {parseFloat(lt.pricePerSession) > 0 ? formatCurrency(parseFloat(lt.pricePerSession)) : "—"}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          lt.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                        }`}>
                          {lt.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                {allLessonTypes.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-400">
                      No lesson types defined yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PortalLayout>
  )
}
