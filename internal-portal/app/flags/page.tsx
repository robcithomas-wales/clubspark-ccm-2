import Link from "next/link"
import { getOrganisations } from "@/lib/api"
import { InternalShell } from "@/components/internal-shell"
import { Flag } from "lucide-react"

const KNOWN_FLAGS = [
  "coaching", "competitions", "team_management", "smart_access", "analytics_ai",
  "payments_gocardless", "payments_stripe", "website_manager", "communications_sms",
  "onboarding_checklist", "beta_calendar", "beta_automation",
]

const FLAG_LABELS: Record<string, string> = {
  coaching: "Coaching",
  competitions: "Competitions",
  team_management: "Team Management",
  smart_access: "Smart Access",
  analytics_ai: "AI Analytics",
  payments_gocardless: "GoCardless",
  payments_stripe: "Stripe",
  website_manager: "Website Manager",
  communications_sms: "SMS",
  onboarding_checklist: "Onboarding Checklist",
  beta_calendar: "Beta: Calendar",
  beta_automation: "Beta: Automation",
}

export default async function FlagsOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ flag?: string }>
}) {
  const params = await searchParams
  const selectedFlag = params.flag ?? KNOWN_FLAGS[0]

  // Fetch accounts that have this flag enabled
  let orgs: Awaited<ReturnType<typeof getOrganisations>>["data"] = []
  let total = 0
  try {
    const result = await getOrganisations(1, 200)
    orgs = result.data
    total = result.pagination.total
  } catch {}

  const orgsWithFlag = orgs.filter(o => o.featureFlags.some(f => f.flag === selectedFlag && f.enabled))
  const flagCounts = KNOWN_FLAGS.map(flag => ({
    flag,
    count: orgs.filter(o => o.featureFlags.some(f => f.flag === flag && f.enabled)).length,
  }))

  return (
    <InternalShell title="Feature Flags" description="Overview of all flags across all accounts.">
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Flag selector */}
        <div className="lg:col-span-1">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Flags</h2>
            </div>
            <div className="divide-y divide-slate-50">
              {flagCounts.map(({ flag, count }) => (
                <Link
                  key={flag}
                  href={`/flags?flag=${flag}`}
                  className={`flex items-center justify-between px-4 py-2.5 text-sm transition ${selectedFlag === flag ? "bg-orange-50 text-orange-700 font-semibold" : "text-slate-700 hover:bg-slate-50"}`}
                >
                  <span>{FLAG_LABELS[flag] ?? flag}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${count > 0 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {count}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Accounts with this flag */}
        <div className="lg:col-span-3">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-3.5">
              <h2 className="text-sm font-semibold text-slate-700">
                <span className="text-orange-600">{FLAG_LABELS[selectedFlag] ?? selectedFlag}</span>
                {" "}— {orgsWithFlag.length} of {total} accounts enabled
              </h2>
            </div>

            {orgsWithFlag.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-sm text-slate-400">
                <Flag className="h-10 w-10 text-slate-200" />
                No accounts have this flag enabled
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {orgsWithFlag.map(org => {
                  const flagData = org.featureFlags.find(f => f.flag === selectedFlag)
                  return (
                    <div key={org.id} className="flex items-center justify-between px-5 py-3.5 text-sm hover:bg-slate-50 transition">
                      <div>
                        <Link href={`/accounts/${org.tenantId}`} className="font-semibold text-slate-900 hover:text-orange-600 transition">
                          {org.name}
                        </Link>
                        <div className="mt-0.5 text-xs text-slate-400">
                          {org.plan} · {org.adminEmail ?? org.slug ?? org.tenantId.slice(0, 8)}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {flagData?.setByEmail && (
                          <span className="text-xs text-slate-400">set by {flagData.setByEmail}</span>
                        )}
                        <Link
                          href={`/accounts/${org.tenantId}/flags`}
                          className="rounded-xl border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:border-orange-300 hover:text-orange-600 transition"
                        >
                          Manage flags
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </InternalShell>
  )
}
