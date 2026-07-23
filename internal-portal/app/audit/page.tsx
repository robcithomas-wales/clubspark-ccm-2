import Link from "next/link"
import { getAuditLogs } from "@/lib/api"
import { InternalShell } from "@/components/internal-shell"
import { ScrollText } from "lucide-react"

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
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso))
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tenantId?: string; action?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)

  let logs: Awaited<ReturnType<typeof getAuditLogs>>["data"] = []
  let pagination: Awaited<ReturnType<typeof getAuditLogs>>["pagination"] | null = null
  try {
    const result = await getAuditLogs(page, { tenantId: params.tenantId, action: params.action })
    logs = result.data
    pagination = result.pagination
  } catch {}

  return (
    <InternalShell title="Audit Log" description="Immutable record of all internal staff actions.">
      <div className="space-y-4">
        {/* Filters */}
        <form method="GET" className="flex flex-wrap items-center gap-3">
          <input
            name="tenantId"
            defaultValue={params.tenantId ?? ""}
            placeholder="Filter by tenant ID…"
            className="h-9 w-72 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-orange-400"
          />
          <input
            name="action"
            defaultValue={params.action ?? ""}
            placeholder="Filter by action (e.g. flag.enabled)…"
            className="h-9 w-56 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-orange-400"
          />
          <button type="submit" className="h-9 rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white hover:bg-orange-600 transition">Filter</button>
          <Link href="/audit" className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-600 hover:bg-slate-50">Clear</Link>
        </form>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-3.5">
            <span className="text-sm font-semibold text-slate-700">{pagination?.total ?? 0} entries</span>
          </div>

          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-20 text-sm text-slate-400">
              <ScrollText className="h-10 w-10 text-slate-200" />
              No audit log entries found
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-4 px-5 py-3.5 text-sm hover:bg-slate-50 transition">
                  <div className="shrink-0 text-xs text-slate-400 w-36">{fmt(log.createdAt)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ACTION_COLOURS[log.action] ?? "bg-slate-100 text-slate-600"}`}>
                        {log.action}
                      </span>
                      {log.tenantId && (
                        <Link href={`/accounts/${log.tenantId}`} className="text-xs text-orange-500 hover:text-orange-700 font-mono">
                          {log.tenantId.slice(0, 8)}…
                        </Link>
                      )}
                    </div>
                    {log.targetType && log.targetId && (
                      <div className="mt-0.5 text-xs text-slate-500">
                        {log.targetType}: <span className="font-mono">{log.targetId.slice(0, 12)}</span>
                      </div>
                    )}
                    {Object.keys(log.meta ?? {}).length > 0 && (
                      <div className="mt-1 text-xs text-slate-400 truncate max-w-md">
                        {JSON.stringify(log.meta)}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-xs text-slate-400">{log.staffEmail ?? log.staffId.slice(0, 8)}</div>
                </div>
              ))}
            </div>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
              <span>Page {page} of {pagination.totalPages}</span>
              <div className="flex gap-2">
                {page > 1 && <Link href={`/audit?page=${page - 1}${params.tenantId ? `&tenantId=${params.tenantId}` : ""}${params.action ? `&action=${params.action}` : ""}`} className="rounded-lg border border-slate-200 bg-white px-3 py-1 hover:bg-slate-50">← Prev</Link>}
                {page < pagination.totalPages && <Link href={`/audit?page=${page + 1}${params.tenantId ? `&tenantId=${params.tenantId}` : ""}${params.action ? `&action=${params.action}` : ""}`} className="rounded-lg border border-slate-200 bg-white px-3 py-1 hover:bg-slate-50">Next →</Link>}
              </div>
            </div>
          )}
        </div>
      </div>
    </InternalShell>
  )
}
