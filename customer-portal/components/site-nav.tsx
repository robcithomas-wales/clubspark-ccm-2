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
  ]

  const isActive = (href: string) => pathname === href

  return (
    <nav
      className="fixed inset-x-0 top-0 z-50"
      style={{
        backgroundColor: primary,
        boxShadow: "0 2px 20px rgba(0,0,0,0.15)",
      }}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
        {/* Logo / name */}
        <Link href={`/${slug}`} className="flex items-center gap-3">
          {org.logoUrl ? (
            <img src={org.logoUrl} alt={org.name} className="h-9 w-auto object-contain" />
          ) : (
            <div
              className="flex h-9 items-center rounded-lg px-3 text-sm font-bold tracking-wide text-white"
              style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
            >
              {org.name}
            </div>
          )}
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={[
                "rounded-lg px-4 py-2 text-sm font-medium transition",
                isActive(l.href)
                  ? "bg-white/20 text-white"
                  : "text-white/80 hover:bg-white/10 hover:text-white",
              ].join(" ")}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Auth */}
        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <Link
                href={`/${slug}/account`}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <User size={15} />
                My account
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/60 transition hover:text-white"
              >
                <LogOut size={15} />
              </button>
            </>
          ) : (
            <Link
              href={`/${slug}/login`}
              className="rounded-xl border border-white/30 bg-white/10 px-5 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              Sign in
            </Link>
          )}
        </div>

        {/* Mobile burger */}
        <button
          className="rounded-lg p-2 text-white md:hidden"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div
          className="border-t border-white/10 px-4 pb-4 pt-2 md:hidden"
          style={{ backgroundColor: primary }}
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-4 py-3 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white"
            >
              {l.label}
            </Link>
          ))}
          <div className="mt-2 border-t border-white/10 pt-2">
            {user ? (
              <>
                <Link
                  href={`/${slug}/account`}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-4 py-3 text-sm font-medium text-white/80"
                >
                  My account
                </Link>
                <button
                  onClick={handleSignOut}
                  className="block w-full rounded-lg px-4 py-3 text-left text-sm text-white/60"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href={`/${slug}/login`}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-4 py-3 text-sm font-semibold text-white"
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
