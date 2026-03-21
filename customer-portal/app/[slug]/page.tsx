import { notFound } from "next/navigation"
import { fetchOrgBySlug, fetchLatestNews } from "@/lib/api"
import { HomePageClient } from "./home-page-client"
import { ClubHomePageClient } from "./club-home-page-client"

export default async function HomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const org = await fetchOrgBySlug(slug)
  if (!org) notFound()

  const latestNews = await fetchLatestNews(org.tenantId, 3)

  if (org.portalTemplate === "club") {
    return <ClubHomePageClient org={org} latestNews={latestNews} />
  }

  return <HomePageClient org={org} latestNews={latestNews} />
}
