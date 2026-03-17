"use client"

import * as React from "react"
import Link from "next/link"
import { Search, X } from "lucide-react"

type Plan = {
  id: string
  name?: string | null
}

type Customer = {
  id: string
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
}

type Membership = {
  id: string
  planId?: string | null
  customerId?: string | null
  startDate?: string | null
  endDate?: string | null
  renewalDate?: string | null
  autoRenew?: boolean | null
  status?: string | null
  paymentStatus?: string | null
  reference?: string | null
  source?: string | null
  notes?: string | null
}

type EditMembershipFormProps = {
  membership: Membership
  plans: Plan[]
  customers: Customer[]
  action: (formData: FormData) => void | Promise<void>
}

function getCustomerName(customer: Customer) {
  const firstName = customer.firstName?.trim() || ""
  const lastName = customer.lastName?.trim() || ""
  const fullName = `${firstName} ${lastName}`.trim()

  return fullName || "Unnamed customer"
}

function getCustomerSecondary(customer: Customer) {
  return customer.email || customer.phone || customer.id
}

function matchesCustomer(customer: Customer, query: string) {
  const q = query.trim().toLowerCase()

  if (!q) return true

  const name = getCustomerName(customer).toLowerCase()
  const email = (customer.email || "").toLowerCase()
  const phone = (customer.phone || "").toLowerCase()
  const id = customer.id.toLowerCase()

  return (
    name.includes(q) ||
    email.includes(q) ||
    phone.includes(q) ||
    id.includes(q)
  )
}

function toDateInputValue(value?: string | null) {
  if (!value) return ""
  return String(value).slice(0, 10)
}

export function EditMembershipForm({
  membership,
  plans,
  customers,
  action,
}: EditMembershipFormProps) {
  const [customerSearch, setCustomerSearch] = React.useState("")
  const [selectedCustomerId, setSelectedCustomerId] = React.useState(
    membership.customerId || ""
  )

  const filteredCustomers = customers.filter((customer) =>
    matchesCustomer(customer, customerSearch)
  )

  const selectedCustomer =
    customers.find((customer) => customer.id === selectedCustomerId) || null

  return (
    <form action={action} className="px-6 py-6">
      <input type="hidden" name="customerId" value={selectedCustomerId} />

      <div className="space-y-8">
        <section className="space-y-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Membership
            </div>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">
              Core details
            </h3>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Membership Plan
              </label>

              <select
                name="planId"
                defaultValue={membership.planId || ""}
                required
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#1832A8] focus:ring-4 focus:ring-blue-100"
              >
                <option value="" disabled>
                  Select a membership plan
                </option>

                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name || "Unnamed plan"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Reference
              </label>

              <input
                name="reference"
                type="text"
                defaultValue={membership.reference || ""}
                placeholder="Optional admin reference"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#1832A8] focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Source
              </label>

              <select
                name="source"
                defaultValue={membership.source || "admin"}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#1832A8] focus:ring-4 focus:ring-blue-100"
              >
                <option value="admin">Admin</option>
                <option value="phone">Phone</option>
                <option value="import">Import</option>
                <option value="migration">Migration</option>
                <option value="app">App</option>
              </select>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Customer
            </div>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">
              Select customer
            </h3>
          </div>

          <div className="grid gap-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="flex-1">
                <label
                  htmlFor="customerSearch"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Search customer
                </label>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    id="customerSearch"
                    type="text"
                    value={customerSearch}
                    onChange={(event) => setCustomerSearch(event.target.value)}
                    placeholder="Search by name, email, phone or id"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-900 outline-none"
                  />

                  {customerSearch ? (
                    <button
                      type="button"
                      onClick={() => setCustomerSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>

              <Link
                href="/customers/new"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Create new customer
              </Link>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {filteredCustomers.length} matching customer
                {filteredCustomers.length === 1 ? "" : "s"}
              </div>

              {filteredCustomers.length === 0 ? (
                <div className="px-4 py-6 text-sm text-slate-500">
                  No customers found. Try a different search or create a new customer.
                </div>
              ) : (
                <div className="max-h-72 divide-y divide-slate-200 overflow-y-auto">
                  {filteredCustomers.map((customer) => {
                    const isSelected = customer.id === selectedCustomerId

                    return (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => setSelectedCustomerId(customer.id)}
                        className={`flex w-full items-start justify-between gap-4 px-4 py-4 text-left transition ${
                          isSelected ? "bg-emerald-50" : "bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900">
                            {getCustomerName(customer)}
                          </div>
                          <div className="mt-1 text-sm text-slate-500">
                            {getCustomerSecondary(customer)}
                          </div>
                        </div>

                        <div className="shrink-0">
                          {isSelected ? (
                            <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                              Selected
                            </span>
                          ) : null}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {selectedCustomer ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                  Selected customer
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-900">
                  {getCustomerName(selectedCustomer)}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                    {selectedCustomer.email || "No email"}
                  </span>
                  <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                    {selectedCustomer.phone || "No phone"}
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Dates
            </div>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">
              Membership dates
            </h3>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Start Date
              </label>

              <input
                name="startDate"
                type="date"
                required
                defaultValue={toDateInputValue(membership.startDate)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#1832A8] focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                End Date
              </label>

              <input
                name="endDate"
                type="date"
                defaultValue={toDateInputValue(membership.endDate)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#1832A8] focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Renewal Date
              </label>

              <input
                name="renewalDate"
                type="date"
                defaultValue={toDateInputValue(membership.renewalDate)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#1832A8] focus:ring-4 focus:ring-blue-100"
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Status
            </div>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">
              Membership state
            </h3>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Status
              </label>

              <select
                name="status"
                defaultValue={membership.status || "active"}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#1832A8] focus:ring-4 focus:ring-blue-100"
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Payment Status
              </label>

              <select
                name="paymentStatus"
                defaultValue={membership.paymentStatus || "unpaid"}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#1832A8] focus:ring-4 focus:ring-blue-100"
              >
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
                <option value="part_paid">Part paid</option>
                <option value="failed">Failed</option>
                <option value="waived">Waived</option>
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <input
                  type="checkbox"
                  name="autoRenew"
                  defaultChecked={Boolean(membership.autoRenew)}
                  className="h-4 w-4 rounded border-slate-300 text-[#1832A8] focus:ring-[#1832A8]"
                />
                <span className="text-sm font-medium text-slate-700">
                  Auto renew
                </span>
              </label>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Admin
            </div>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">
              Internal notes
            </h3>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Notes
            </label>

            <textarea
              name="notes"
              rows={4}
              defaultValue={membership.notes || ""}
              placeholder="Add any useful admin notes about this membership"
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 transition focus:border-[#1832A8] focus:ring-4 focus:ring-blue-100"
            />
          </div>
        </section>
      </div>

      <div className="mt-8 flex items-center justify-end gap-3">
        <Link
          href={`/membership/memberships/${membership.id}`}
          className="inline-flex items-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </Link>

        <button
          type="submit"
          className="inline-flex items-center rounded-2xl bg-[#1832A8] px-5 py-3 text-sm font-semibold !text-white shadow-sm transition hover:bg-[#142a8c]"
        >
          Save Changes
        </button>
      </div>
    </form>
  )
}