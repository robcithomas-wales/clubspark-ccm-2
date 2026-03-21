import { PortalLayout } from "@/components/portal-layout"
import { DesignSettingsForm } from "@/components/design-settings-form"
import { createClient } from "@/lib/supabase/server"

const VENUE_SERVICE = "http://127.0.0.1:4003"

async function getDesignSettings() {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return {}
    const res = await fetch(`${VENUE_SERVICE}/organisations/me`, {
      headers: { "Authorization": `Bearer ${session.access_token}` },
      cache: "no-store",
    })
    if (!res.ok) return {}
    const json = await res.json()
    const org = json?.data ?? {}
    return {
      primaryColour:   org.primaryColour   ?? "#1857E0",
      secondaryColour: org.secondaryColour ?? "#E05518",
      logoUrl:         org.logoUrl         ?? "",
      faviconUrl:      org.faviconUrl      ?? "",
      headingFont:     org.headingFont     ?? "Inter",
      bodyFont:        org.bodyFont        ?? "Inter",
      navLayout:       org.navLayout       ?? "dark-inline",
      portalTemplate:  org.portalTemplate  ?? "bold",
      name:            org.name            ?? "",
    }
  } catch {
    return {}
  }
}

export default async function DesignPage() {
  const settings = await getDesignSettings()

  return (
    <PortalLayout
      title="Design"
      description="Manage your brand colours, logo, fonts and navigation style."
    >
      <DesignSettingsForm initial={settings} />
    </PortalLayout>
  )
}
