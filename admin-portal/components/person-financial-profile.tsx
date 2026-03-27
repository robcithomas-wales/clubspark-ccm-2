import { getMembershipsByCustomer, getBookings } from "@/lib/api"
import { PoundSterling, CreditCard, CalendarDays, TrendingUp } from "lucide-react"

function formatCurrency(pence: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100)
}

export async function PersonFinancialProfile({ customerId }: { customerId: string }) {
  let memberships: any[] = []
  let bookings: any[] = []

  try {
    const [mResult, bResult] = await Promise.allSettled([
      getMembershipsByCustomer(customerId),
      getBookings(1, 100, { customerId }),
    ])
    if (mResult.status === "fulfilled") memberships = mResult.value
    if (bResult.status === "fulfilled") bookings = bResult.value.data ?? []
  } catch {
    // non-fatal
  }

  const activeMemberships = memberships.filter((m: any) => m.status === "active")
  const activeMembershipValue = activeMemberships.reduce(
    (sum: number, m: any) => sum + (m.planPrice ?? 0),
    0,
  )

  const paidBookings = bookings.filter((b: any) => b.paymentStatus === "paid")
  const totalBookingRevenue = paidBookings.reduce(
    (sum: number, b: any) => sum + (b.totalAmount ?? b.price ?? 0),
    0,
  )

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const recentBookings = paidBookings.filter(
    (b: any) => new Date(b.startsAt) >= thirtyDaysAgo,
  )
  const recentRevenue = recentBookings.reduce(
    (sum: number, b: any) => sum + (b.totalAmount ?? b.price ?? 0),
    0,
  )

  const stats = [
    {
      label: "Active memberships",
      value: activeMemberships.length.toString(),
      sub: activeMemberships.length > 0 ? `${formatCurrency(activeMembershipValue)} plan value` : "None",
      icon: CreditCard,
      accent: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Total booking revenue",
      value: formatCurrency(totalBookingRevenue),
      sub: `${paidBookings.length} paid booking${paidBookings.length !== 1 ? "s" : ""}`,
      icon: PoundSterling,
      accent: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Last 30 days",
      value: formatCurrency(recentRevenue),
      sub: `${recentBookings.length} booking${recentBookings.length !== 1 ? "s" : ""}`,
      icon: TrendingUp,
      accent: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Total bookings",
      value: bookings.length.toString(),
      sub: `${bookings.filter((b: any) => b.status === "confirmed" || b.status === "approved").length} confirmed`,
      icon: CalendarDays,
      accent: "text-amber-600",
      bg: "bg-amber-50",
    },
  ]

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Financial profile</h2>
      </div>
      <div className="grid grid-cols-2 gap-px bg-slate-200 md:grid-cols-4">
        {stats.map(({ label, value, sub, icon: Icon, accent, bg }) => (
          <div key={label} className="bg-white px-5 py-4">
            <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-xl ${bg}`}>
              <Icon className={`h-4 w-4 ${accent}`} />
            </div>
            <div className="text-lg font-semibold text-slate-900">{value}</div>
            <div className="mt-0.5 text-xs font-medium text-slate-500">{label}</div>
            <div className="mt-0.5 text-xs text-slate-400">{sub}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
