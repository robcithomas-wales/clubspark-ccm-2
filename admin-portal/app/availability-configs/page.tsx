import Link from "next/link"
import { getAvailabilityConfigs } from "@/lib/api"
import { PortalLayout } from "@/components/portal-layout"
import { Clock, Plus, ChevronRight } from "lucide-react"

const DAY_LABELS: Record<number, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
}

const SCOPE_LABELS: Record<string, string> = {
  venue: "Venue",
  resource_group: "Resource Group",
  resource: "Resource",
}

function getScopeClasses(scopeType: string) {
  switch (scopeType) {
    case "venue":
      return "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
    case "resource_group":
      return "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
    case "resource":
      return "bg-violet-50 text-violet-700 ring-1 ring-violet-200"
    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
  }
}

export default async function AvailabilityConfigsPage() {
  let configs: any[] = []

  try {
    configs = await getAvailabilityConfigs()
  } catch {
    configs = []
  }

  return (
    <PortalLayout
      title="Availability Configs"
      description="Opening hours, slot durations, and booking intervals by venue, resource group, or resource."
    >
      <div className="space-y-6">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">All configs</h2>
              <p className="mt-1 text-sm text-slate-500">
                Configs are inherited from venue → resource group → resource. More specific scopes take precedence.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 md:block">
                {configs.length} records
              </div>
              <Link
                href="/availability-configs/new"
                className="inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-semibold !text-white shadow-sm transition hover:bg-[#1832A8] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#1857E0] focus:ring-offset-2"
              >
                <Plus className="h-4 w-4 !text-white" />
                New config
              </Link>
            </div>
          </div>

          {configs.length === 0 ? (
            <div className="px-6 py-10 text-sm text-slate-500">
              No availability configs found.
            </div>
          ) : (
            <>
              <div className="hidden grid-cols-6 gap-4 border-b border-slate-200 bg-slate-100 px-6 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 lg:grid">
                <div>Scope</div>
                <div>Scope ID</div>
                <div className="text-center">Day</div>
                <div className="text-center">Hours</div>
                <div className="text-center">Slot / Interval</div>
                <div className="text-center">Status</div>
              </div>

              <div className="divide-y divide-slate-200">
                {configs.map((config: any) => (
                  <Link
                    key={config.id}
                    href={`/availability-configs/${config.id}`}
                    className="block px-6 py-4 transition hover:bg-blue-50/40"
                  >
                    <div className="grid gap-4 lg:grid-cols-6 lg:items-center">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 lg:hidden">
                          Scope
                        </div>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getScopeClasses(config.scopeType)}`}
                        >
                          {SCOPE_LABELS[config.scopeType] ?? config.scopeType}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 lg:hidden">
                          Scope ID
                        </div>
                        <div className="flex items-center gap-1 font-mono text-xs text-slate-600 truncate">
                          {config.scopeId?.slice(0, 8)}…
                          <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" />
                        </div>
                      </div>

                      <div className="text-center">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 lg:hidden">
                          Day
                        </div>
                        <span className="text-sm text-slate-700">
                          {config.dayOfWeek != null ? DAY_LABELS[config.dayOfWeek] ?? config.dayOfWeek : "All days"}
                        </span>
                      </div>

                      <div className="text-center">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 lg:hidden">
                          Hours
                        </div>
                        <div className="flex items-center justify-center gap-1 text-sm text-slate-700">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {config.opensAt ?? "—"} – {config.closesAt ?? "—"}
                        </div>
                      </div>

                      <div className="text-center">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 lg:hidden">
                          Slot / Interval
                        </div>
                        <span className="text-sm text-slate-700">
                          {config.slotDurationMinutes != null ? `${config.slotDurationMinutes} min` : "inherit"}
                          {" / "}
                          {config.bookingIntervalMinutes != null ? `${config.bookingIntervalMinutes} min` : "inherit"}
                        </span>
                      </div>

                      <div className="text-center">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 lg:hidden">
                          Status
                        </div>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            config.isActive !== false
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                              : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
                          }`}
                        >
                          {config.isActive !== false ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </PortalLayout>
  )
}
