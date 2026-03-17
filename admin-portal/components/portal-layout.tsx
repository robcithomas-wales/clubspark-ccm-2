"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import {
  Bell,
  CalendarDays,
  CalendarClock,
  CalendarOff,
  ChevronDown,
  CreditCard,
  LayoutDashboard,
  Layers,
  LayoutGrid,
  MapPin,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Users,
  Building2,
  Repeat2,
} from "lucide-react"

const navSections = [
  {
    label: "Operations",
    items: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
      { label: "Bookings", href: "/bookings", icon: CalendarDays },
      { label: "Recurring Series", href: "/booking-series", icon: Repeat2 },
      { label: "Availability", href: "/availability", icon: CalendarClock },
      { label: "Customers", href: "/customers", icon: Users },
      {
        label: "Membership",
        icon: CreditCard,
        children: [
          { label: "Schemes", href: "/membership/schemes" },
          { label: "Plans", href: "/membership/plans" },
          { label: "Policies", href: "/membership/policies" },
          { label: "Memberships", href: "/membership/memberships" },
        ],
      },
    ],
  },
  {
    label: "Venue Setup",
    items: [
      { label: "Facilities", href: "/facilities", icon: Building2 },
      { label: "Venues", href: "/venues", icon: MapPin },
      {
        label: "Resources",
        icon: Layers,
        children: [
          { label: "All Resources", href: "/resources" },
          { label: "Resource Groups", href: "/resource-groups" },
        ],
      },
      { label: "Bookable Units", href: "/bookable-units", icon: LayoutGrid },
      { label: "Product Add-Ons", href: "/add-ons", icon: ShoppingBag },
      { label: "Blackout Dates", href: "/blackout-dates", icon: CalendarOff },
      { label: "Availability Configs", href: "/availability-configs", icon: CalendarClock },
      { label: "Booking Rules", href: "/booking-rules", icon: ShieldCheck },
    ],
  },
  {
    label: null,
    items: [
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
]

export function PortalLayout({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  const pathname = usePathname()

  // Initialise open groups: any group whose child matches the current path starts open
  const defaultOpen = () => {
    const open: Record<string, boolean> = {}
    for (const section of navSections) {
      for (const item of section.items) {
        if ("children" in item && item.children) {
          const active = item.children.some(
            (c) => pathname === c.href || pathname.startsWith(c.href + "/")
          )
          if (active) open[item.label] = true
        }
      }
    }
    return open
  }

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(defaultOpen)

  // Re-evaluate when pathname changes (e.g. navigation opens the right group)
  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev }
      for (const section of navSections) {
        for (const item of section.items) {
          if ("children" in item && item.children) {
            const active = item.children.some(
              (c) => pathname === c.href || pathname.startsWith(c.href + "/")
            )
            if (active) next[item.label] = true
          }
        }
      }
      return next
    })
  }, [pathname])

  const toggleGroup = (label: string) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }))

  return (
    <div className="page-shell flex min-h-screen text-slate-900">
      <aside className="hidden w-[280px] shrink-0 border-r border-white/10 bg-[#0c1738] text-white lg:flex lg:flex-col" style={{background: "linear-gradient(180deg, #0c1738 0%, #0F1B3D 100%)"}}>
        <div className="border-b border-white/10 px-6 py-4">
  <Image
    src="/brands/clubspark-logo.png"
    alt="ClubSpark"
    width={220}
    height={56}
    priority
    className="h-14 w-auto object-contain"
  />
</div>

        <div className="flex flex-col gap-5 px-4 py-5">
          {navSections.map((section, si) => (
            <div key={si}>
              {section.label && (
                <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#A9BDD5]">
                  {section.label}
                </div>
              )}

              <nav className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const isParentActive = "children" in item && Array.isArray(item.children)
                    ? item.children.some(
                        (child) =>
                          pathname === child.href ||
                          (child.href !== "/" && pathname.startsWith(child.href))
                      )
                    : false

                  const active =
                    ("href" in item &&
                      item.href &&
                      (pathname === item.href ||
                        (item.href !== "/" && pathname.startsWith(item.href)))) ||
                    isParentActive

                  if ("children" in item && item.children) {
                    const isOpen = !!openGroups[item.label]
                    return (
                      <div key={item.label}>
                        <button
                          type="button"
                          onClick={() => toggleGroup(item.label)}
                          className={[
                            "group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-all duration-150",
                            active
                              ? "bg-[#1832A8] text-white shadow-md ring-1 ring-white/10"
                              : "text-white/80 hover:bg-white/10 hover:text-white",
                          ].join(" ")}
                        >
                          <Icon
                            className={[
                              "h-5 w-5 shrink-0",
                              active ? "text-white" : "text-[#A9BDD5] group-hover:text-white",
                            ].join(" ")}
                          />
                          <span className="flex-1">{item.label}</span>
                          <ChevronDown
                            className={[
                              "h-3.5 w-3.5 opacity-60 transition-transform duration-200",
                              isOpen ? "rotate-180" : "",
                            ].join(" ")}
                          />
                        </button>

                        {isOpen && (
                          <div className="ml-6 mt-1 space-y-0.5">
                            {item.children.map((child) => {
                              const childActive =
                                pathname === child.href ||
                                (child.href !== "/" && pathname.startsWith(child.href))

                              return (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  className={[
                                    "block rounded-lg px-3 py-2 text-sm transition-all duration-150",
                                    childActive
                                      ? "bg-[#1857E0] text-white"
                                      : "text-[#A9BDD5] hover:bg-white/10 hover:text-white",
                                  ].join(" ")}
                                >
                                  {child.label}
                                </Link>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  }

                  const leafHref = (item as { href: string }).href
                  return (
                    <Link
                      key={leafHref}
                      href={leafHref}
                      className={[
                        "group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-all duration-150",
                        active
                          ? "bg-[#1832A8] text-white shadow-md ring-1 ring-white/10"
                          : "text-white/80 hover:bg-white/10 hover:text-white",
                      ].join(" ")}
                    >
                      <Icon
                        className={[
                          "h-5 w-5 shrink-0",
                          active ? "text-white" : "text-[#A9BDD5] group-hover:text-white",
                        ].join(" ")}
                      />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </nav>
            </div>
          ))}
        </div>

        <div className="mt-auto px-4 pb-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-white">
              <ShieldCheck className="h-5 w-5 text-[#5EE082]" />
              <span className="font-semibold">Pilot platform</span>
            </div>
            <p className="text-sm leading-6 text-[#A9BDD5]">
              Modern multi sport operations portal built on separate services.
            </p>
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-md">
          <div className="flex h-[76px] items-center gap-4 px-5 md:px-8">
            <div className="rounded-2xl bg-white px-3 py-2 shadow-sm lg:hidden">
              <Image
                src="/brands/clubspark-logo.png"
                alt="ClubSpark"
                width={40}
                height={36}
                priority
              />
            </div>

            <div className="hidden min-w-[240px] max-w-[440px] flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 md:flex">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                className="h-10 w-full border-none bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                placeholder="Search facilities, bookings, customers..."
              />
            </div>

            <div className="ml-auto flex items-center gap-3">
              <button className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:bg-slate-50">
                <Bell className="h-5 w-5 text-slate-700" />
                <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#5EE082]" />
              </button>

              <button className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm transition hover:bg-slate-50">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1857E0] text-sm font-bold text-white">
                  RT
                </div>
                <div className="hidden text-left sm:block">
                  <div className="text-sm font-semibold text-slate-900">
                    Demo Sports Centre
                  </div>
                  <div className="text-xs text-slate-500">Venue Admin</div>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 px-5 py-4 md:px-8 md:py-5">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md">
              <div className="bg-[linear-gradient(135deg,#0c1738_0%,#1832A8_60%,#1857E0_100%)] px-6 py-6 text-white md:px-8 md:py-7">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 max-w-4xl">
                    <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-sm md:text-4xl">
                      {title}
                    </h1>

                    {description ? (
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-white/80 md:text-base">
                        {description}
                      </p>
                    ) : null}
                  </div>

                  <div className="shrink-0">
                    <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
                      Pilot portal
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {children}
          </div>
        </div>
      </main>
    </div>
  )
}