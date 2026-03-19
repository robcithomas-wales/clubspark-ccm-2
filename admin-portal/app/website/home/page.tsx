import { PortalLayout } from "@/components/portal-layout"
import { HomePageEditor } from "@/components/home-page-editor"

async function getHomePageContent() {
  try {
    const { cookies } = await import("next/headers")
    const cookieStore = await cookies()
    const res = await fetch("http://127.0.0.1:3000/api/website/home", {
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
