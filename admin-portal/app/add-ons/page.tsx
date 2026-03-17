import Link from "next/link"
import { Plus, Package } from "lucide-react"
import { PortalLayout } from "@/components/portal-layout"
import { getAddOnServices } from "@/lib/api"

function formatPrice(price?: number, currency?: string) {
  if (price == null) return "—"

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency || "GBP",
  }).format(price)
}

export default async function AddOnsPage() {
  const response = await getAddOnServices()
  const addOns = response.data || []

  return (
    <PortalLayout
      title="Product Add-Ons"
      description="Manage products sold alongside bookings — tubes of balls, coaching extras, access cards, and similar items. Bookable resource extras like changing rooms or ball machines are configured as Bookable Units."
    >
      <div className="space-y-6">
        <div className="flex items-center justify-end">
          <Link
            href="/add-ons/new"
            className="inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-medium !text-white shadow-sm transition hover:bg-[#174ED0]"
          >
            <Plus className="h-4 w-4" />
            Create Product
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
          {addOns.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1857E0]/10">
                <Package className="h-7 w-7 text-[#1857E0]" />
              </div>

              <h2 className="text-lg font-semibold text-slate-900">
                No products created yet
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                Create products that can be sold alongside bookings — tubes of
                balls, coaching extras, access cards, and similar items.
              </p>

              <Link
                href="/add-ons/new"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-5 py-2.5 text-sm font-semibold !text-white shadow-sm transition hover:bg-[#174ED0]"
              >
                <Plus className="h-4 w-4" />
                Create Product
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Venue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Resource Types
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Inventory
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 bg-white">
                  {addOns.map((addOn: any) => (
                    <tr key={addOn.id} className="cursor-pointer transition hover:bg-blue-50/40">
                      <td className="p-0">
                        <Link href={`/add-ons/${addOn.id}`} className="block px-6 py-4">
                          <div className="font-medium text-slate-900">{addOn.name}</div>
                          {addOn.code && (
                            <div className="mt-1 text-xs text-slate-500">{addOn.code}</div>
                          )}
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={`/add-ons/${addOn.id}`} className="block px-6 py-4 text-sm text-slate-700">
                          {addOn.category || "—"}
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={`/add-ons/${addOn.id}`} className="block px-6 py-4 text-sm text-slate-700">
                          {addOn.venueName || addOn.venueId || "All venues"}
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={`/add-ons/${addOn.id}`} className="block px-6 py-4 text-sm text-slate-700">
                          {Array.isArray(addOn.allowedResourceTypes) && addOn.allowedResourceTypes.length > 0
                            ? addOn.allowedResourceTypes.join(", ")
                            : "All"}
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={`/add-ons/${addOn.id}`} className="block px-6 py-4 text-sm text-slate-700">
                          {addOn.pricingType === "included"
                            ? "Included"
                            : formatPrice(addOn.price, addOn.currency)}
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={`/add-ons/${addOn.id}`} className="block px-6 py-4 text-sm text-slate-700">
                          {addOn.inventoryMode === "shared_pool"
                            ? `Shared pool${addOn.totalInventory != null ? ` (${addOn.totalInventory})` : ""}`
                            : "Unlimited"}
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={`/add-ons/${addOn.id}`} className="block px-6 py-4">
                          <span className={[
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                            addOn.status === "active"
                              ? "bg-emerald-50 text-emerald-700"
                              : addOn.status === "inactive"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-slate-100 text-slate-700",
                          ].join(" ")}>
                            {addOn.status || "unknown"}
                          </span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  )
}