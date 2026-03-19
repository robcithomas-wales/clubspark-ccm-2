"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Menu, X, User, LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useOrg } from "@/lib/org-context"

export function SiteNav() {
  const org = useOrg()
  const pathname = usePathname()
  const router = useRouter()
  const slug = org.slug
  const primary = org.primaryColour

  // nav layout: dark-inline | light-inline | dark-below | light-below | dark-hidden | light-hidden
  const layout = org.navLayout ?? "dark-inline"
  const isDark = layout.startsWith("dark")
  const isBelow = layout.includes("below")
  const isHidden = layout.includes("hidden")

  const [open, setOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
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
    router.push(`/${slug}/login`)
  }

  const links = [
    { label: "Home", href: `/${slug}` },
    { label: "Book", href: `/${slug}/book` },
    { label: "Memberships", href: `/${slug}/memberships` },
    { label: "News", href: `/${slug}/news` },
    { label: "Events", href: `/${slug}/events` },
    { label: "Coaching", href: `/${slug}/coaching` },
  ]

  const isActive = (href: string) => pathname === href

  // Style helpers based on light vs dark mode
  const navBg = isDark ? primary : "#ffffff"
  const navShadow = isDark
    ? "0 2px 20px rgba(0,0,0,0.15)"
    : "0 1px 0 0 rgba(0,0,0,0.08), 0 2px 12px rgba(0,0,0,0.06)"
  const textActive = isDark ? "bg-white/20 text-white" : "text-slate-900 font-semibold"
  const textIdle = isDark
    ? "text-white/80 hover:bg-white/10 hover:text-white"
    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  const signInBtn = isDark
    ? "border border-white/30 bg-white/10 text-white hover:bg-white/20"
    : "border border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100"
  const authLink = isDark
    ? "text-white/80 hover:bg-white/10 hover:text-white"
    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  const burgerColor = isDark ? "text-white" : "text-slate-700"
  const mobileMenuBg = isDark ? primary : "#ffffff"
  const mobileLinkStyle = isDark
    ? "text-white/80 hover:bg-white/10 hover:text-white"
    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"

  const logoNode = (
    <Link href={`/${slug}`} className="flex items-center gap-3">
      {org.logoUrl ? (
        <img src={org.logoUrl} alt={org.name} className="h-9 w-auto object-contain" />
      ) : (
        <div
          className="flex h-9 items-center rounded-lg px-3 text-sm font-bold tracking-wide"
          style={
            isDark
              ? { backgroundColor: "rgba(255,255,255,0.15)", color: "#ffffff" }
              : { backgroundColor: primary + "18", color: primary }
          }
        >
          {org.name}
        </div>
      )}
    </Link>
  )

  const desktopLinks = !isHidden && (
    <div className="hidden items-center gap-1 md:flex">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${isActive(l.href) ? textActive : textIdle}`}
        >
          {l.label}
        </Link>
      ))}
    </div>
  )

  const authBlock = (
    <div className="hidden items-center gap-2 md:flex">
      {user ? (
        <>
          <Link
            href={`/${slug}/account`}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${authLink}`}
          >
            <User size={15} />
            My account
          </Link>
          <button
            onClick={handleSignOut}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${isDark ? "text-white/60 hover:text-white" : "text-slate-400 hover:text-slate-700"}`}
          >
            <LogOut size={15} />
          </button>
        </>
      ) : (
        <Link
          href={`/${slug}/login`}
          className={`rounded-xl px-5 py-2 text-sm font-semibold backdrop-blur transition ${signInBtn}`}
        >
          Sign in
        </Link>
      )}
    </div>
  )

  return (
    <nav
      className="fixed inset-x-0 top-0 z-50"
      style={{ backgroundColor: navBg, boxShadow: navShadow }}
    >
      {/* ── Inline layout (logo left, links centre-right, auth right) ── */}
      {!isBelow && (
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
          {logoNode}
          {desktopLinks}
          {authBlock}
          {/* Mobile burger */}
          <button
            className={`rounded-lg p-2 md:hidden ${burgerColor}`}
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      )}

      {/* ── Below layout (logo centered top row, links second row) ── */}
      {isBelow && (
        <>
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
            <div className="flex-1" />
            {logoNode}
            <div className="flex flex-1 justify-end">
              {authBlock}
              <button
                className={`rounded-lg p-2 md:hidden ${burgerColor}`}
                onClick={() => setOpen(!open)}
              >
                {open ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
          {!isHidden && (
            <div
              className={`hidden md:block border-t ${isDark ? "border-white/10" : "border-slate-100"}`}
            >
              <div className="mx-auto flex max-w-7xl justify-center gap-1 px-4 py-2">
                {links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition ${isActive(l.href) ? textActive : textIdle}`}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Mobile menu (shared across all layouts) */}
      {open && (
        <div
          className={`border-t px-4 pb-4 pt-2 md:hidden ${isDark ? "border-white/10" : "border-slate-100"}`}
          style={{ backgroundColor: mobileMenuBg }}
        >
          {!isHidden && links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`block rounded-lg px-4 py-3 text-sm font-medium ${mobileLinkStyle}`}
            >
              {l.label}
            </Link>
          ))}
          <div className={`mt-2 border-t pt-2 ${isDark ? "border-white/10" : "border-slate-100"}`}>
            {user ? (
              <>
                <Link
                  href={`/${slug}/account`}
                  onClick={() => setOpen(false)}
                  className={`block rounded-lg px-4 py-3 text-sm font-medium ${mobileLinkStyle}`}
                >
                  My account
                </Link>
                <button
                  onClick={handleSignOut}
                  className={`block w-full rounded-lg px-4 py-3 text-left text-sm ${isDark ? "text-white/60" : "text-slate-400"}`}
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href={`/${slug}/login`}
                onClick={() => setOpen(false)}
                className={`block rounded-lg px-4 py-3 text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
