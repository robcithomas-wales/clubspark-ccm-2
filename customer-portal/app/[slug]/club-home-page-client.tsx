"use client"

import Link from "next/link"
import {
  Calendar, CreditCard, Newspaper, Trophy, GraduationCap,
  ArrowRight, MapPin, Phone, Mail, User, Clock,
} from "lucide-react"
import { useOrg } from "@/lib/org-context"
import type { Org, NewsPost } from "@/lib/api"

export function ClubHomePageClient({ org, latestNews }: { org: Org; latestNews: NewsPost[] }) {
  const slug = org.slug
  const primary = org.primaryColour
  const cms = org.homePageContent ?? {}

  const headline     = cms.headline    ?? `Welcome to ${org.name}`
  const subheadline  = cms.subheadline ?? "Book courts, join classes and manage your membership."
  const introHeading = cms.introHeading ?? null
  const introText    = cms.introText    ?? null

  const quickActions = [
    {
      icon: Calendar,
      label: "Book a session",
      description: "Check availability and reserve your spot.",
      href: `/${slug}/book`,
    },
    {
      icon: CreditCard,
      label: "Memberships",
      description: "Explore plans and join the club.",
      href: `/${slug}/memberships`,
    },
    {
      icon: Newspaper,
      label: "News",
      description: "Latest updates from the club.",
      href: `/${slug}/news`,
    },
    {
      icon: Trophy,
      label: "Events",
      description: "Competitions, leagues and more.",
      href: `/${slug}/events`,
    },
    {
      icon: GraduationCap,
      label: "Coaching",
      description: "Find a coach and book sessions.",
      href: `/${slug}/coaching`,
    },
    {
      icon: User,
      label: "My account",
      description: "Bookings, membership and profile.",
      href: `/${slug}/account`,
    },
  ]

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <div
        className="relative overflow-hidden rounded-2xl px-8 py-10"
        style={{ backgroundColor: primary }}
      >
        {/* Subtle court pattern */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.06]">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="club-court" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
                <rect x="5" y="5" width="70" height="70" fill="none" stroke="white" strokeWidth="1" />
                <circle cx="40" cy="40" r="15" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#club-court)" />
          </svg>
        </div>
        <div className="relative">
          <h1 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">{headline}</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/70 md:text-base max-w-xl">{subheadline}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={`/${slug}/book`}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold shadow transition hover:shadow-md hover:-translate-y-0.5"
              style={{ color: primary }}
            >
              <Calendar size={15} />
              Book now
              <ArrowRight size={13} />
            </Link>
            <Link
              href={`/${slug}/memberships`}
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              <CreditCard size={15} />
              Memberships
            </Link>
          </div>
        </div>
      </div>

      {/* About / intro */}
      {(introHeading || introText) && (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          {introHeading && (
            <h2 className="text-lg font-bold text-slate-900">{introHeading}</h2>
          )}
          {introText && (
            <p className="mt-2 text-sm leading-relaxed text-slate-500 whitespace-pre-line">{introText}</p>
          )}
        </div>
      )}

      {/* Quick actions grid */}
      <div>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Quick access</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.href}
                href={action.href}
                className="group flex items-start gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition group-hover:scale-110"
                  style={{ backgroundColor: primary + "15" }}
                >
                  <Icon size={19} style={{ color: primary }} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">{action.label}</div>
                  <div className="mt-0.5 text-xs text-slate-500 leading-relaxed">{action.description}</div>
                </div>
                <ArrowRight size={14} className="ml-auto mt-0.5 shrink-0 text-slate-300 transition group-hover:text-slate-500 group-hover:translate-x-0.5" />
              </Link>
            )
          })}
        </div>
      </div>

      {/* Latest news */}
      {latestNews.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Latest news</h2>
            <Link
              href={`/${slug}/news`}
              className="text-xs font-semibold transition hover:opacity-70"
              style={{ color: primary }}
            >
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {latestNews.map((post) => (
              <Link
                key={post.id}
                href={`/${slug}/news/${post.slug}`}
                className="group flex items-start gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                {post.coverImageUrl && (
                  <img
                    src={post.coverImageUrl}
                    alt={post.title}
                    className="h-14 w-20 shrink-0 rounded-xl object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                    <Clock size={10} />
                    {new Date(post.publishedAt ?? post.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </div>
                  <div className="text-sm font-semibold text-slate-900 leading-snug group-hover:text-slate-700">
                    {post.title}
                  </div>
                  {post.body && (
                    <div className="mt-0.5 text-xs text-slate-500 line-clamp-1">{post.body}</div>
                  )}
                </div>
                <ArrowRight size={14} className="mt-1 shrink-0 text-slate-300 transition group-hover:text-slate-500" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Contact */}
      {(org.address || org.phone || org.email) && (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Contact</h2>
          <div className="space-y-3">
            {org.address && (
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: primary + "15" }}>
                  <MapPin size={14} style={{ color: primary }} />
                </div>
                <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-line">{org.address}</p>
              </div>
            )}
            {org.phone && (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: primary + "15" }}>
                  <Phone size={14} style={{ color: primary }} />
                </div>
                <a href={`tel:${org.phone}`} className="text-sm text-slate-600 transition hover:text-slate-900">{org.phone}</a>
              </div>
            )}
            {org.email && (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: primary + "15" }}>
                  <Mail size={14} style={{ color: primary }} />
                </div>
                <a href={`mailto:${org.email}`} className="text-sm text-slate-600 transition hover:text-slate-900">{org.email}</a>
              </div>
            )}
          </div>
          {org.mapsEmbedUrl && (
            <div className="mt-4 overflow-hidden rounded-xl">
              <iframe src={org.mapsEmbedUrl} width="100%" height="200" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
