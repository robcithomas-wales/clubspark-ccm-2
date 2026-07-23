import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Mail, MessageSquare, Send, Clock, Ban } from "lucide-react"
import { PortalLayout } from "@/components/portal-layout"

const COMMS_SERVICE = process.env.NEXT_PUBLIC_COMMS_SERVICE_URL || "http://127.0.0.1:4012"
const TENANT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

async function getCampaign(id: string) {
  try {
    const res = await fetch(`${COMMS_SERVICE}/v1/campaigns/${id}`, {
      headers: { "x-tenant-id": TENANT_ID },
      cache: "no-store",
    })
    if (res.status === 404) return null
    if (!res.ok) return null
    const json = await res.json()
    return json.data ?? null
  } catch {
    return null
  }
}

async function getCampaignStats(id: string) {
  try {
    const res = await fetch(`${COMMS_SERVICE}/v1/campaigns/${id}/stats`, {
      headers: { "x-tenant-id": TENANT_ID },
      cache: "no-store",
    })
    if (!res.ok) return null
    const json = await res.json()
    return json.data ?? null
  } catch {
    return null
  }
}

const STATUS_COLOURS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  scheduled: "bg-blue-100 text-blue-700",
  sending: "bg-amber-100 text-amber-700",
  sent: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
}

function StatCard({
  label,
  value,
  sub,
  colour,
}: {
  label: string
  value: string | number
  sub?: string
  colour?: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className={`mt-2 text-2xl font-bold ${colour ?? "text-slate-900"}`}>{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  )
}

function RateBar({ label, rate, colour }: { label: string; rate: number; colour: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-500">{label}</span>
        <span className="text-xs font-semibold text-slate-700">{rate}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full ${colour} transition-all`}
          style={{ width: `${Math.min(100, rate)}%` }}
        />
      </div>
    </div>
  )
}

export default async function CampaignAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [campaign, stats] = await Promise.all([getCampaign(id), getCampaignStats(id)])
  if (!campaign) notFound()

  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—"

  return (
    <PortalLayout
      title={campaign.name ?? "Campaign"}
      description={`${campaign.channel.toUpperCase()} campaign · ${campaign.status}`}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/communications/log"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to log
          </Link>
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLOURS[campaign.status] ?? "bg-slate-100 text-slate-600"}`}
          >
            {campaign.status}
          </span>
        </div>

        {/* Campaign details */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            <div>
              <div className="text-xs text-slate-500 mb-0.5">Channel</div>
              <div className="flex items-center gap-1.5 font-medium text-slate-900">
                {campaign.channel === "email" ? (
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                ) : (
                  <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                )}
                {campaign.channel}
              </div>
            </div>
            {campaign.subject && (
              <div className="sm:col-span-2">
                <div className="text-xs text-slate-500 mb-0.5">Subject</div>
                <div className="font-medium text-slate-900">{campaign.subject}</div>
              </div>
            )}
            <div>
              <div className="text-xs text-slate-500 mb-0.5">Created</div>
              <div className="text-slate-700">{fmt(campaign.createdAt)}</div>
            </div>
            {campaign.sentAt && (
              <div>
                <div className="text-xs text-slate-500 mb-0.5">Sent at</div>
                <div className="text-slate-700">{fmt(campaign.sentAt)}</div>
              </div>
            )}
            {campaign.scheduledAt && campaign.status === "scheduled" && (
              <div>
                <div className="text-xs text-slate-500 mb-0.5">Scheduled for</div>
                <div className="flex items-center gap-1.5 text-slate-700">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  {fmt(campaign.scheduledAt)}
                </div>
              </div>
            )}
          </div>
        </div>

        {stats ? (
          <>
            {/* KPI cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Total recipients" value={stats.total} />
              <StatCard
                label="Sent"
                value={stats.sent}
                sub={`${stats.suppressed} suppressed`}
                colour="text-blue-700"
              />
              <StatCard
                label="Open rate"
                value={`${stats.openRate}%`}
                sub={`${stats.opened} opened`}
                colour={stats.openRate >= 20 ? "text-green-700" : "text-slate-900"}
              />
              <StatCard
                label="Click rate"
                value={`${stats.clickRate}%`}
                sub={`${stats.clicked} clicked`}
                colour={stats.clickRate >= 5 ? "text-green-700" : "text-slate-900"}
              />
            </div>

            {/* Rate bars */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">Engagement funnel</h3>
              <RateBar label="Delivery rate" rate={stats.deliveryRate} colour="bg-blue-400" />
              <RateBar label="Open rate" rate={stats.openRate} colour="bg-indigo-400" />
              <RateBar label="Click rate" rate={stats.clickRate} colour="bg-violet-400" />
              <RateBar label="Bounce rate" rate={stats.bounceRate} colour="bg-red-400" />
            </div>

            {/* Suppression note */}
            {stats.suppressed > 0 && (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
                <Ban className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  <strong>{stats.suppressed}</strong> recipient
                  {stats.suppressed !== 1 ? "s were" : " was"} suppressed (unsubscribed, bounced, or
                  spam complaint). These are excluded from sent counts and rates.
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <Send className="h-8 w-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600">No stats yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Stats appear once the campaign has been dispatched.
            </p>
          </div>
        )}
      </div>
    </PortalLayout>
  )
}
