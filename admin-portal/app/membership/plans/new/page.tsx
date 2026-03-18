import { redirect } from "next/navigation"
import { createMembershipPlan, getEntitlementPolicies, getMembershipSchemes, updateMembershipPlanEntitlements } from "@/lib/api"
import { PortalLayout } from "@/components/portal-layout"

async function createPlanAction(formData: FormData) {
  "use server"

  const schemeId = String(formData.get("schemeId") || "").trim()
  const name = String(formData.get("name") || "").trim()
  const code = String(formData.get("code") || "").trim()
  const description = String(formData.get("description") || "").trim()
  const ownershipType = String(formData.get("ownershipType") || "").trim() as
    | "person"
    | "household"
  const durationType = String(formData.get("durationType") || "").trim() as
    | "fixed"
    | "rolling"

  const visibility = String(formData.get("visibility") || "public").trim() as
    | "public"
    | "invite_only"
    | "admin_only"

  const status = String(formData.get("status") || "active").trim() as
    | "active"
    | "inactive"
    | "archived"
    | "draft"

  const membershipType = String(formData.get("membershipType") || "").trim() || undefined
  const sportCategory = String(formData.get("sportCategory") || "").trim() || undefined
  const pricingModel = String(formData.get("pricingModel") || "fixed").trim()
  const currency = String(formData.get("currency") || "GBP").trim()
  const billingInterval = String(formData.get("billingInterval") || "").trim() || undefined
  const priceRaw = String(formData.get("price") || "").trim()
  const price = priceRaw ? Number(priceRaw) : undefined
  const instalmentCountRaw = String(formData.get("instalmentCount") || "").trim()
  const instalmentCount = instalmentCountRaw ? Number(instalmentCountRaw) : undefined
  const sortOrder = Number(formData.get("sortOrder") || 0)
  const maxMembersRaw = String(formData.get("maxMembers") || "").trim()
  const maxMembers = maxMembersRaw ? Number(maxMembersRaw) : undefined
  const isPublic = formData.get("isPublic") === "on"

  const selectedPolicyIds = formData
    .getAll("policyIds")
    .map((value) => String(value).trim())
    .filter(Boolean)

  if (!schemeId) throw new Error("Scheme is required")
  if (!name) throw new Error("Name is required")
  if (!ownershipType) throw new Error("Ownership type is required")
  if (!durationType) throw new Error("Duration type is required")

  const created = await createMembershipPlan({
    schemeId,
    name,
    code: code || undefined,
    description: description || undefined,
    ownershipType,
    durationType,
    visibility,
    status,
    sortOrder,
    membershipType,
    sportCategory,
    maxMembers,
    isPublic,
    pricingModel,
    price,
    currency,
    billingInterval,
    instalmentCount,
  })

  const planId = created?.data?.id || created?.id

  if (!planId) {
    throw new Error("Plan created but no plan id was returned")
  }

  if (selectedPolicyIds.length > 0) {
    await updateMembershipPlanEntitlements(planId, {
      entitlements: selectedPolicyIds.map((policyId, index) => ({
        entitlementPolicyId: policyId,
        scopeType: "organisation",
        scopeId: null,
        configuration: {},
        priority: index,
      })),
    })
  }

  redirect(`/membership/plans/${planId}`)
}

export default async function NewMembershipPlanPage() {
  const [schemesResponse, policiesResponse] = await Promise.all([
  getMembershipSchemes(),
  getEntitlementPolicies(),
])

  const schemes = schemesResponse.data || []
  const policies = policiesResponse.data || []

  return (
    <PortalLayout
      title="Create Membership Plan"
      description="Add a new membership product under an existing scheme and attach policies."
    >
      <div>
        <form
          action={createPlanAction}
          className="space-y-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-md"
        >
          <section className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Plan Details</h2>
              <p className="mt-1 text-sm text-slate-500">
                Define the core identity and structure of the membership plan.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="schemeId" className="mb-2 block text-sm font-medium text-slate-700">Scheme</label>
                <select id="schemeId" name="schemeId" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none" required defaultValue="">
                  <option value="" disabled>Select a scheme</option>
                  {schemes.map((scheme: any) => (
                    <option key={scheme.id} value={scheme.id}>{scheme.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="name" className="mb-2 block text-sm font-medium text-slate-700">Name</label>
                <input id="name" name="name" type="text" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none" placeholder="Adult Annual" required />
              </div>

              <div>
                <label htmlFor="membershipType" className="mb-2 block text-sm font-medium text-slate-700">Membership Type</label>
                <select id="membershipType" name="membershipType" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none" defaultValue="individual">
                  <option value="individual">Individual</option>
                  <option value="family">Family</option>
                  <option value="group">Group</option>
                  <option value="team">Team</option>
                  <option value="organisation">Organisation</option>
                </select>
              </div>

              <div>
                <label htmlFor="ownershipType" className="mb-2 block text-sm font-medium text-slate-700">Ownership</label>
                <select id="ownershipType" name="ownershipType" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none" defaultValue="person">
                  <option value="person">Person</option>
                  <option value="household">Household</option>
                </select>
              </div>

              <div>
                <label htmlFor="code" className="mb-2 block text-sm font-medium text-slate-700">Code</label>
                <input id="code" name="code" type="text" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none" placeholder="ADULT_ANNUAL" />
              </div>

              <div>
                <label htmlFor="sportCategory" className="mb-2 block text-sm font-medium text-slate-700">Sport Category</label>
                <input id="sportCategory" name="sportCategory" type="text" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none" placeholder="Tennis, Padel, Squash…" />
              </div>

              <div>
                <label htmlFor="maxMembers" className="mb-2 block text-sm font-medium text-slate-700">Max Members <span className="text-slate-400 font-normal">(family / group / team)</span></label>
                <input id="maxMembers" name="maxMembers" type="number" min="0" step="1" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none" placeholder="Optional" />
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
                className="min-h-[120px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none"
                placeholder="Standard adult annual membership with general court access."
              />
            </div>
          </section>

          <section className="space-y-5 border-t border-slate-200 pt-8">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Commercial Settings</h2>
<p className="mt-1 text-sm leading-6 text-slate-500">
                Define the price and billing structure for this plan.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label htmlFor="pricingModel" className="mb-2 block text-sm font-medium text-slate-700">Pricing Model</label>
                <select id="pricingModel" name="pricingModel" defaultValue="fixed" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none">
                  <option value="fixed">Fixed (one-off)</option>
                  <option value="recurring">Recurring</option>
                  <option value="instalment">Instalment plan</option>
                  <option value="variable">Variable (pay on account)</option>
                </select>
              </div>

              <div>
                <label htmlFor="price" className="mb-2 block text-sm font-medium text-slate-700">Price</label>
                <input id="price" name="price" type="number" min="0" step="0.01" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none" placeholder="0.00" />
              </div>

              <div>
                <label htmlFor="currency" className="mb-2 block text-sm font-medium text-slate-700">Currency</label>
                <select id="currency" name="currency" defaultValue="GBP" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none">
                  <option value="GBP">GBP</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </div>

              <div>
                <label htmlFor="billingInterval" className="mb-2 block text-sm font-medium text-slate-700">Billing Interval <span className="text-slate-400 font-normal">(recurring)</span></label>
                <select id="billingInterval" name="billingInterval" defaultValue="" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none">
                  <option value="">N/A</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annual">Annual</option>
                </select>
              </div>

              <div>
                <label htmlFor="instalmentCount" className="mb-2 block text-sm font-medium text-slate-700">Instalments <span className="text-slate-400 font-normal">(if instalment plan)</span></label>
                <input id="instalmentCount" name="instalmentCount" type="number" min="2" step="1" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none" placeholder="e.g. 10" />
              </div>

              <div>
                <label htmlFor="durationType" className="mb-2 block text-sm font-medium text-slate-700">Duration Type</label>
                <select id="durationType" name="durationType" defaultValue="rolling" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none">
                  <option value="rolling">Rolling</option>
                  <option value="fixed">Fixed term</option>
                  <option value="seasonal">Seasonal</option>
                </select>
              </div>
            </div>
          </section>

          <section className="space-y-5 border-t border-slate-200 pt-8">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Availability and Status</h2>
              <p className="mt-1 text-sm text-slate-500">
                Control how this plan appears and whether it can be used operationally.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label
                  htmlFor="visibility"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Visibility
                </label>
                <select
                  id="visibility"
                  name="visibility"
                  defaultValue="public"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none"
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>

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
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="sortOrder"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Sort Order
                </label>
                <input
                  id="sortOrder"
                  name="sortOrder"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue="0"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="maxActiveMembers"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Max Active Members
                </label>
                <input
                  id="maxActiveMembers"
                  name="maxActiveMembers"
                  type="number"
                  min="0"
                  step="1"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none"
                  placeholder="Optional"
                />
              </div>
            </div>

            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
              <input
                type="checkbox"
                name="isPublic"
                className="h-4 w-4 rounded border-slate-300 text-slate-900"
              />
              <div>
                <div className="font-medium text-slate-900">Publicly available</div>
                <div className="mt-1 text-xs text-slate-500">
                  Show this plan in the public membership sign-up journey.
                </div>
              </div>
            </label>
          </section>

          <section className="space-y-5 border-t border-slate-200 pt-8">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Policies</h2>
              <p className="mt-1 text-sm text-slate-500">
                Attach one or more reusable policies to control access and entitlements.
              </p>
            </div>

            {policies.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                No policies found. Create policies first, then return to attach them to this plan.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {policies.map((policy: any) => (
                  <label
                    key={policy.id}
                    className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700 shadow-sm transition hover:border-blue-300 hover:shadow-md"
                  >
                    <input
                      type="checkbox"
                      name="policyIds"
                      value={policy.id}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900"
                    />
                    <div>
                      <div className="font-semibold text-slate-900">{policy.name}</div>
                      {policy.description ? (
                        <div className="mt-1 text-xs text-slate-500">{policy.description}</div>
                      ) : null}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </section>

          <div className="border-t border-slate-100 pt-6">
            <button
              type="submit"
              className="inline-flex items-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
            >
              Save Plan
            </button>
          </div>
        </form>
      </div>
    </PortalLayout>
  )
}