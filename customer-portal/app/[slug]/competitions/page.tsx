import { notFound } from "next/navigation"
import { fetchOrgBySlug } from "@/lib/api"
import { Trophy } from "lucide-react"

export default async function CompetitionsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const org = await fetchOrgBySlug(slug)
  if (!org) notFound()
  const primary = org.primaryColour

  return (
    <div className="min-h-screen bg-white pt-20">
      <div className="border-b border-slate-100 py-12" style={{ backgroundColor: primary + "08" }}>
        <div className="mx-auto max-w-4xl px-4 md:px-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Competitions</h1>
          <p className="mt-2 text-slate-500">Competitions and leagues at {org.name}</p>
        </div>
      </div>
      <div className="mx-auto max-w-4xl px-4 py-16 md:px-8 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl mb-4" style={{ backgroundColor: primary + "18" }}>
          <Trophy size={28} style={{ color: primary }} />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Competitions coming soon</h2>
        <p className="mt-2 text-slate-500">We're setting up our competitions and leagues. Check back soon.</p>
      </div>
    </div>
  )
}
