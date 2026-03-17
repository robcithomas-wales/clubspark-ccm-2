import Link from "next/link"
import { Plus } from "lucide-react"
import { getCustomers } from "@/lib/api"
import { PortalLayout } from "@/components/portal-layout"
import { PaginationBar } from "@/components/pagination-bar"

type Customer = {
  id: string
  tenantId: string
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
  createdAt?: string | null
}

function getCustomerName(customer: Customer) {
  const firstName = customer.firstName?.trim() || ""
  const lastName = customer.lastName?.trim() || ""
  const fullName = `${firstName} ${lastName}`.trim()

  return fullName || "Unnamed customer"
}

function formatDate(value?: string | null) {
  if (!value) return "n/a"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string
  value: string | number
  helper?: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md transition-shadow hover:shadow-lg">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
        {value}
      </div>
      {helper ? (
        <div className="mt-1 text-sm text-slate-500">{helper}</div>
      ) : null}
    </div>
  )
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)

  const result = await getCustomers(page)
  const customers: Customer[] = result.data ?? []
  const pagination = result.pagination

  const customersWithEmail = customers.filter((customer) => !!customer.email).length
  const customersWithPhone = customers.filter((customer) => !!customer.phone).length
  const latestCustomer = customers[0]

  return (
    <PortalLayout
      title="Customers"
      description="View and manage customer records used for assisted bookings and future self service journeys."
    >
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total customers"
            value={pagination?.total ?? 0}
            helper="Customer records in the platform"
          />
          <StatCard
            label="With email"
            value={customersWithEmail}
            helper="Useful for confirmations later"
          />
          <StatCard
            label="With phone"
            value={customersWithPhone}
            helper="Useful for assisted bookings"
          />
          <StatCard
            label="Latest customer"
            value={latestCustomer ? getCustomerName(latestCustomer) : "n/a"}
            helper={latestCustomer ? formatDate(latestCustomer.createdAt) : "No customers yet"}
          />
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Customer list
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Customer records available for phone, admin and future app bookings.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 md:block">
                {pagination?.total ?? 0} records
              </div>

              <Link
                href="/customers/new"
                className="inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-semibold !text-white shadow-sm transition hover:bg-[#1832A8]"
              >
                <Plus className="h-4 w-4 !text-white" />
                New customer
              </Link>
            </div>
          </div>

          {customers.length === 0 ? (
            <div className="px-6 py-10 text-sm text-slate-500">
              No customers found.
            </div>
          ) : (
            <>
              <div className="hidden grid-cols-4 gap-4 border-b border-slate-200 bg-slate-100 px-6 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 lg:grid">
                <div>Customer</div>
                <div>Email</div>
                <div>Phone</div>
                <div>Created</div>
              </div>

              <div className="divide-y divide-slate-200">
                {customers.map((customer) => (
                  <Link
                    key={customer.id}
                    href={`/customers/${customer.id}`}
                    className="block px-6 py-5 transition hover:bg-blue-50/40"
                  >
                    <div className="grid gap-4 lg:grid-cols-4 lg:items-center">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 lg:hidden">
                          Customer
                        </div>
                        <div className="truncate font-semibold text-slate-900">
                          {getCustomerName(customer)}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 lg:hidden">
                          Email
                        </div>
                        <div className="truncate text-sm text-slate-700">
                          {customer.email || "No email"}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 lg:hidden">
                          Phone
                        </div>
                        <div className="truncate text-sm text-slate-700">
                          {customer.phone || "No phone"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 lg:hidden">
                          Created
                        </div>
                        <div className="text-sm text-slate-700">
                          {formatDate(customer.createdAt)}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {pagination && (
                <PaginationBar
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  total={pagination.total}
                  limit={pagination.limit}
                  basePath="/customers"
                />
              )}
            </>
          )}
        </section>
      </div>
    </PortalLayout>
  )
}
