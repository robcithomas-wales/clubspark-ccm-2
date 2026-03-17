import { redirect } from "next/navigation"
import { PortalLayout } from "@/components/portal-layout"
import {
  createAddOnService,
  getVenues,
  type AddOnInventoryMode,
  type AddOnPricingType,
  type AddOnResourceType,
  type AddOnServiceCategory,
  type AddOnServiceStatus,
} from "@/lib/api"

async function createAddOnAction(formData: FormData) {
  "use server"

  const venueId = String(formData.get("venueId") || "").trim()
  const name = String(formData.get("name") || "").trim()
  const code = String(formData.get("code") || "").trim()
  const description = String(formData.get("description") || "").trim()

  const category = String(formData.get("category") || "").trim() as AddOnServiceCategory
  const status = String(formData.get("status") || "active").trim() as AddOnServiceStatus
  const pricingType = String(formData.get("pricingType") || "fixed").trim() as AddOnPricingType
  const inventoryMode = String(formData.get("inventoryMode") || "unlimited").trim() as AddOnInventoryMode

  const currency = String(formData.get("currency") || "GBP").trim()
  const price = Number(formData.get("price") || 0)

  const totalInventoryRaw = String(formData.get("totalInventory") || "").trim()
  const totalInventory =
    totalInventoryRaw.length > 0 ? Number(totalInventoryRaw) : undefined

  const allowedResourceTypes = formData
    .getAll("allowedResourceTypes")
    .map((value) => String(value).trim())
    .filter(Boolean) as AddOnResourceType[]

  if (!name) throw new Error("Name is required")
  if (!code) throw new Error("Code is required")
  if (!category) throw new Error("Category is required")

  await createAddOnService({
    venueId: venueId || undefined,
    name,
    code,
    description: description || undefined,
    category,
    status,
    pricingType,
    price,
    currency,
    inventoryMode,
    totalInventory,
    allowedResourceTypes,
  })

  redirect("/add-ons")
}

export default async function NewAddOnPage() {
  const venuesResponse = await getVenues()
  const venues = venuesResponse.data || venuesResponse || []

  return (
    <PortalLayout
      title="Create Product Add-On"
      description="Add a product that can be sold alongside a booking — tubes of balls, coaching extras, access cards, etc. Bookable resources like changing rooms or ball machines are configured as Bookable Units."
    >
      <div className="w-full">
        <form
          action={createAddOnAction}
          className="space-y-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-md"
        >
          <section className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Product Details</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Define the product identity and where it applies.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="Tube of Balls"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="code"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Code
                </label>
                <input
                  id="code"
                  name="code"
                  type="text"
                  required
                  placeholder="BALLS_TUBE"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="category"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Category
                </label>
                <select
                  id="category"
                  name="category"
                  required
                  defaultValue="product"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none"
                >
                  <option value="product">Product</option>
                  <option value="equipment">Equipment</option>
                  <option value="service">Service</option>
                  <option value="access">Access</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="venueId"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Venue
                </label>
                <select
                  id="venueId"
                  name="venueId"
                  defaultValue=""
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none"
                >
                  <option value="">All venues</option>
                  {venues.map((venue: any) => (
                    <option key={venue.id} value={venue.id}>
                      {venue.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="description"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                placeholder="Optional description visible to staff."
                className="min-h-[100px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none"
              />
            </div>
          </section>

          <section className="space-y-5 border-t border-slate-200 pt-8">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Pricing</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Define whether the product is included or charged separately.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label
                  htmlFor="pricingType"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Pricing Type
                </label>
                <select
                  id="pricingType"
                  name="pricingType"
                  defaultValue="fixed"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none"
                >
                  <option value="fixed">Fixed</option>
                  <option value="included">Included</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="price"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Price
                </label>
                <input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue="0"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="currency"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Currency
                </label>
                <select
                  id="currency"
                  name="currency"
                  defaultValue="GBP"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none"
                >
                  <option value="GBP">GBP</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>
          </section>

          <section className="space-y-5 border-t border-slate-200 pt-8">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Inventory</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Control stock levels for this product.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label
                  htmlFor="status"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  defaultValue="active"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="inventoryMode"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Inventory Mode
                </label>
                <select
                  id="inventoryMode"
                  name="inventoryMode"
                  defaultValue="unlimited"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none"
                >
                  <option value="unlimited">Unlimited</option>
                  <option value="shared_pool">Limited pool</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="totalInventory"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Total Inventory
                </label>
                <input
                  id="totalInventory"
                  name="totalInventory"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Optional"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none"
                />
              </div>
            </div>
          </section>

          <section className="space-y-5 border-t border-slate-200 pt-8">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Allowed Resource Types</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Restrict this product to one or more sport/resource types. Leave blank to allow on all.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {[
                { value: "tennis", label: "Tennis" },
                { value: "football", label: "Football" },
                { value: "padel", label: "Padel" },
                { value: "cricket", label: "Cricket" },
              ].map((resourceType) => (
                <label
                  key={resourceType.value}
                  className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700 shadow-sm transition hover:border-blue-300 hover:shadow-md"
                >
                  <input
                    type="checkbox"
                    name="allowedResourceTypes"
                    value={resourceType.value}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900"
                  />
                  <div>
                    <div className="font-semibold text-slate-900">
                      {resourceType.label}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </section>

          <div className="border-t border-slate-100 pt-6">
            <button
              type="submit"
              className="inline-flex items-center rounded-xl bg-[#1857E0] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#174ED0]"
            >
              Save Product
            </button>
          </div>
        </form>
      </div>
    </PortalLayout>
  )
}
