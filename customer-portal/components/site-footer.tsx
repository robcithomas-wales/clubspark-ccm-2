"use client"

import Link from "next/link"
import { MapPin, Phone, Mail } from "lucide-react"
import { useOrg } from "@/lib/org-context"

// Takes a hex colour and returns a much darker version for use as a footer bg
function darkShade(hex: string, amount: number): string {
  const n = parseInt(hex.replace("#", ""), 16)
  const r = Math.round(((n >> 16) & 0xff) * amount)
  const g = Math.round(((n >> 8) & 0xff) * amount)
  const b = Math.round((n & 0xff) * amount)
  return `rgb(${r},${g},${b})`
}

export function SiteFooter() {
  const org = useOrg()
  const slug = org.slug
  const footerBg = darkShade(org.primaryColour, 0.30)

  return (
    <footer style={{ backgroundColor: footerBg }} className="text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
        <div className="grid gap-10 md:grid-cols-3">
          {/* Brand */}
          <div>
            <div className="text-lg font-bold">{org.name}</div>
            {org.about && (
              <p className="mt-3 text-sm leading-relaxed text-white/60">{org.about}</p>
            )}
          </div>

          {/* Quick links */}
          <div>
            <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/40">Quick links</div>
            <div className="space-y-2">
              {[
                { label: "Book a session", href: `/${slug}/book` },
                { label: "Memberships", href: `/${slug}/memberships` },
                { label: "My account", href: `/${slug}/account` },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="block text-sm text-white/60 transition hover:text-white"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/40">Contact</div>
            <div className="space-y-3">
              {org.address && (
                <div className="flex items-start gap-2.5 text-sm text-white/60">
                  <MapPin size={15} className="mt-0.5 shrink-0 text-white/40" />
                  <span className="whitespace-pre-line">{org.address}</span>
                </div>
              )}
              {org.phone && (
                <a href={`tel:${org.phone}`} className="flex items-center gap-2.5 text-sm text-white/60 transition hover:text-white">
                  <Phone size={15} className="shrink-0 text-white/40" />
                  {org.phone}
                </a>
              )}
              {org.email && (
                <a href={`mailto:${org.email}`} className="flex items-center gap-2.5 text-sm text-white/60 transition hover:text-white">
                  <Mail size={15} className="shrink-0 text-white/40" />
                  {org.email}
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <span className="text-xs text-white/30">© {new Date().getFullYear()} {org.name}. All rights reserved.</span>
          <a
            href="https://clubspark.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 opacity-40 transition hover:opacity-70"
          >
            <span className="text-xs text-white">Powered by</span>
            <img
              src="https://zdrheylkqoptoiuqwnma.supabase.co/storage/v1/object/public/assets/clubspark-logo.png"
              alt="ClubSpark"
              className="h-7 w-auto object-contain brightness-0 invert"
            />
          </a>
        </div>
      </div>
    </footer>
  )
}
