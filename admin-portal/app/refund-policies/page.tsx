import Link from "next/link"
import { Plus, RefreshCw } from "lucide-react"
import { PortalLayout } from "@/components/portal-layout"

const BOOKING_SERVICE = "http://127.0.0.1:4005"
const HEADERS = {
  "x-tenant-id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "x-organisation-id": "11111111-1111-1111-1111-111111111111",
}

async function getRefundPolicies() {
  try {
    const res = await fetch(`${BOOKING_SERVICE}/v1/refund-policies`, {
      headers: HEADERS,
      cache: "no-store",
    })
    if (!res.ok) return []
    const json = await res.json()
    return json.data ?? []
  } catch {
    return []
  }
}

export default async function RefundPoliciesPage() {
  const policies = await getRefundPolicies()

  return (
    <PortalLayout title="Refund Policies" description="Automatic refund rules applied when bookings are cancelled with sufficient notice">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div />
          <Link
            href="/refund-policies/new"
            className="inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-medium text-white hover:bg-[#1832A8] transition"
          >
            <Plus className="h-4 w-4" />
            New policy
          </Link>
        </div>

        {policies.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <RefreshCw className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-700">No refund policies yet</h3>
            <p className="mt-1 text-sm text-slate-400">Create a policy to automatically compute refunds when bookings are cancelled with sufficient notice.</p>
            <Link
              href="/refund-policies/new"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-medium text-white hover:bg-[#1832A8] transition"
            >
              <Plus className="h-4 w-4" />
              Create first policy
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 text-left">Name</th>
                  <th className="px-5 py-3 text-left">Notice required</th>
                  <th className="px-5 py-3 text-left">Refund %</th>
                  <th className="px-5 py-3 text-left">Scope</th>
                  <th className="px-5 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {policies.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-3 font-medium text-slate-900">{p.name}</td>
                    <td className="px-5 py-3 text-slate-600">{p.hoursBeforeStart}h+ before start</td>
                    <td className="px-5 py-3 text-slate-900 font-medium">{Number(p.refundPct)}%</td>
                    <td className="px-5 py-3 text-slate-500">{p.venueId ? "Venue-specific" : "All venues"}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        p.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                      }`}>
                        {p.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-sm text-slate-600 space-y-1">
          <p><strong className="text-slate-700">How it works</strong> — when a booking is cancelled, the system checks for a matching active policy. The most specific policy (venue-level &gt; global) with the highest notice threshold that still applies is used. The computed refund is stamped on the booking as <code className="bg-slate-200 px-1 rounded text-xs">refund_status: pending</code>.</p>
        </div>
      </div>
    </PortalLayout>
  )
}
