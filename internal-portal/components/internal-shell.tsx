"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, Building2, Flag, ScrollText, UserX, Shield, LogOut, ChevronRight } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const NAV = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Accounts", href: "/accounts", icon: Building2 },
  { label: "Feature Flags", href: "/flags", icon: Flag },
  { label: "Impersonation", href: "/impersonation", icon: UserX },
  { label: "Audit Log", href: "/audit", icon: ScrollText },
]

export function InternalShell({
  title,
  description,
  children,
  breadcrumb,
}: {
  title: string
  description?: string
  children: React.ReactNode
  breadcrumb?: { label: string; href: string }[]
}) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col bg-slate-900 text-white">
        {/* Logo */}
        <div className="flex items-center gap-2.5 border-b border-slate-700/60 px-4 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-orange-400">ClubSpark</div>
            <div className="text-[11px] text-slate-400">Internal</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 p-3">
          {NAV.map(({ label, href, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/")
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-orange-500 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-700/60 p-3">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex flex-1 flex-col overflow-auto">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div className="flex items-center gap-1.5 text-sm text-slate-500">
            <span className="text-orange-500 font-semibold">Internal</span>
            {breadcrumb?.map((crumb) => (
              <span key={crumb.href} className="flex items-center gap-1.5">
                <ChevronRight className="h-3.5 w-3.5" />
                <Link href={crumb.href} className="hover:text-slate-900 transition">{crumb.label}</Link>
              </span>
            ))}
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-slate-900 font-medium">{title}</span>
          </div>
          <div className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
            Staff only
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-6">
          {(title || description) && (
            <div className="mb-6">
              <h1 className="text-xl font-bold text-slate-900">{title}</h1>
              {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  )
}
