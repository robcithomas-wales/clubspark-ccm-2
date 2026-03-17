import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft, Mail, Phone, CalendarDays, Hash } from "lucide-react"
import { PortalLayout } from "@/components/portal-layout"
import { getCustomerById } from "@/lib/api"

function formatDate(value?: string | null) {
  if (!value) return "n/a"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function getCustomerName(customer: any) {
  const first = customer.firstName?.trim() || ""
  const last = customer.lastName?.trim() || ""
  return `${first} ${last}`.trim() || "Unnamed customer"
}

function getInitials(customer: any) {
  const first = customer.firstName?.trim()?.[0] || ""
  const last = customer.lastName?.trim()?.[0] || ""
  return `${first}${last}`.toUpperCase() || "?"
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let customer: any
  try {
    const result = await getCustomerById(id)
    customer = result.data
  } catch {
    notFound()
  }

  if (!customer) notFound()

  return (
    <PortalLayout
      title={getCustomerName(customer)}
      description="Customer record"
    >
      <div className="space-y-6">
        <div>
          <Link
            href="/customers"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-900"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to customers
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
          <div className="flex items-center gap-5 border-b border-slate-200 px-6 py-6">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#1857E0] text-xl font-bold text-white">
              {getInitials(customer)}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                {getCustomerName(customer)}
              </h2>
              <p className="mt-1 text-sm text-slate-500">Customer</p>
            </div>
          </div>

          <div className="grid gap-px bg-slate-200 md:grid-cols-2">
            <div className="flex items-center gap-3 bg-white px-6 py-5">
              <Mail className="h-5 w-5 shrink-0 text-slate-400" />
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Email
                </div>
                <div className="mt-1 text-sm font-medium text-slate-900">
                  {customer.email || "Not provided"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white px-6 py-5">
              <Phone className="h-5 w-5 shrink-0 text-slate-400" />
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Phone
                </div>
                <div className="mt-1 text-sm font-medium text-slate-900">
                  {customer.phone || "Not provided"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white px-6 py-5">
              <CalendarDays className="h-5 w-5 shrink-0 text-slate-400" />
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Created
                </div>
                <div className="mt-1 text-sm font-medium text-slate-900">
                  {formatDate(customer.createdAt)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white px-6 py-5">
              <Hash className="h-5 w-5 shrink-0 text-slate-400" />
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Customer ID
                </div>
                <div className="mt-1 font-mono text-xs text-slate-500">
                  {customer.id}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Link
            href={`/create-booking?customerId=${customer.id}`}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-medium !text-white shadow-sm transition hover:bg-[#174ED0]"
          >
            Create booking for this customer
          </Link>
        </div>
      </div>
    </PortalLayout>
  )
}
