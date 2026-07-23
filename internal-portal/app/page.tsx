import Link from "next/link"
import { getStats } from "@/lib/api"
import { InternalShell } from "@/components/internal-shell"
import { Building2, Flag, UserX, ScrollText, TrendingUp, AlertCircle } from "lucide-react"

const PLAN_COLOURS: Record<string, string> = {
  trial: "bg-slate-100 text-slate-600",
  starter: "bg-blue-50 text-blue-700",
  pro: "bg-violet-50 text-violet-700",
  enterprise: "bg-amber-50 text-amber-700",
}

const STATUS_COLOURS: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  suspended: "bg-amber-50 text-amber-700",
  churned: "bg-slate-100 text-slate-500",
}

const ACTION_COLOURS: Record<string, string> = {
  "organisation.viewed": "bg-slate-100 text-slate-600",
  "organisation.updated": "bg-blue-50 text-blue-700",
  "organisation.created": "bg-emerald-50 text-emerald-700",
  "flag.enabled": "bg-emerald-50 text-emerald-700",
  "flag.disabled": "bg-amber-50 text-amber-700",
  "flag.reset": "bg-slate-100 text-slate-600",
  "impersonation.started": "bg-red-50 text-red-700",
  "impersonation.ended": "bg-slate-100 text-slate-600",
  "account.suspended": "bg-red-50 text-red-700",
}

function fmt(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso))
}

const FLAG_LABELS: Record<string, string> = {
  coaching: "Coaching", competitions: "Competitions", team_management: "Team Management",
  smart_access: "Smart Access", analytics_ai: "AI Analytics", payments_gocardless: "GoCardless",
  payments_stripe: "Stripe", website_manager: "Website Manager", communications_sms: "SMS",
  onboarding_checklist: "Onboarding Checklist", beta_calendar: "Beta: Calendar",
  beta_automation: "Beta: Automation",
}

export default async function DashboardPage() {
  let stats: Awaited<ReturnType<typeof getStats>> | null = null
  try { stats = await getStats() } catch {}

  const totalOrgs = stats?.totalOrgs ?? 0
  const byPlan = stats?.byPlan ?? {}
  const byStatus = stats?.byStatus ?? {}
  const flagAdoption = stats?.flagAdoption ?? []
  const recentAudit = stats?.recentAudit ?? []
  const activeImpersonations = stats?.activeImpersonations ?? 0

  return (
    <InternalShell title="Dashboard" description="Platform overview across all accounts.">
      <div className="space-y-6">

        {/* KPI row */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total accounts", value: totalOrgs, icon: Building2, colour: "text-blue-600", href: "/accounts" },
            { label: "Active accounts", value: byStatus.active ?? 0, icon: TrendingUp, colour: "text-emerald-600", href: "/accounts?status=active" },
            { label: "Active sessions", value: activeImpersonations, icon: UserX, colour: activeImpersonations > 0 ? "text-red-600" : "text-slate-400", href: "/impersonation" },
            { label: "Flags in use", value: flagAdoption.length, icon: Flag, colour: "text-orange-500", href: "/flags" },
          ].map(({ label, value, icon: Icon, colour, href }) => (
            <Link key={label} href={href} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-orange-200 hover:shadow transition">
              <Icon className={`mb-2 h-5 w-5 ${colour}`} />
              <div className="text-2xl font-bold text-slate-900">{value}</div>
              <div className="mt-0.5 text-xs text-slate-500">{label}</div>
            </Link>
          ))}
        </div>

        {activeImpersonations > 0 && (
          <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-3.5 text-sm text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span><strong>{activeImpersonations} active impersonation session{activeImpersonations !== 1 ? "s" : ""}</strong> in progress.</span>
            <Link href="/impersonation" className="ml-auto text-xs font-semibold underline hover:text-red-900">View →</Link>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Plan breakdown */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-3.5">
              <h2 className="text-sm font-semibold text-slate-700">By plan</h2>
            </div>
            <div className="divide-y divide-slate-50">
              {["trial", "starter", "pro", "enterprise"].map(plan => (
                <Link key={plan} href={`/accounts?plan=${plan}`} className="flex items-center justify-between px-5 py-3 text-sm hover:bg-slate-50 transition">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PLAN_COLOURS[plan]}`}>{plan}</span>
                  <span className="font-semibold text-slate-800">{byPlan[plan] ?? 0}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Status breakdown */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-3.5">
              <h2 className="text-sm font-semibold text-slate-700">By status</h2>
            </div>
            <div className="divide-y divide-slate-50">
              {["active", "suspended", "churned"].map(status => (
                <Link key={status} href={`/accounts?status=${status}`} className="flex items-center justify-between px-5 py-3 text-sm hover:bg-slate-50 transition">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_COLOURS[status]}`}>{status}</span>
                  <span className="font-semibold text-slate-800">{byStatus[status] ?? 0}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Flag adoption */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-3.5">
              <h2 className="text-sm font-semibold text-slate-700">Flag adoption</h2>
            </div>
            {flagAdoption.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-slate-400">No flags enabled yet</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {flagAdoption.slice(0, 6).map(({ flag, count }) => (
                  <Link key={flag} href={`/flags?flag=${flag}`} className="flex items-center justify-between px-5 py-2.5 text-sm hover:bg-slate-50 transition">
                    <span className="text-slate-700">{FLAG_LABELS[flag] ?? flag}</span>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">{count}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent audit */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-slate-700">Recent activity</h2>
            <Link href="/audit" className="text-xs text-orange-500 hover:text-orange-700 font-medium">View all →</Link>
          </div>
          {recentAudit.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-sm text-slate-400">
              <ScrollText className="h-8 w-8 text-slate-200" />
              No activity yet
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {recentAudit.map((log) => (
                <div key={log.id} className="flex items-center gap-4 px-5 py-3 text-sm hover:bg-slate-50 transition">
                  <span className="w-28 shrink-0 text-xs text-slate-400">{fmt(log.createdAt)}</span>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${ACTION_COLOURS[log.action] ?? "bg-slate-100 text-slate-600"}`}>
                    {log.action}
                  </span>
                  {log.tenantId && (
                    <Link href={`/accounts/${log.tenantId}`} className="font-mono text-xs text-orange-500 hover:text-orange-700">
                      {log.tenantId.slice(0, 8)}…
                    </Link>
                  )}
                  <span className="ml-auto text-xs text-slate-400">{log.staffEmail ?? log.staffId.slice(0, 8)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </InternalShell>
  )
}
