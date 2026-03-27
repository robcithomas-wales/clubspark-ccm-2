import Link from "next/link"
import { notFound } from "next/navigation"
import { fetchOrgBySlug } from "@/lib/api"
import { Calendar } from "lucide-react"

async function fetchNewsPosts(tenantId: string) {
  const VENUE_URL = process.env.NEXT_PUBLIC_VENUE_SERVICE_URL!
  const res = await fetch(`${VENUE_URL}/news-posts/public/list?tenantId=${tenantId}`, { cache: "no-store" })
  if (!res.ok) return []
  const json = await res.json()
  return json.data ?? []
}

export default async function NewsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const org = await fetchOrgBySlug(slug)
  if (!org) notFound()

  const posts = await fetchNewsPosts(org.tenantId)
  const primary = org.primaryColour

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="pt-20 pb-12" style={{ background: `linear-gradient(135deg, ${primary} 0%, ${primary}cc 100%)` }}>
        <div className="mx-auto max-w-4xl px-4 md:px-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-white">News</h1>
          <p className="mt-2 text-white/70">Latest updates from {org.name}</p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-12 md:px-8">
        {posts.length === 0 ? (
          <p className="text-slate-400">No news posts yet — check back soon.</p>
        ) : (
          <div className="space-y-8">
            {posts.map((post: any) => (
              <Link
                key={post.id}
                href={`/${slug}/news/${post.slug}`}
                className="group block overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                {post.coverImageUrl && (
                  <img
                    src={post.coverImageUrl}
                    alt={post.title}
                    className="h-52 w-full object-cover transition group-hover:scale-[1.01]"
                  />
                )}
                <div className="p-6">
                  <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
                    <Calendar size={12} />
                    {new Date(post.publishedAt ?? post.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric", month: "long", year: "numeric",
                    })}
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 transition group-hover:text-[var(--colour-primary)]" style={{ color: undefined }}>
                    {post.title}
                  </h2>
                  {post.body && (
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-500">{post.body}</p>
                  )}
                  <span className="mt-4 inline-flex items-center text-sm font-semibold" style={{ color: primary }}>
                    Read more →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
