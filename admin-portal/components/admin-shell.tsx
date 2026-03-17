"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Bell,
  Building2,
  CalendarDays,
  ChevronDown,
  CreditCard,
  LayoutDashboard,
  MapPinned,
  Search,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react"

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Facilities", href: "/facilities", icon: MapPinned },
  { label: "Resources", href: "/resources", icon: Building2 },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Membership", href: "/membership", icon: CreditCard },
  { label: "Bookings", href: "/bookings", icon: CalendarDays },
  { label: "Settings", href: "/settings", icon: Settings },
]

export function AdminShell() {
  const pathname = usePathname()

  return (
    <div className="page-shell flex min-h-screen">
      <aside className="hidden w-[280px] shrink-0 border-r border-white/10 bg-[var(--sidebar)] text-[var(--sidebar-foreground)] lg:flex lg:flex-col">
        <div className="border-b border-white/10 px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white px-3 py-2">
              <Image
                src="/brands/clubspark-logo.png"
                alt="ClubSpark"
                width={160}
                height={42}
                priority
              />
            </div>
          </div>
        </div>

        <div className="px-4 py-6">
          <div className="mb-3 px-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sidebar-muted)]">
            Platform
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`)

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={[
                    "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition",
                    isActive
                      ? "bg-white text-[var(--text)] shadow-sm"
                      : "text-white/90 hover:bg-white/10",
                  ].join(" ")}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="mt-auto px-4 pb-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-white">
              <ShieldCheck className="h-5 w-5 text-[var(--accent)]" />
              <span className="font-semibold">Pilot platform</span>
            </div>
            <p className="text-sm leading-6 text-white/70">
              Modern SaaS admin shell for the new ClubSpark architecture pilot.
            </p>
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-[var(--border)]/70 bg-white/85 backdrop-blur">
          <div className="flex h-20 items-center gap-4 px-5 md:px-8">
            <div className="rounded-2xl bg-white px-3 py-2 shadow-sm lg:hidden">
              <Image
                src="/brands/clubspark-logo.png"
                alt="ClubSpark"
                width={140}
                height={36}
                priority
              />
            </div>

            <div className="hidden min-w-[220px] items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 md:flex">
              <Search className="h-4 w-4 text-[var(--text-muted)]" />
              <input
                className="h-11 w-full border-none bg-transparent outline-none"
                placeholder="Search tenants, venues, customers..."
              />
            </div>

            <div className="ml-auto flex items-center gap-3">
              <button className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-white">
                <Bell className="h-5 w-5 text-[var(--text)]" />
                <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
              </button>

              <button className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-white px-4 py-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-bold text-white">
                  RT
                </div>
                <div className="hidden text-left sm:block">
                  <div className="text-sm font-semibold text-[var(--text)]">
                    Rob Thomas
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">
                    Platform Admin
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 px-5 py-6 md:px-8 md:py-8">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-2">
                <span className="badge badge-green">Pilot admin portal</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-[var(--text)]">
                Clubspark Operations Portal
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-muted)] md:text-base">
                New modular admin experience for venues, customers, memberships and bookings,
                designed to sit on top of the pilot service architecture.
              </p>
            </div>

            <div className="flex gap-3">
              <button className="btn-secondary">View architecture</button>
              <Link href="/create-booking" className="btn-primary">
                Create booking
              </Link>
            </div>
          </div>

          <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Tenants" value="12" meta="2 added this week" tone="blue" />
            <MetricCard title="Venues" value="38" meta="4 active pilots" tone="green" />
            <MetricCard title="Customers" value="3,482" meta="Synced across services" tone="grey" />
            <MetricCard title="Bookings" value="1,124" meta="Today across pilot tenants" tone="blue" />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
            <div className="card p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-[var(--text)]">
                    Platform modules
                  </h2>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Initial service aligned modules for the pilot.
                  </p>
                </div>
                <span className="badge badge-blue">Separate services</span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <ModuleCard
                  title="Identity"
                  text="People, relationships, households and tenant access context."
                />
                <ModuleCard
                  title="Membership"
                  text="Schemes, plans, memberships and entitlement rules."
                />
                <ModuleCard
                  title="Venue"
                  text="Venues, resources and facility structure."
                />
                <ModuleCard
                  title="Customer"
                  text="Customer profile and booking participant records."
                />
                <ModuleCard
                  title="Booking"
                  text="Availability, booking lifecycle and conflict handling."
                />
                <ModuleCard
                  title="Gateway"
                  text="Single access layer for the admin portal and future apps."
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="card p-6">
                <h2 className="text-xl font-semibold text-[var(--text)]">
                  Pilot principles
                </h2>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--text-muted)]">
                  <li>API led platform access</li>
                  <li>Separate services by domain</li>
                  <li>Postgres with domain owned schemas</li>
                  <li>Azure deployable from the start</li>
                  <li>Event ready design with messaging later</li>
                </ul>
              </div>

              <div className="card p-6">
                <h2 className="text-xl font-semibold text-[var(--text)]">
                  First demo flow
                </h2>
                <ol className="mt-4 space-y-3 text-sm leading-6 text-[var(--text-muted)]">
                  <li>1. Sign in via Supabase</li>
                  <li>2. Create a tenant</li>
                  <li>3. Create a venue and resource</li>
                  <li>4. Create a customer</li>
                  <li>5. Create a membership scheme and plan</li>
                  <li>6. Create a booking</li>
                </ol>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

function MetricCard({
  title,
  value,
  meta,
  tone,
}: {
  title: string
  value: string
  meta: string
  tone: "blue" | "green" | "grey"
}) {
  const toneClass =
    tone === "green"
      ? "badge-green"
      : tone === "grey"
        ? "badge-grey"
        : "badge-blue"

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--text-muted)]">{title}</span>
        <span className={`badge ${toneClass}`}>Live</span>
      </div>
      <div className="text-3xl font-bold tracking-tight text-[var(--text)]">
        {value}
      </div>
      <p className="mt-2 text-sm text-[var(--text-muted)]">{meta}</p>
    </div>
  )
}

function ModuleCard({
  title,
  text,
}: {
  title: string
  text: string
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
      <h3 className="text-base font-semibold text-[var(--text)]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{text}</p>
    </div>
  )
}