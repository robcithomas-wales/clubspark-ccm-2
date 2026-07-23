import Link from "next/link"
import { Plus, Users } from "lucide-react"
import { PortalLayout } from "@/components/portal-layout"
import { AudiencesClient } from "./audiences-client"

const COMMS_SERVICE = process.env.NEXT_PUBLIC_COMMS_SERVICE_URL || "http://127.0.0.1:4012"
const TENANT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

async function getAudiences() {
  try {
    const res = await fetch(`${COMMS_SERVICE}/v1/audiences`, {
      headers: { "x-tenant-id": TENANT_ID },
      cache: "no-store",
    })
    if (!res.ok) return []
    const json = await res.json()
    return json.data ?? []
  } catch {
    return []
  }
}

export default async function AudiencesPage() {
  const audiences = await getAudiences()

  return (
    <PortalLayout
      title="Saved audiences"
      description="Reusable audience definitions for campaigns. Rules are resolved at send time."
    >
      <div className="space-y-4">
        <div className="flex justify-end">
          <Link
            href="/communications/audiences/new"
            className="inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-medium text-white hover:bg-[#1832A8] transition"
          >
            <Plus className="h-4 w-4" />
            New audience
          </Link>
        </div>

        {audiences.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <Users className="h-8 w-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600">No saved audiences yet</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Build audience definitions with AND/OR rules to reuse across campaigns.
            </p>
            <Link
              href="/communications/audiences/new"
              className="inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-medium text-white hover:bg-[#1832A8] transition"
            >
              <Plus className="h-4 w-4" />
              Create first audience
            </Link>
          </div>
        ) : (
          <AudiencesClient audiences={audiences} />
        )}
      </div>
    </PortalLayout>
  )
}
