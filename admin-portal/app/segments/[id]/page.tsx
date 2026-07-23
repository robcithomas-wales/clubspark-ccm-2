import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Users, Filter } from "lucide-react"
import { PortalLayout } from "@/components/portal-layout"
import { SegmentForm } from "../segment-form"
import { SegmentMemberList } from "./segment-member-list"
import { SegmentRebuildButton } from "./segment-rebuild-button"

const PEOPLE_SERVICE = "http://127.0.0.1:4004"
const HEADERS = { "x-tenant-id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" }

async function getSegment(id: string) {
  const res = await fetch(`${PEOPLE_SERVICE}/segments/${id}`, { headers: HEADERS, cache: "no-store" })
  if (res.status === 404) return null
  if (!res.ok) throw new Error("Failed to fetch segment")
  const json = await res.json()
  return json.data ?? null
}

async function getMembers(id: string) {
  try {
    const res = await fetch(`${PEOPLE_SERVICE}/segments/${id}/members`, { headers: HEADERS, cache: "no-store" })
    if (!res.ok) return []
    const json = await res.json()
    return json.data ?? []
  } catch {
    return []
  }
}

export default async function SegmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [segment, members] = await Promise.all([getSegment(id), getMembers(id)])
  if (!segment) notFound()

  const isDynamic = segment.type === "dynamic"

  return (
    <PortalLayout title={segment.name} description={segment.description ?? `${segment.type} segment · ${segment.memberCount} member${segment.memberCount !== 1 ? "s" : ""}`}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/segments" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition">
            <ArrowLeft className="h-4 w-4" />
            Back to segments
          </Link>
          {isDynamic && <SegmentRebuildButton segmentId={id} />}
        </div>

        {/* Members */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 bg-slate-50">
            {isDynamic ? <Filter className="h-4 w-4 text-purple-500" /> : <Users className="h-4 w-4 text-blue-500" />}
            <h2 className="text-sm font-semibold text-slate-900">
              Members ({members.length})
            </h2>
            <span className={`ml-auto inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
              isDynamic ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
            }`}>
              {segment.type}
            </span>
          </div>
          <SegmentMemberList
            segmentId={id}
            initialMembers={members}
            isStatic={!isDynamic}
          />
        </div>

        {isDynamic && segment.conditions?.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Active conditions</h3>
            <div className="space-y-1">
              {segment.conditions.map((c: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-slate-700">{c.field}</span>
                  <span className="text-slate-400">{c.op === "eq" ? "=" : "≠"}</span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-700">{String(c.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Edit form */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Edit segment</h3>
          <SegmentForm existing={segment} />
        </div>
      </div>
    </PortalLayout>
  )
}
