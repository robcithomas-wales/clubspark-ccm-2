import Link from "next/link"
import { CreditCard } from "lucide-react"
import { getMembershipsByCustomer } from "@/lib/api"

function formatDate(value?: string | null) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value))
}

const STATUS_COLOURS: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  expired: "bg-slate-100 text-slate-600 ring-slate-500/20",
  cancelled: "bg-red-50 text-red-700 ring-red-600/20",
}

const PAYMENT_COLOURS: Record<string, string> = {
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  unpaid: "bg-red-50 text-red-700 ring-red-600/20",
  part_paid: "bg-amber-50 text-amber-700 ring-amber-600/20",
  waived: "bg-slate-100 text-slate-600 ring-slate-500/20",
}

export async function PersonMembershipsPanel({ customerId }: { customerId: string }) {
  let memberships: any[] = []

  try {
    memberships = await getMembershipsByCustomer(customerId)
  } catch {
    // non-fatal
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
      <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-4">
        <CreditCard className="h-5 w-5 text-slate-400" />
        <h3 className="text-base font-semibold text-slate-900">Memberships</h3>
        {memberships.length > 0 && (
          <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            {memberships.length}
          </span>
        )}
      </div>

      {memberships.length === 0 ? (
        <p className="px-6 py-6 text-sm text-slate-500">No memberships found for this person.</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {memberships.map((m) => (
            <Link
              key={m.id}
              href={`/membership/memberships/${m.id}`}
              className="flex items-center gap-4 px-6 py-4 transition hover:bg-blue-50/40"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-900 text-sm">
                    {m.planName ?? m.planId ?? "Membership"}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${STATUS_COLOURS[m.status] ?? "bg-slate-100 text-slate-600 ring-slate-500/20"}`}
                  >
                    {m.status}
                  </span>
                  {m.paymentStatus && m.paymentStatus !== "paid" && (
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${PAYMENT_COLOURS[m.paymentStatus] ?? "bg-slate-100 text-slate-600 ring-slate-500/20"}`}
                    >
                      {m.paymentStatus.replace("_", " ")}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {formatDate(m.startDate)}
                  {m.endDate ? ` → ${formatDate(m.endDate)}` : " (ongoing)"}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
