import { notFound } from "next/navigation"
import { fetchOrgBySlug, fetchLatestNews, type NewsPost } from "@/lib/api"
import { HomePageClient } from "./home-page-client"

export default async function HomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const org = await fetchOrgBySlug(slug)
  if (!org) notFound()

  const latestNews = await fetchLatestNews(org.tenantId, 3)

  return <HomePageClient org={org} latestNews={latestNews} />
}
