import Link from "next/link"
import { Plus, Building2, CheckCircle2, AlertCircle, XCircle } from "lucide-react"
import { getOrganisations } from "@/lib/api"
import { InternalShell } from "@/components/internal-shell"

const PLAN_COLOURS: Record<string, string> = {
  trial: "bg-slate-100 text-slate-600",
  starter: "bg-blue-50 text-blue-700",
  pro: "bg-violet-50 text-violet-700",
  enterprise: "bg-amber-50 text-amber-700",
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  active: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  suspended: <AlertCircle className="h-4 w-4 text-amber-500" />,
  churned: <XCircle className="h-4 w-4 text-slate-400" />,
}

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string; plan?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)

  let orgs: Awaited<ReturnType<typeof getOrganisations>>["data"] = []
  let pagination: Awaited<ReturnType<typeof getOrganisations>>["pagination"] | null = null
  try {
    const result = await getOrganisations(page, 50, {
      search: params.search,
      status: params.status,
      plan: params.plan,
    })
    orgs = result.data
    pagination = result.pagination
  } catch {}

  return (
    <InternalShell title="Account Lookup" description="Search and inspect all organisations on the platform.">
      <div className="space-y-4">
        {/* Filters */}
        <form method="GET" className="flex flex-wrap items-center gap-3">
          <input
            name="search"
            defaultValue={params.search ?? ""}
            placeholder="Search name, email, slug…"
            className="h-9 w-72 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-orange-400"
          />
          <select name="status" defaultValue={params.status ?? ""} className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="churned">Churned</option>
          </select>
          <select name="plan" defaultValue={params.plan ?? ""} className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none">
            <option value="">All plans</option>
            <option value="trial">Trial</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
          <button type="submit" className="h-9 rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white hover:bg-orange-600 transition">Search</button>
          <Link href="/accounts" className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-600 hover:bg-slate-50">Clear</Link>
        </form>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <span className="text-sm font-semibold text-slate-700">{pagination?.total ?? 0} organisations</span>
          </div>

          {orgs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-20 text-sm text-slate-400">
              <Building2 className="h-10 w-10 text-slate-200" />
              No organisations found
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-2.5 text-left font-medium">Organisation</th>
                  <th className="px-5 py-2.5 text-left font-medium">Plan</th>
                  <th className="px-5 py-2.5 text-left font-medium">Status</th>
                  <th className="px-5 py-2.5 text-left font-medium">Onboarding</th>
                  <th className="px-5 py-2.5 text-left font-medium">Payment</th>
                  <th className="px-5 py-2.5 text-left font-medium">Flags</th>
                  <th className="px-5 py-2.5 text-left font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {orgs.map((org) => (
                  <tr key={org.id} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-3">
                      <Link href={`/accounts/${org.tenantId}`} className="group">
                        <div className="font-semibold text-slate-900 group-hover:text-orange-600 transition">{org.name}</div>
                        <div className="text-xs text-slate-400">{org.adminEmail ?? org.slug ?? org.tenantId.slice(0, 8)}</div>
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PLAN_COLOURS[org.plan] ?? PLAN_COLOURS.trial}`}>
                        {org.plan}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        {STATUS_ICON[org.status]}
                        <span className="text-slate-700 capitalize">{org.status}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-orange-400" style={{ width: `${org.onboardingPct}%` }} />
                        </div>
                        <span className="text-xs text-slate-500">{org.onboardingPct}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {org.paymentConnected
                        ? <span className="text-xs font-medium text-emerald-600">Connected</span>
                        : <span className="text-xs text-slate-400">Not connected</span>}
                    </td>
                    <td className="px-5 py-3">
                      <Link href={`/accounts/${org.tenantId}/flags`} className="text-xs font-medium text-slate-500 hover:text-orange-600 transition">
                        {org.featureFlags.filter(f => f.enabled).length} active
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-400">
                      {new Date(org.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
              <span>Page {page} of {pagination.totalPages}</span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link href={`/accounts?page=${page - 1}${params.search ? `&search=${params.search}` : ""}${params.status ? `&status=${params.status}` : ""}${params.plan ? `&plan=${params.plan}` : ""}`}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1 hover:bg-slate-50">← Prev</Link>
                )}
                {page < pagination.totalPages && (
                  <Link href={`/accounts?page=${page + 1}${params.search ? `&search=${params.search}` : ""}${params.status ? `&status=${params.status}` : ""}${params.plan ? `&plan=${params.plan}` : ""}`}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1 hover:bg-slate-50">Next →</Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </InternalShell>
  )
}
