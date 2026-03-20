import { PortalLayout } from "@/components/portal-layout"
import { ExportButton } from "@/components/reports/export-button"
import { ReportFilters } from "@/components/reports/report-filters"
import { HBarChart, DonutChart } from "@/components/reports/charts"
import { getAddOnServices, getBookingStats } from "@/lib/api"
import { resolveReportRange, inRange, formatDateRange } from "@/lib/report-utils"

function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 2 }).format(v)
}

export default async function AddOnsReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const { from, to } = resolveReportRange(sp)
  const rangeLabel = formatDateRange(from, to)
  const statusFilter   = typeof sp.status   === "string" ? sp.status   : "all"
  const categoryFilter = typeof sp.category === "string" ? sp.category : "all"

  const [addOnsRes, statsRes] = await Promise.allSettled([
    getAddOnServices(),
    getBookingStats(),
  ])

  const addOnsData = addOnsRes.status === "fulfilled" ? addOnsRes.value : null
  const rawAddOns: any[] = Array.isArray(addOnsData)
    ? addOnsData
    : (addOnsData as any)?.data ?? []
  const stats = statsRes.status === "fulfilled" ? statsRes.value : null

  // Collect all categories for the filter dropdown (before filtering)
  const allCategories = [...new Set(rawAddOns.map((a) => a.category ?? "uncategorised"))].sort()

  // Filter by created date, status and category
  const addOns = rawAddOns.filter((a: any) => {
    if (!inRange(a.createdAt, from, to)) return false
    if (statusFilter !== "all" && a.status !== statusFilter) return false
    if (categoryFilter !== "all" && (a.category ?? "uncategorised") !== categoryFilter) return false
    return true
  })

  const activeAddOns   = addOns.filter((a) => a.status === "active")
  const inactiveAddOns = addOns.filter((a) => a.status !== "active")

  // By category
  const byCategory: Record<string, { count: number; catalogueValue: number }> = {}
  for (const a of addOns) {
    const cat = a.category ?? "uncategorised"
    if (!byCategory[cat]) byCategory[cat] = { count: 0, catalogueValue: 0 }
    byCategory[cat].count += 1
    byCategory[cat].catalogueValue += a.price ?? 0
  }
  const byCategoryRows = Object.entries(byCategory)
    .map(([label, v]) => ({ label, value: v.count, catalogueValue: v.catalogueValue }))
    .sort((a, b) => b.value - a.value)

  // Catalogue value by category
  const catalogueValueRows = byCategoryRows
    .filter((r) => r.catalogueValue > 0)
    .map((r) => ({ label: r.label, value: Math.round(r.catalogueValue * 100) / 100 }))
    .sort((a, b) => b.value - a.value)

  // By resource type
  const byResourceType: Record<string, number> = {}
  for (const a of addOns) {
    const rt = a.resourceType ?? "any"
    byResourceType[rt] = (byResourceType[rt] ?? 0) + 1
  }
  const byResourceTypeRows = Object.entries(byResourceType)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)

  // Price distribution — sort by price descending
  const sortedByPrice = [...addOns].sort((a, b) => (b.price ?? 0) - (a.price ?? 0))

  const totalCatalogueValue = addOns.reduce((s, a) => s + (a.price ?? 0), 0)
  const avgPrice = addOns.length > 0 ? totalCatalogueValue / addOns.length : 0

  const exportColumns = [
    { key: "name", header: "Name" },
    { key: "category", header: "Category" },
    { key: "resourceType", header: "Resource Type" },
    { key: "price", header: "Price (£)" },
    { key: "status", header: "Status" },
    { key: "description", header: "Description" },
    { key: "createdAt", header: "Created" },
  ]

  return (
    <PortalLayout title="Add-ons Report" description="Add-on catalogue analysis — pricing, categories and resource type coverage.">
      <div className="space-y-6">

        <ReportFilters
          rangeLabel={rangeLabel}
          extraFilters={[
            {
              key: "status",
              label: "Status",
              options: [
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ],
            },
            {
              key: "category",
              label: "Category",
              options: allCategories.map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) })),
            },
          ]}
        />

        {/* KPI row */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">Add-ons in range</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{addOns.length}</div>
            <div className="mt-1 text-xs text-slate-400">{activeAddOns.length} active / {inactiveAddOns.length} inactive</div>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm">
            <div className="text-sm font-medium text-emerald-700">Total add-on revenue</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{formatCurrency(stats?.addOnRevenue ?? 0)}</div>
            <div className="mt-1 text-xs text-slate-400">From active bookings (all time)</div>
          </div>
          <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-5 shadow-sm">
            <div className="text-sm font-medium text-sky-700">Avg catalogue price</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{formatCurrency(avgPrice)}</div>
            <div className="mt-1 text-xs text-slate-400">Across {addOns.length} add-ons</div>
          </div>
          <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-5 shadow-sm">
            <div className="text-sm font-medium text-violet-700">Categories</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{Object.keys(byCategory).length}</div>
            <div className="mt-1 text-xs text-slate-400">Add-on categories defined</div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {/* By category donut */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Add-ons by category</h3>
            {byCategoryRows.length > 0 ? (
              <DonutChart
                slices={byCategoryRows.map((r) => ({ label: r.label, value: r.value }))}
              />
            ) : (
              <p className="text-sm text-slate-400">No category data available.</p>
            )}
          </div>

          {/* By resource type */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Add-ons by resource type</h3>
            {byResourceTypeRows.length > 0 ? (
              <HBarChart rows={byResourceTypeRows} colour="#8b5cf6" />
            ) : (
              <p className="text-sm text-slate-400">No resource type data available.</p>
            )}
          </div>
        </div>

        {/* Catalogue value by category */}
        {catalogueValueRows.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Catalogue price total by category</h3>
            <HBarChart
              rows={catalogueValueRows}
              colour="#10b981"
              formatValue={(v) => `£${v.toFixed(2)}`}
            />
          </div>
        )}

        {/* Add-on catalogue table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-semibold text-slate-900">Filtered add-ons ({addOns.length})</h3>
            <ExportButton
              data={addOns as unknown as Record<string, unknown>[]}
              filename="addons-report.csv"
              columns={exportColumns}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  {["Name", "Category", "Resource type", "Price", "Status", "Description"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedByPrice.map((a: any) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium text-slate-800">{a.name}</td>
                    <td className="px-4 py-2 text-slate-600 capitalize">{a.category ?? "—"}</td>
                    <td className="px-4 py-2 text-slate-600">{a.resourceType ?? "Any"}</td>
                    <td className="px-4 py-2 font-semibold text-emerald-700">
                      {a.price != null ? formatCurrency(a.price) : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        a.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                      }`}>
                        {a.status ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-500 max-w-xs truncate">{a.description ?? "—"}</td>
                  </tr>
                ))}
                {addOns.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-400">No add-ons found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PortalLayout>
  )
}
