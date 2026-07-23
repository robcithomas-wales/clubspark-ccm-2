import { PortalLayout } from "@/components/portal-layout"
import { getCommsTemplates } from "@/lib/api"
import { NotificationSettingsForm } from "./notification-settings-form"

const TEMPLATE_LABELS: Record<string, { label: string; module: string; description: string }> = {
  "booking.confirmed":   { label: "Booking Confirmation",    module: "Bookings",    description: "Sent when a booking is confirmed." },
  "booking.cancelled":   { label: "Booking Cancellation",    module: "Bookings",    description: "Sent when a booking is cancelled." },
  "booking.reminder":    { label: "Booking Reminder",        module: "Bookings",    description: "Sent 24h before a booking." },
  "membership.activated":{ label: "Membership Activated",    module: "Membership",  description: "Sent when a membership is activated." },
  "membership.renewal_due": { label: "Renewal Reminder",     module: "Membership",  description: "Sent when membership is approaching expiry." },
  "membership.expired":  { label: "Membership Expired",      module: "Membership",  description: "Sent when a membership expires." },
  "payment.succeeded":   { label: "Payment Receipt",         module: "Payments",    description: "Sent on successful payment." },
  "payment.failed":      { label: "Payment Failed",          module: "Payments",    description: "Sent when a payment cannot be processed." },
  "payment.refund_issued": { label: "Refund Issued",         module: "Payments",    description: "Sent when a refund is processed." },
  "fixture.reminder":    { label: "Fixture Reminder",        module: "Teams",       description: "Sent before a fixture kick-off." },
}

export default async function NotificationSettingsPage() {
  let templates: any[] = []
  try {
    templates = await getCommsTemplates()
  } catch {
    // comms-service not yet running
  }

  // Only show system-level templates in this view
  const systemTemplates = templates.filter((t: any) => t.isSystem || !t.tenantId)

  return (
    <PortalLayout
      title="Notification Settings"
      description="Configure which system notifications are sent and customise their footer and reply-to address."
    >
      <div className="space-y-4">
        {systemTemplates.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-400 text-sm shadow-sm">
            No templates loaded. The comms service may not be running yet.
          </div>
        ) : (
          systemTemplates.map((tpl: any) => {
            const meta = TEMPLATE_LABELS[tpl.key] ?? {
              label: tpl.name,
              module: "System",
              description: "",
            }
            return (
              <div
                key={tpl.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {meta.module}
                      </span>
                    </div>
                    <h3 className="mt-0.5 text-base font-semibold text-slate-900">{meta.label}</h3>
                    <p className="mt-0.5 text-sm text-slate-500">{meta.description}</p>
                    <p className="mt-1 font-mono text-xs text-slate-400">{tpl.key}</p>
                  </div>
                  <div className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${tpl.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {tpl.isActive ? "Active" : "Disabled"}
                  </div>
                </div>

                <NotificationSettingsForm
                  templateKey={tpl.key}
                  isActive={tpl.isActive ?? true}
                  customFooter={tpl.customFooter ?? ""}
                  replyTo={tpl.replyTo ?? ""}
                />
              </div>
            )
          })
        )}
      </div>
    </PortalLayout>
  )
}
