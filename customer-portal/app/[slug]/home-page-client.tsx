"use client"

import Link from "next/link"
import { CalendarDays, CreditCard, ChevronRight, MapPin, Phone, Mail, ArrowRight, User, Calendar } from "lucide-react"
import { useOrg } from "@/lib/org-context"
import type { Org, NewsPost } from "@/lib/api"

function darkShade(hex: string, amount: number): string {
  const n = parseInt(hex.replace("#", ""), 16)
  const r = Math.round(((n >> 16) & 0xff) * amount)
  const g = Math.round(((n >> 8) & 0xff) * amount)
  const b = Math.round((n & 0xff) * amount)
  return `rgb(${r},${g},${b})`
}

export function HomePageClient({ org, latestNews }: { org: Org; latestNews: NewsPost[] }) {
  const slug = org.slug
  const primary = org.primaryColour
  const dark = darkShade(primary, 0.15)
  const cms = org.homePageContent ?? {}

  const headline     = cms.headline     ?? null
  const subheadline  = cms.subheadline  ?? `Book courts, join classes and manage your membership at ${org.name}.`
  const heroImage    = cms.heroImageUrl ?? null
  const heroGradient = cms.heroGradient !== false
  const bannerEnabled = !!cms.bannerEnabled
  const bannerText   = cms.bannerText   ?? ""
  const introHeading = cms.introHeading ?? null
  const introText    = cms.introText    ?? null
  const gallery: string[] = Array.isArray(cms.gallery) ? cms.gallery.filter(Boolean) : []

  return (
    <>
      {/* ── Announcement banner ── */}
      {bannerEnabled && bannerText && (
        <div className="fixed inset-x-0 top-16 z-40 py-2.5 text-center text-sm font-semibold text-white" style={{ backgroundColor: primary }}>
          {bannerText}
        </div>
      )}

      {/* ── Hero ── */}
      <section className={`relative flex min-h-screen items-center overflow-hidden ${bannerEnabled && bannerText ? "pt-10" : ""}`}>
        <div className="absolute inset-0" style={{ backgroundColor: heroImage ? undefined : primary }}>
          {heroImage ? (
            <img src={heroImage} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 opacity-10">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="court" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
                    <rect x="10" y="10" width="100" height="100" fill="none" stroke="white" strokeWidth="1.5" />
                    <line x1="60" y1="10" x2="60" y2="110" stroke="white" strokeWidth="1" />
                    <circle cx="60" cy="60" r="20" fill="none" stroke="white" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#court)" />
              </svg>
            </div>
          )}
          {(heroGradient || !heroImage) && (
            <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-black/20 to-transparent" />
          )}
          {heroImage && !heroGradient && (
            <div className="absolute inset-0" style={{ backgroundColor: primary + "66" }} />
          )}
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-32 md:px-8">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-white backdrop-blur">
              {org.name}
            </div>
            {headline ? (
              <h1 className="text-5xl font-extrabold leading-tight tracking-tight text-white md:text-7xl">
                {headline}
              </h1>
            ) : (
              <h1 className="text-5xl font-extrabold leading-tight tracking-tight text-white md:text-7xl">
                Play.<br />
                <span style={{ color: "rgba(255,255,255,0.75)" }}>Book.</span><br />
                Compete.
              </h1>
            )}
            <p className="mt-6 text-lg leading-relaxed text-white/70 md:text-xl">{subheadline}</p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href={`/${slug}/book`}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-bold shadow-xl transition hover:shadow-2xl hover:-translate-y-0.5"
                style={{ color: primary }}
              >
                <CalendarDays size={18} />
                Book now
                <ArrowRight size={16} />
              </Link>
              <Link
                href={`/${slug}/memberships`}
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-7 py-3.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
              >
                <CreditCard size={18} />
                Memberships
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-20 bg-white"
          style={{ clipPath: "polygon(0 100%, 100% 0, 100% 100%)" }} />
      </section>

      {/* ── Introduction ── */}
      {(introHeading || introText) && (
        <section className="bg-white pt-20 pb-10">
          <div className="mx-auto max-w-7xl px-4 md:px-8">
            <div className="max-w-3xl">
              {introHeading && (
                <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">{introHeading}</h2>
              )}
              {introText && (
                <p className="mt-4 text-lg leading-relaxed text-slate-500 whitespace-pre-line">{introText}</p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Gallery ── */}
      {gallery.length > 0 && (
        <section className="bg-white pb-10">
          <div className="mx-auto max-w-7xl px-4 md:px-8">
            <div className={`grid gap-3 ${gallery.length === 1 ? "grid-cols-1" : gallery.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
              {gallery.map((url, i) => (
                <img key={i} src={url} alt="" className="h-56 w-full rounded-2xl object-cover" />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Quick actions ── */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
              What would you like to do?
            </h2>
            <p className="mt-3 text-slate-500">Everything you need in one place.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: CalendarDays,
                title: "Book a session",
                description: "Check real-time availability and reserve your court or facility in seconds.",
                href: `/${slug}/book`,
                cta: "Book now",
              },
              {
                icon: CreditCard,
                title: "Memberships",
                description: "Join as a member and unlock exclusive rates, priority booking and more.",
                href: `/${slug}/memberships`,
                cta: "View plans",
              },
              {
                icon: User,
                title: "My account",
                description: "View your upcoming bookings, manage your membership and update your profile.",
                href: `/${slug}/account`,
                cta: "Go to account",
              },
            ].map((card) => {
              const Icon = card.icon
              return (
                <Link
                  key={card.title}
                  href={card.href}
                  className="group relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: primary + "18" }}>
                    <Icon size={26} style={{ color: primary }} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{card.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{card.description}</p>
                  <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold transition group-hover:gap-2.5" style={{ color: primary }}>
                    {card.cta}
                    <ChevronRight size={15} />
                  </div>
                  <div className="absolute bottom-0 left-0 h-1 w-0 transition-all duration-300 group-hover:w-full" style={{ backgroundColor: primary }} />
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Latest news ── */}
      {latestNews.length > 0 && (
        <section className="py-20" style={{ backgroundColor: primary + "08" }}>
          <div className="mx-auto max-w-7xl px-4 md:px-8">
            <div className="mb-10 flex items-end justify-between">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">Latest news</h2>
                <p className="mt-2 text-slate-500">Updates from {org.name}</p>
              </div>
              <Link href={`/${slug}/news`} className="text-sm font-semibold transition hover:opacity-70" style={{ color: primary }}>
                View all →
              </Link>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {latestNews.map((post) => (
                <Link
                  key={post.id}
                  href={`/${slug}/news/${post.slug}`}
                  className="group overflow-hidden rounded-2xl border border-white bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  {post.coverImageUrl && (
                    <img src={post.coverImageUrl} alt={post.title} className="h-44 w-full object-cover transition group-hover:scale-[1.02]" />
                  )}
                  <div className="p-5">
                    <div className="mb-2 flex items-center gap-1.5 text-xs text-slate-400">
                      <Calendar size={11} />
                      {new Date(post.publishedAt ?? post.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </div>
                    <h3 className="font-bold text-slate-900 leading-snug">{post.title}</h3>
                    {post.body && (
                      <p className="mt-1.5 line-clamp-2 text-sm text-slate-500">{post.body}</p>
                    )}
                    <span className="mt-3 inline-flex items-center text-xs font-semibold" style={{ color: primary }}>
                      Read more →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Contact / Find us ── */}
      {(org.address || org.phone || org.email || org.mapsEmbedUrl) && (
        <section className="py-20 text-white" style={{ backgroundColor: dark }}>
          <div className="mx-auto max-w-7xl px-4 md:px-8">
            <div className="mb-12">
              <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">Find us</h2>
              <p className="mt-2 text-white/50">We'd love to see you.</p>
            </div>
            <div className="grid gap-10 md:grid-cols-2">
              <div className="space-y-6">
                {org.address && (
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: primary + "30" }}>
                      <MapPin size={18} style={{ color: primary }} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-widest text-white/40">Address</div>
                      <div className="mt-1 whitespace-pre-line text-sm leading-relaxed text-white/80">{org.address}</div>
                    </div>
                  </div>
                )}
                {org.phone && (
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: primary + "30" }}>
                      <Phone size={18} style={{ color: primary }} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-widest text-white/40">Phone</div>
                      <a href={`tel:${org.phone}`} className="mt-1 block text-sm text-white/80 transition hover:text-white">{org.phone}</a>
                    </div>
                  </div>
                )}
                {org.email && (
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: primary + "30" }}>
                      <Mail size={18} style={{ color: primary }} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-widest text-white/40">Email</div>
                      <a href={`mailto:${org.email}`} className="mt-1 block text-sm text-white/80 transition hover:text-white">{org.email}</a>
                    </div>
                  </div>
                )}
              </div>
              {org.mapsEmbedUrl && (
                <div className="overflow-hidden rounded-2xl">
                  <iframe src={org.mapsEmbedUrl} width="100%" height="300" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </>
  )
}
