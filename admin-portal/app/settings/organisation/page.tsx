import { PortalLayout } from "@/components/portal-layout"
import { OrganisationSettingsForm } from "@/components/organisation-settings-form"
import { createClient } from "@/lib/supabase/server"

const VENUE_SERVICE = "http://127.0.0.1:4003"

async function getOrganisation() {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null
    const res = await fetch(`${VENUE_SERVICE}/organisations/me`, {
      headers: { "Authorization": `Bearer ${session.access_token}` },
      cache: "no-store",
    })
    if (!res.ok) return null
    const json = await res.json()
    return json?.data ?? null
  } catch {
    return null
  }
}

export default async function OrganisationSettingsPage() {
  const org = await getOrganisation()

  return (
    <PortalLayout
      title="Organisation"
      description="Your organisation's identity, branding, and customer-facing website settings."
    >
      <OrganisationSettingsForm initial={org} />
    </PortalLayout>
  )
}
