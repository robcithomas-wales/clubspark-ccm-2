import { PortalLayout } from "@/components/portal-layout"
import { OrganisationSettingsForm } from "@/components/organisation-settings-form"

async function getOrganisation() {
  try {
    const { cookies } = await import("next/headers")
    const cookieStore = await cookies()
    const res = await fetch("http://127.0.0.1:3000/api/organisations", {
      headers: { Cookie: cookieStore.toString() },
      cache: "no-store",
    })
    if (!res.ok) return null
    const json = await res.json()
    return json.data ?? null
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
