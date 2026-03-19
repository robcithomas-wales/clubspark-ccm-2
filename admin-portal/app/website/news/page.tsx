import { PortalLayout } from "@/components/portal-layout"
import { NewsManager } from "@/components/news-manager"

async function getNewsPosts() {
  try {
    const { cookies } = await import("next/headers")
    const cookieStore = await cookies()
    const res = await fetch("http://127.0.0.1:3000/api/website/news", {
      headers: { Cookie: cookieStore.toString() },
      cache: "no-store",
    })
    if (!res.ok) return []
    const json = await res.json()
    return json.data ?? []
  } catch {
    return []
  }
}

export default async function NewsPage() {
  const posts = await getNewsPosts()

  return (
    <PortalLayout
      title="News"
      description="Create and manage news posts shown on your customer portal."
    >
      <NewsManager initial={posts} />
    </PortalLayout>
  )
}
