import Link from "next/link"
import { notFound } from "next/navigation"
import { fetchOrgBySlug } from "@/lib/api"
import { Calendar, ArrowLeft } from "lucide-react"

async function fetchNewsPost(tenantId: string, postSlug: string) {
  const VENUE_URL = process.env.NEXT_PUBLIC_VENUE_SERVICE_URL!
  const res = await fetch(
    `${VENUE_URL}/news-posts/public/by-slug?tenantId=${tenantId}&slug=${encodeURIComponent(postSlug)}`,
    { cache: "no-store" }
  )
  if (!res.ok) return null
  const json = await res.json()
  return json.data ?? null
}

export default async function NewsPostPage({
  params,
}: {
  params: Promise<{ slug: string; postSlug: string }>
}) {
  const { slug, postSlug } = await params
  const org = await fetchOrgBySlug(slug)
  if (!org) notFound()

  const post = await fetchNewsPost(org.tenantId, postSlug)
  if (!post) notFound()

  const primary = org.primaryColour

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      {post.coverImageUrl && (
        <div className="h-72 w-full overflow-hidden md:h-96">
          <img src={post.coverImageUrl} alt={post.title} className="h-full w-full object-cover" />
        </div>
      )}

      <div className="mx-auto max-w-3xl px-4 py-12 md:px-8">
        <Link
          href={`/${slug}/news`}
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium transition"
          style={{ color: primary }}
        >
          <ArrowLeft size={14} />
          Back to news
        </Link>

        <div className="mb-4 flex items-center gap-2 text-xs text-slate-400">
          <Calendar size={12} />
          {new Date(post.publishedAt ?? post.createdAt).toLocaleDateString("en-GB", {
            day: "numeric", month: "long", year: "numeric",
          })}
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">{post.title}</h1>

        {post.body && (
          <div className="mt-8 text-base leading-relaxed text-slate-700 whitespace-pre-line">
            {post.body}
          </div>
        )}
      </div>
    </div>
  )
}
