import Link from "next/link"
import { Plus } from "lucide-react"
import { getProducts } from "@/lib/api"
import { PortalLayout } from "@/components/portal-layout"
import { PaginationBar } from "@/components/pagination-bar"

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  booking_slot: "Booking slot",
  programme_enrolment: "Programme enrolment",
  membership: "Membership",
  add_on: "Add-on",
  competition_entry: "Competition entry",
  match_fee: "Match fee",
  coach_session: "Coach session",
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; productType?: string; isActive?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)
  const isActive = params.isActive !== undefined ? params.isActive !== "false" : undefined

  let products: Awaited<ReturnType<typeof getProducts>>["data"] = []
  let pagination: Awaited<ReturnType<typeof getProducts>>["pagination"] | null = null
  try {
    const result = await getProducts(page, 50, { productType: params.productType, isActive })
    products = result.data
    pagination = result.pagination
  } catch {}

  return (
    <PortalLayout title="Product catalogue" description="Sellable items and pricing — the canonical commerce layer.">
      <div className="space-y-6">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Products</h2>
              <p className="mt-1 text-sm text-slate-500">{pagination?.total ?? 0} total</p>
            </div>
            <Link
              href="/products/new"
              className="inline-flex items-center gap-2 rounded-xl bg-[#1832A8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#142a8c]"
            >
              <Plus className="h-4 w-4" /> New product
            </Link>
          </div>

          {/* Filters */}
          <form method="GET" className="flex flex-wrap gap-3 border-b border-slate-100 bg-slate-50 px-6 py-3">
            <select name="productType" defaultValue={params.productType ?? ""} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none">
              <option value="">All types</option>
              {Object.entries(PRODUCT_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <select name="isActive" defaultValue={params.isActive ?? ""} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none">
              <option value="">All statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            <button type="submit" className="h-9 rounded-lg bg-[#1832A8] px-4 text-sm font-medium text-white hover:bg-[#142a8c]">Filter</button>
            <Link href="/products" className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50">Clear</Link>
          </form>

          {products.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-slate-500">
              No products found. <Link href="/products/new" className="text-[#1832A8] underline">Create the first one.</Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {products.map((p) => {
                const activePrice = p.prices.find(pr => pr.isActive && pr.priceType === "standard")
                return (
                  <Link key={p.id} href={`/products/${p.id}`} className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50 transition">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-slate-900 truncate">{p.name}</span>
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${p.isActive ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : "bg-slate-100 text-slate-500 ring-slate-400/20"}`}>
                          {p.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span>{PRODUCT_TYPE_LABELS[p.productType] ?? p.productType}</span>
                        {p.description && <span className="truncate max-w-xs">{p.description}</span>}
                        <span>{p.prices.length} price{p.prices.length !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-sm font-semibold text-slate-700">
                      {activePrice ? `£${Number(activePrice.amount).toFixed(2)}` : "—"}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="border-t border-slate-100 px-6 py-4">
              <PaginationBar page={page} totalPages={pagination.totalPages} total={pagination.total} limit={50} basePath="/products" />
            </div>
          )}
        </section>
      </div>
    </PortalLayout>
  )
}
