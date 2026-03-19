import Link from "next/link"
import { ArrowLeft, ClipboardList } from "lucide-react"
import { getBookings, getBookableUnits } from "@/lib/api"
import { PortalLayout } from "@/components/portal-layout"
import { PendingApprovalsList } from "@/components/pending-approvals-list"

export default async function PendingApprovalsPage() {
  const [pendingResult, unitsResult] = await Promise.allSettled([
    getBookings(1, 100, { status: "pending" }),
    getBookableUnits(),
  ])

  const pending = pendingResult.status === "fulfilled"
    ? (pendingResult.value.data ?? [])
    : []

  const units: any[] = unitsResult.status === "fulfilled" ? (unitsResult.value ?? []) : []
  const unitMap = new Map(units.map((u: any) => [u.id, u]))

  const sorted = [...pending].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  const over4h = sorted.filter((b) => (Date.now() - new Date(b.createdAt).getTime()) > 4 * 3600000).length
  const over24h = sorted.filter((b) => (Date.now() - new Date(b.createdAt).getTime()) > 24 * 3600000).length

  return (
    <PortalLayout title="Pending Approvals" description="Bookings waiting for admin approval, oldest first.">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/bookings" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Back to bookings
          </Link>
          <Link href="/bookings?status=pending" className="text-sm text-slate-500 hover:text-slate-900">
            View in booking list →
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">Awaiting approval</div>
            <div className="mt-2 text-3xl font-bold text-amber-900">{sorted.length}</div>
          </div>
          <div className={`rounded-2xl border p-5 ${over4h > 0 ? "border-orange-200 bg-orange-50" : "border-slate-200 bg-slate-50"}`}>
            <div className={`text-xs font-semibold uppercase tracking-wide ${over4h > 0 ? "text-orange-700" : "text-slate-500"}`}>Waiting &gt; 4 hours</div>
            <div className={`mt-2 text-3xl font-bold ${over4h > 0 ? "text-orange-900" : "text-slate-400"}`}>{over4h}</div>
          </div>
          <div className={`rounded-2xl border p-5 ${over24h > 0 ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-slate-50"}`}>
            <div className={`text-xs font-semibold uppercase tracking-wide ${over24h > 0 ? "text-rose-700" : "text-slate-500"}`}>Waiting &gt; 24 hours</div>
            <div className={`mt-2 text-3xl font-bold ${over24h > 0 ? "text-rose-900" : "text-slate-400"}`}>{over24h}</div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-6 py-4">
            <ClipboardList className="h-5 w-5 text-slate-400" />
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Pending queue</h2>
              <p className="text-xs text-slate-500">Oldest requests shown first. Approve or reject inline.</p>
            </div>
          </div>
          <PendingApprovalsList bookings={sorted} unitMap={unitMap} />
        </div>
      </div>
    </PortalLayout>
  )
}
