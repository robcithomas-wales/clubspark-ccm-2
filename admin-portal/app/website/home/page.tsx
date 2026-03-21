import { PortalLayout } from "@/components/portal-layout"
import { HomePageEditor } from "@/components/home-page-editor"
import { createClient } from "@/lib/supabase/server"

const VENUE_SERVICE = "http://127.0.0.1:4003"

async function getHomePageContent() {
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
    return json?.data?.homePageContent ?? {}
  } catch {
    return {}
  }
}

export default async function HomePageEditorPage() {
  const content = await getHomePageContent()

  return (
    <PortalLayout
      title="Home page"
      description="Edit the content shown on your customer-facing home page."
    >
      <HomePageEditor initial={content} />
    </PortalLayout>
  )
}
