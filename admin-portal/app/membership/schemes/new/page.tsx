import { redirect } from "next/navigation"
import { createMembershipScheme } from "@/lib/api"
import { PortalLayout } from "@/components/portal-layout"

async function createSchemeAction(formData: FormData) {
  "use server"

  const name = String(formData.get("name") || "").trim()
  const description = String(formData.get("description") || "").trim()
  const status = String(formData.get("status") || "active").trim()

  if (!name) {
    throw new Error("Scheme name is required")
  }

  await createMembershipScheme({
    name,
    description: description || undefined,
    status: status || "active",
  })

  redirect("/membership/schemes")
}

export default function NewMembershipSchemePage() {
  return (
    <PortalLayout
      title="Create Membership Scheme"
      description="Add a new top level membership structure for the organisation."
    >
      <div className="max-w-3xl">
        <form
          action={createSchemeAction}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="space-y-5">
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
                placeholder="Club Membership"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                required
              />
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
                placeholder="Core club membership products"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
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
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="inline-flex items-center rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1832A8]"
              >
                Save Scheme
              </button>
            </div>
          </div>
        </form>
      </div>
    </PortalLayout>
  )
}