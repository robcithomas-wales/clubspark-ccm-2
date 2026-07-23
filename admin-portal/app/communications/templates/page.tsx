import { PortalLayout } from "@/components/portal-layout"
import { TemplatesClient } from "./templates-client"

const COMMS_SERVICE = process.env.NEXT_PUBLIC_COMMS_SERVICE_URL || "http://127.0.0.1:4012"
const TENANT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

async function getTemplates() {
  try {
    const res = await fetch(`${COMMS_SERVICE}/v1/templates`, {
      headers: { "x-tenant-id": TENANT_ID },
      cache: "no-store",
    })
    if (!res.ok) return []
    const json = await res.json()
    return json.data ?? json ?? []
  } catch {
    return []
  }
}

export default async function TemplatesPage() {
  const templates = await getTemplates()

  return (
    <PortalLayout
      title="Communication templates"
      description="System templates used for automated notifications. Customise the footer and reply-to address."
    >
      <TemplatesClient templates={templates} />
    </PortalLayout>
  )
}
