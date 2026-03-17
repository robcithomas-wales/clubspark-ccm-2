import Link from "next/link"
import { getBookingRules } from "@/lib/api"
import { PortalLayout } from "@/components/portal-layout"
import { ChevronRight, Plus, ShieldCheck } from "lucide-react"

const SUBJECT_LABELS: Record<string, string> = {
  everyone: "Everyone",
  role: "Role",
  membership_plan: "Membership plan",
  membership_scheme: "Membership scheme",
}

const SCOPE_LABELS: Record<string, string> = {
  organisation: "Venue-wide",
  resource_group: "Resource group",
  resource: "Resource",
}

function subjectBadge(rule: any) {
  const label = SUBJECT_LABELS[rule.subjectType] ?? rule.subjectType
  const ref = rule.subjectRef ? ` · ${rule.subjectRef}` : ""
  const colors: Record<string, string> = {
    everyone: "bg-slate-100 text-slate-700 ring-slate-200",
    role: "bg-violet-100 text-violet-700 ring-violet-200",
    membership_plan: "bg-sky-100 text-sky-700 ring-sky-200",
    membership_scheme: "bg-blue-100 text-blue-700 ring-blue-200",
  }
  const cls = colors[rule.subjectType] ?? "bg-slate-100 text-slate-700 ring-slate-200"
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${cls}`}>
      {label}{ref}
    </span>
  )
}

function scopeBadge(rule: any) {
  const label = SCOPE_LABELS[rule.scopeType] ?? rule.scopeType
  const colors: Record<string, string> = {
    organisation: "bg-slate-100 text-slate-600 ring-slate-200",
    resource_group: "bg-amber-100 text-amber-700 ring-amber-200",
    resource: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  }
  const cls = colors[rule.scopeType] ?? "bg-slate-100 text-slate-600 ring-slate-200"
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${cls}`}>
      {label}
    </span>
  )
}

export default async function BookingRulesPage() {
  const rules = await getBookingRules()

  return (
    <PortalLayout title="Booking Rules">
      <div className="px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Booking Setup
            </div>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Booking Rules</h1>
            <p className="mt-1 text-sm text-slate-500">
              Define who can book, at what price, and under what conditions.
            </p>
          </div>
          <Link
            href="/booking-rules/new"
            className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[#1832A8] px-4 text-sm font-semibold text-white transition hover:bg-[#142a8c]"
          >
            <Plus className="h-4 w-4" />
            New rule
          </Link>
        </div>

        {rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 py-20">
            <ShieldCheck className="mb-4 h-10 w-10 text-slate-300" />
            <div className="text-base font-semibold text-slate-700">No booking rules yet</div>
            <p className="mt-1 text-sm text-slate-500">
              Create your first rule to control who can book and at what price.
            </p>
            <Link
              href="/booking-rules/new"
              className="mt-4 inline-flex h-9 items-center gap-2 rounded-xl bg-[#1832A8] px-4 text-sm font-semibold text-white transition hover:bg-[#142a8c]"
            >
              <Plus className="h-4 w-4" />
              Create first rule
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
            <div className="grid grid-cols-[1.5fr_auto_auto_auto_auto_40px] gap-x-4 border-b border-slate-200 bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              <div>Rule name</div>
              <div>Subject</div>
              <div>Scope</div>
              <div>Price / slot</div>
              <div>Status</div>
              <div />
            </div>

            <div className="divide-y divide-slate-100">
              {rules.map((rule: any) => (
                <Link
                  key={rule.id}
                  href={`/booking-rules/${rule.id}`}
                  className="grid grid-cols-[1.5fr_auto_auto_auto_auto_40px] items-center gap-x-4 px-6 py-4 transition hover:bg-slate-50"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{rule.name}</div>
                    {rule.description && (
                      <div className="mt-0.5 truncate text-xs text-slate-500">
                        {rule.description}
                      </div>
                    )}
                  </div>
                  <div>{subjectBadge(rule)}</div>
                  <div>{scopeBadge(rule)}</div>
                  <div className="text-sm text-slate-700 whitespace-nowrap">
                    {rule.pricePerSlot != null
                      ? `${rule.priceCurrency} ${Number(rule.pricePerSlot).toFixed(2)}`
                      : <span className="text-slate-400 text-xs">Not set</span>}
                  </div>
                  <div>
                    {rule.isActive ? (
                      <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
                        Inactive
                      </span>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  )
}
