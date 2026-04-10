"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Home, Calendar, CreditCard, Newspaper, Trophy, GraduationCap,
  User, LogOut, Menu, X, ChevronRight, Users,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useOrg } from "@/lib/org-context"

export function SideNav() {
  const org = useOrg()
  const pathname = usePathname()
  const router = useRouter()
  const slug = org.slug
  const primary = org.primaryColour

  const [user, setUser] = useState<any>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setMobileOpen(false)
    router.push(`/${slug}/login`)
  }

  const links = [
    { label: "Home",        href: `/${slug}`,            icon: Home },
    { label: "Book",        href: `/${slug}/book`,        icon: Calendar },
    { label: "Memberships", href: `/${slug}/memberships`, icon: CreditCard },
    { label: "News",        href: `/${slug}/news`,        icon: Newspaper },
    { label: "Events",        href: `/${slug}/events`,        icon: Trophy },
    { label: "Competitions", href: `/${slug}/competitions`, icon: Trophy },
    { label: "Coaching",     href: `/${slug}/coaching`,     icon: GraduationCap },
    ...(org.hasTeams ? [{ label: "Teams", href: `/${slug}/teams`, icon: Users }] : []),
  ]

  const isActive = (href: string) => pathname === href

  const navContent = (
    <div className="flex h-full flex-col">
      {/* Logo / club name */}
      <Link
        href={`/${slug}`}
        className="flex items-center gap-3 px-5 py-5 border-b border-white/10"
        onClick={() => setMobileOpen(false)}
      >
        {org.logoUrl ? (
          <img src={org.logoUrl} alt={org.name} className="h-9 w-auto object-contain" />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 text-sm font-extrabold text-white">
            {org.name.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="truncate text-sm font-bold text-white leading-tight">{org.name}</span>
      </Link>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {links.map((l) => {
          const Icon = l.icon
          const active = isActive(l.href)
          return (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className={[
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-white/20 text-white shadow-sm"
                  : "text-white/70 hover:bg-white/10 hover:text-white",
              ].join(" ")}
            >
              <Icon size={17} className="shrink-0" />
              <span className="flex-1">{l.label}</span>
              {active && <ChevronRight size={13} className="opacity-60" />}
            </Link>
          )
        })}
      </nav>

      {/* Auth section */}
      <div className="border-t border-white/10 px-3 py-4 space-y-0.5">
        {user ? (
          <>
            <Link
              href={`/${slug}/account`}
              onClick={() => setMobileOpen(false)}
              className={[
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                isActive(`/${slug}/account`)
                  ? "bg-white/20 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white",
              ].join(" ")}
            >
              <User size={17} className="shrink-0" />
              My account
            </Link>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/50 transition-all hover:bg-white/10 hover:text-white/80"
            >
              <LogOut size={17} className="shrink-0" />
              Sign out
            </button>
          </>
        ) : (
          <Link
            href={`/${slug}/login`}
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/80 transition-all hover:bg-white/10 hover:text-white"
          >
            <User size={17} className="shrink-0" />
            Sign in
          </Link>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar — fixed, always visible */}
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col lg:flex"
        style={{ backgroundColor: primary }}
      >
        {navContent}
      </aside>

      {/* Mobile top bar */}
      <div
        className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between px-4 lg:hidden"
        style={{ backgroundColor: primary }}
      >
        <Link href={`/${slug}`} className="flex items-center gap-2">
          {org.logoUrl ? (
            <img src={org.logoUrl} alt={org.name} className="h-7 w-auto object-contain" />
          ) : (
            <span className="text-sm font-bold text-white">{org.name}</span>
          )}
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="fixed inset-y-0 left-0 z-50 w-72 lg:hidden"
            style={{ backgroundColor: primary }}
          >
            {navContent}
          </aside>
        </>
      )}
    </>
  )
}
