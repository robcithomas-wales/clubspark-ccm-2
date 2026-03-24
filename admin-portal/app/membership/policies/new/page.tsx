import Link from "next/link"
import { redirect } from "next/navigation"
import { createEntitlementPolicy } from "@/lib/api"
import { PortalLayout } from "@/components/portal-layout"

async function createPolicyAction(formData: FormData) {
  "use server"

  const name = String(formData.get("name") || "").trim()
  const policyType = String(formData.get("policyType") || "").trim()
  const description = String(formData.get("description") || "").trim()
  const status = String(formData.get("status") || "active").trim()

  if (!name) {
    throw new Error("Policy name is required")
  }

  if (!policyType) {
    throw new Error("Policy type is required")
  }

  const result = await createEntitlementPolicy({
    name,
    policyType,
    description: description || undefined,
    status: status as "active" | "draft" | "inactive",
  })

  const id = result?.data?.id ?? result?.id
  redirect(id ? `/membership/policies/${id}` : "/membership/policies")
}

const policyTypes = [
  { value: "advance_booking", label: "Advance Booking" },
  { value: "booking_window", label: "Booking Window" },
  { value: "eligible_days", label: "Eligible Days" },
  { value: "peak_access", label: "Peak Access" },
]

export default function NewMembershipPolicyPage() {
  return (
    <PortalLayout
      title="Create Membership Policy"
      description="Add a reusable entitlement policy that can be attached to membership plans."
    >
      <div className="max-w-3xl">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Policy Details
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Define a reusable rule such as advance booking access, booking windows or eligible days.
            </p>
          </div>

          <form action={createPolicyAction} className="px-6 py-6">
            <div className="grid gap-6">
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
                  placeholder="e.g. Advance Booking Seven Days"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#1832A8] focus:ring-4 focus:ring-blue-100"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="policyType"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Policy Type
                </label>
                <select
                  id="policyType"
                  name="policyType"
                  defaultValue=""
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#1832A8] focus:ring-4 focus:ring-blue-100"
                  required
                >
                  <option value="" disabled>
                    Select a policy type
                  </option>
                  {policyTypes.map((policyType) => (
                    <option key={policyType.value} value={policyType.value}>
                      {policyType.label}
                    </option>
                  ))}
                </select>
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
                  rows={5}
                  placeholder="Describe what this policy controls and how it should be used."
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#1832A8] focus:ring-4 focus:ring-blue-100"
                />
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
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#1832A8] focus:ring-4 focus:ring-blue-100"
                >
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-end gap-3">
              <Link
                href="/membership/policies"
                className="inline-flex items-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </Link>

              <button
                type="submit"
                className="inline-flex items-center rounded-2xl bg-[#1832A8] px-5 py-3 text-sm font-semibold !text-white shadow-sm transition hover:bg-[#142a8c]"
              >
                Create Policy
              </button>
            </div>
          </form>
        </div>
      </div>
    </PortalLayout>
  )
}