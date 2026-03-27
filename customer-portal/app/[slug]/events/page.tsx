import { notFound } from "next/navigation"
import { fetchOrgBySlug } from "@/lib/api"
import { CalendarDays } from "lucide-react"

export default async function EventsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const org = await fetchOrgBySlug(slug)
  if (!org) notFound()
  const primary = org.primaryColour

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="pt-20 pb-12" style={{ background: `linear-gradient(135deg, ${primary} 0%, ${primary}cc 100%)` }}>
        <div className="mx-auto max-w-4xl px-4 md:px-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-white">Events</h1>
          <p className="mt-2 text-white/70">Upcoming events at {org.name}</p>
        </div>
      </div>
      <div className="mx-auto max-w-4xl px-4 py-16 md:px-8 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl mb-4" style={{ backgroundColor: primary + "18" }}>
          <CalendarDays size={28} style={{ color: primary }} />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Events coming soon</h2>
        <p className="mt-2 text-slate-500">We're working on our events calendar. Check back soon.</p>
      </div>
    </div>
  )
}
