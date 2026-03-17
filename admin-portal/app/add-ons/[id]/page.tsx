import Link from "next/link"
import { ArrowLeft, Pencil } from "lucide-react"
import { PortalLayout } from "@/components/portal-layout"
import { getAddOnServiceById } from "@/lib/api"

function formatPrice(price?: number, currency?: string) {
  if (price == null) return "—"

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency || "GBP",
  }).format(price)
}

function formatBoolean(value?: boolean) {
  return value ? "Yes" : "No"
}

function DetailItem({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-sm font-medium text-slate-900">{value}</div>
    </div>
  )
}

export default async function AddOnDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const response = await getAddOnServiceById(id)
  const addOn = response.data || response

  return (
    <PortalLayout
      title={addOn.name || "Add On"}
      description="View the operational, pricing, timing, and applicability settings for this add on."
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/add-ons"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Add Ons
          </Link>

          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 rounded-xl bg-slate-200 px-4 py-2 text-sm font-medium text-slate-500"
          >
            <Pencil className="h-4 w-4" />
            Edit Add On
          </button>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-md">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                  {addOn.name}
                </h2>

                <span
                  className={[
                    "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                    addOn.status === "active"
                      ? "bg-emerald-50 text-emerald-700"
                      : addOn.status === "inactive"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-slate-100 text-slate-700",
                  ].join(" ")}
                >
                  {addOn.status || "unknown"}
                </span>
              </div>

              <div className="mt-2 text-sm text-slate-500">
                {addOn.code || "No code"}
              </div>

              {addOn.description ? (
                <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
                  {addOn.description}
                </p>
              ) : (
                <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400">
                  No description provided.
                </p>
              )}
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-[360px]">
              <DetailItem
                label="Category"
                value={addOn.category || "—"}
              />
              <DetailItem
                label="Venue"
                value={addOn.venueName || addOn.venueId || "All venues"}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-950">
                Pricing and Inventory
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Commercial and stock settings for this add on.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <DetailItem
                label="Pricing Type"
                value={addOn.pricingType || "—"}
              />
              <DetailItem
                label="Price"
                value={
                  addOn.pricingType === "included"
                    ? "Included"
                    : formatPrice(addOn.price, addOn.currency)
                }
              />
              <DetailItem
                label="Currency"
                value={addOn.currency || "GBP"}
              />
              <DetailItem
                label="Inventory Mode"
                value={addOn.inventoryMode || "—"}
              />
              <DetailItem
                label="Total Inventory"
                value={
                  addOn.totalInventory != null ? String(addOn.totalInventory) : "—"
                }
              />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-950">
                Usage and Timing
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Operational behaviour and booking time settings.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <DetailItem
                label="Requires Primary Booking"
                value={formatBoolean(addOn.requiresPrimaryBooking)}
              />
              <DetailItem
                label="Time Bound"
                value={formatBoolean(addOn.isTimeBound)}
              />
              <DetailItem
                label="Start Offset (mins)"
                value={String(addOn.defaultStartOffsetMinutes ?? 0)}
              />
              <DetailItem
                label="End Offset (mins)"
                value={String(addOn.defaultEndOffsetMinutes ?? 0)}
              />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-950">
              Allowed Resource Types
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              This controls which types of facilities this add on can be used with.
            </p>
          </div>

          {Array.isArray(addOn.allowedResourceTypes) &&
          addOn.allowedResourceTypes.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {addOn.allowedResourceTypes.map((resourceType: string) => (
                <span
                  key={resourceType}
                  className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700"
                >
                  {resourceType}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-500">All resource types</div>
          )}
        </div>
      </div>
    </PortalLayout>
  )
}