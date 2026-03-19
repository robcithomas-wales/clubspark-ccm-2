import { PortalLayout } from "@/components/portal-layout"
import { DesignSettingsForm } from "@/components/design-settings-form"

async function getDesignSettings() {
  try {
    const { cookies } = await import("next/headers")
    const cookieStore = await cookies()
    const res = await fetch("http://127.0.0.1:3000/api/website/design", {
      headers: { Cookie: cookieStore.toString() },
      cache: "no-store",
    })
    if (!res.ok) return {}
    const json = await res.json()
    return json.data ?? {}
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
