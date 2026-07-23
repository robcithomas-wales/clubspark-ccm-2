import Link from "next/link"
import { PortalLayout } from "@/components/portal-layout"
import { getMessageLog } from "@/lib/api"

const CHANNEL_BADGE: Record<string, string> = {
  email: "bg-blue-100 text-blue-700",
  sms: "bg-green-100 text-green-700",
  push: "bg-purple-100 text-purple-700",
  in_app: "bg-slate-100 text-slate-700",
}

const STATUS_BADGE: Record<string, string> = {
  sent: "bg-emerald-100 text-emerald-700",
  queued: "bg-yellow-100 text-yellow-700",
  failed: "bg-red-100 text-red-700",
  suppressed: "bg-slate-100 text-slate-500",
  bounced: "bg-orange-100 text-orange-700",
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso))
}

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}

export default async function CommunicationsLogPage() {
  let log: { data: any[]; total: number } = { data: [], total: 0 }
  try {
    log = await getMessageLog(100)
  } catch {
    // comms-service not yet running — show empty state
  }

  const COMMS_NAV = [
    { label: "Message log", href: "/communications/log" },
    { label: "Templates", href: "/communications/templates" },
    { label: "Audiences", href: "/communications/audiences" },
    { label: "Notification settings", href: "/communications/notification-settings" },
  ]

  return (
    <PortalLayout
      title="Communications"
      description="Message log, templates, and audience management."
    >
      {/* Sub-nav */}
      <div className="flex gap-1 mb-5 border-b border-slate-200 pb-0 overflow-x-auto">
        {COMMS_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-900 border-b-2 border-transparent hover:border-slate-300 transition whitespace-nowrap -mb-px"
          >
            {item.label}
          </Link>
        ))}
        <div className="ml-auto pb-2">
          <Link
            href="/communications/compose"
            className="rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-medium text-white hover:bg-[#1832A8] transition"
          >
            Compose
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="text-sm text-slate-500">
            {log.total} message{log.total !== 1 ? "s" : ""} total
          </div>
        </div>

        {log.data.length === 0 ? (
          <div className="px-6 py-16 text-center text-slate-400 text-sm">
            No messages sent yet. Messages will appear here once the comms service is running.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Recipient</th>
                  <th className="px-4 py-3 text-left">Subject / Template</th>
                  <th className="px-4 py-3 text-left">Channel</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {log.data.map((msg: any) => (
                  <tr key={msg.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500 text-xs">
                      {formatDate(msg.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{msg.recipientName ?? "—"}</div>
                      <div className="text-slate-500 text-xs">{msg.recipientEmail ?? msg.recipientPhone ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3 max-w-[240px]">
                      <div className="font-medium text-slate-800 truncate">{msg.subject ?? "—"}</div>
                      {msg.templateKey && (
                        <div className="text-slate-500 text-xs font-mono">{msg.templateKey}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        label={msg.channel}
                        className={CHANNEL_BADGE[msg.channel] ?? "bg-slate-100 text-slate-600"}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        label={msg.status}
                        className={STATUS_BADGE[msg.status] ?? "bg-slate-100 text-slate-600"}
                      />
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      <div>{msg.sourceModule ?? "—"}</div>
                      {msg.sourceEventType && (
                        <div className="font-mono text-slate-400">{msg.sourceEventType}</div>
                      )}
                      {msg.campaignId && (
                        <Link
                          href={`/communications/campaigns/${msg.campaignId}`}
                          className="text-[#1857E0] hover:underline"
                        >
                          View campaign
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PortalLayout>
  )
}
