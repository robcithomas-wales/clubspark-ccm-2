"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, X } from "lucide-react"

type BookableUnit = {
  id: string
  name: string
  unitType?: string | null
  parentUnitId?: string | null
  capacity?: number | null
  resourceId?: string | null
  venueId?: string | null
  tenantId?: string | null
}

type Customer = {
  id: string
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
}

type AddOn = {
  id: string
  name: string
  description?: string | null
  price?: number | null
  currency?: string | null
  addOnType?: string | null
}

type CreateBookingFormProps = {
  units: BookableUnit[]
  addOns?: AddOn[]
}

const tenantId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
const venueId = "11111111-1111-1111-1111-111111111111"

function toLocalDateTimeInputValue(value?: string | null) {
  if (!value) return ""

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return ""

  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  const hours = `${date.getHours()}`.padStart(2, "0")
  const minutes = `${date.getMinutes()}`.padStart(2, "0")

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function toIsoStringFromLocalInput(value: string) {
  if (!value) return null

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return null

  return date.toISOString()
}

function getUnitTypeLabel(unitType?: string | null) {
  if (!unitType) return "Unknown"
  return unitType.charAt(0).toUpperCase() + unitType.slice(1)
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

  if (!q) return false

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

export function CreateBookingForm({ units, addOns = [] }: CreateBookingFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialUnit = searchParams.get("unit") || ""
  const initialStart = searchParams.get("start") || ""
  const initialEnd = searchParams.get("end") || ""
  const initialCustomerId = searchParams.get("customerId") || ""
  const initialRecurring = searchParams.get("recurring") === "1"

  const [bookableUnitId, setBookableUnitId] = React.useState(initialUnit)
  const [startsAt, setStartsAt] = React.useState(
    toLocalDateTimeInputValue(initialStart)
  )
  const [endsAt, setEndsAt] = React.useState(
    toLocalDateTimeInputValue(initialEnd)
  )
  const [selectedCustomerId, setSelectedCustomerId] = React.useState(initialCustomerId)
  const [customerSearch, setCustomerSearch] = React.useState("")
  const [customers, setCustomers] = React.useState<Customer[]>([])
  const [bookingSource, setBookingSource] = React.useState("admin")
  const [paymentStatus, setPaymentStatus] = React.useState("unpaid")
  const [notes, setNotes] = React.useState("")
  const [selectedAddOnIds, setSelectedAddOnIds] = React.useState<Set<string>>(new Set())
  const [selectedOptionalUnitIds, setSelectedOptionalUnitIds] = React.useState<Set<string>>(new Set())
  const [bookingStatus, setBookingStatus] = React.useState<"active" | "pending">("active")
  const [adminOverride, setAdminOverride] = React.useState(false)
  const [isRecurring, setIsRecurring] = React.useState(initialRecurring)
  const [rrule, setRrule] = React.useState("FREQ=WEEKLY;COUNT=10")
  const [minSessions, setMinSessions] = React.useState("")
  const [maxSessions, setMaxSessions] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isLoadingCustomers, setIsLoadingCustomers] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (initialUnit) setBookableUnitId(initialUnit)
    if (initialStart) setStartsAt(toLocalDateTimeInputValue(initialStart))
    if (initialEnd) setEndsAt(toLocalDateTimeInputValue(initialEnd))
    if (initialCustomerId) setSelectedCustomerId(initialCustomerId)
  }, [initialUnit, initialStart, initialEnd, initialCustomerId])

  React.useEffect(() => {
    let isMounted = true

    async function loadCustomers() {
      setIsLoadingCustomers(true)

      try {
        const response = await fetch("/api/customers", {
          cache: "no-store",
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data?.error || "Failed to load customers")
        }

        if (isMounted) {
          const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : [])
          setCustomers(list)
        }
      } catch {
        if (isMounted) {
          setCustomers([])
        }
      } finally {
        if (isMounted) {
          setIsLoadingCustomers(false)
        }
      }
    }

    loadCustomers()

    return () => {
      isMounted = false
    }
  }, [])

  const primaryUnits = units.filter((u) => !(u as any).isOptionalExtra)
  const optionalExtraUnits = units.filter((u) => (u as any).isOptionalExtra)
  const selectedUnit = primaryUnits.find((unit) => unit.id === bookableUnitId) || null
  const selectedCustomer =
    customers.find((customer) => customer.id === selectedCustomerId) || null

  const hasCustomerSearch = customerSearch.trim().length > 0

  const filteredCustomers =
    hasCustomerSearch && !isLoadingCustomers
      ? customers.filter((customer) => matchesCustomer(customer, customerSearch))
      : []

  const selectedResourceId = selectedUnit?.resourceId || ""
  const selectedVenueId = selectedUnit?.venueId || venueId
  const selectedTenantId = selectedUnit?.tenantId || tenantId

  const startIsoForReturn = toIsoStringFromLocalInput(startsAt) || initialStart || ""
  const endIsoForReturn = toIsoStringFromLocalInput(endsAt) || initialEnd || ""

  const createCustomerHref = `/customers/new?returnTo=${encodeURIComponent(
    `/create-booking?unit=${encodeURIComponent(bookableUnitId)}&start=${encodeURIComponent(
      startIsoForReturn
    )}&end=${encodeURIComponent(endIsoForReturn)}`
  )}`

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setError(null)
    setSuccessMessage(null)

    if (!bookableUnitId) {
      setError("Please select a bookable unit.")
      return
    }

    if (!selectedUnit) {
      setError("The selected unit could not be found.")
      return
    }

    if (!startsAt || !endsAt) {
      setError("Please enter a start and end time.")
      return
    }

    if (!selectedResourceId) {
      setError("The selected unit does not have a valid resource id.")
      return
    }

    const startsAtIso = toIsoStringFromLocalInput(startsAt)
    const endsAtIso = toIsoStringFromLocalInput(endsAt)

    if (!startsAtIso || !endsAtIso) {
      setError("Please enter valid booking times.")
      return
    }

    if (new Date(endsAtIso) <= new Date(startsAtIso)) {
      setError("End time must be later than start time.")
      return
    }

    setIsSubmitting(true)

    try {
      const commonPayload = {
        venueId: selectedVenueId,
        resourceId: selectedResourceId,
        bookableUnitId: selectedUnit.id,
        customerId: selectedCustomerId || null,
        bookingSource,
        paymentStatus,
        status: bookingStatus,
        adminOverride: adminOverride || undefined,
        startsAt: startsAtIso,
        endsAt: endsAtIso,
        notes: notes.trim() || null,
        optionalUnitIds: Array.from(selectedOptionalUnitIds),
      }

      if (isRecurring) {
        const response = await fetch("/api/booking-series", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...commonPayload,
            rrule,
            ...(minSessions ? { minSessions: Number(minSessions) } : {}),
            ...(maxSessions ? { maxSessions: Number(maxSessions) } : {}),
          }),
        })
        const result = await response.json().catch(() => null)
        if (!response.ok) {
          setError(result?.message ?? result?.error ?? "Failed to create recurring booking.")
          return
        }
        const seriesId = result?.data?.series?.id
        setSuccessMessage("Recurring booking series created.")
        router.push(seriesId ? `/booking-series/${seriesId}` : "/booking-series")
        router.refresh()
        return
      }

      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: selectedTenantId, ...commonPayload }),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        if (result?.error === "BOOKING_CONFLICT") {
          setError("That slot is no longer available. Please choose another time.")
        } else if (result?.error === "BOOKABLE_UNIT_DOES_NOT_BELONG_TO_RESOURCE") {
          setError("The selected unit no longer matches the resource. Please return to availability and try again.")
        } else if (result?.error === "BOOKABLE_UNIT_DOES_NOT_BELONG_TO_VENUE") {
          setError("The selected unit no longer matches the venue. Please return to availability and try again.")
        } else if (result?.error === "BOOKABLE_UNIT_NOT_FOUND") {
          setError("The selected unit could not be found.")
        } else if (result?.error === "BOOKABLE_UNIT_INACTIVE") {
          setError("The selected unit is no longer active.")
        } else if (typeof result?.error === "string") {
          setError(result.error)
        } else {
          setError("Failed to create booking.")
        }
        return
      }

      const bookingId = result?.data?.id
      if (bookingId && selectedAddOnIds.size > 0) {
        await Promise.allSettled(
          Array.from(selectedAddOnIds).map((addOnId) =>
            fetch(`/api/bookings/${bookingId}/add-ons`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                addOnId,
                startsAt: startsAtIso,
                endsAt: endsAtIso,
                quantity: 1,
              }),
            })
          )
        )
      }

      setSuccessMessage("Booking created successfully.")
      router.push(`/availability?date=${startsAtIso.split("T")[0]}`)
      router.refresh()
    } catch {
      setError("Something went wrong while creating the booking.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="space-y-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Booking flow
          </div>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">
            Create a new booking
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Select a customer, choose a facility unit, confirm the time, and create the booking.
          </p>
        </div>

        {(bookableUnitId || startsAt || endsAt) && (
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
              Prefilled from availability board
            </div>
            <div className="mt-3 grid gap-4 md:grid-cols-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-700">
                  Unit
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {selectedUnit?.name || "Not selected"}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-700">
                  Start
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {startsAt || "Not selected"}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-700">
                  End
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {endsAt || "Not selected"}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-700">
                  Resource ID
                </div>
                <div className="mt-1 break-all text-sm font-semibold text-slate-900">
                  {selectedResourceId || "Not available"}
                </div>
              </div>
            </div>
          </div>
        )}
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
                  placeholder={
                    isLoadingCustomers
                      ? "Loading customers..."
                      : "Search by name, email, phone or id"
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-900 outline-none"
                  disabled={isLoadingCustomers}
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
              href={createCustomerHref}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Create new customer
            </Link>
          </div>

          {!hasCustomerSearch ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              Start typing to search for a customer.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {isLoadingCustomers
                  ? "Loading customers"
                  : `${filteredCustomers.length} matching customer${filteredCustomers.length === 1 ? "" : "s"}`}
              </div>

              {isLoadingCustomers ? (
                <div className="px-4 py-6 text-sm text-slate-500">
                  Loading customers...
                </div>
              ) : filteredCustomers.length === 0 ? (
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
                          isSelected
                            ? "bg-emerald-50"
                            : "bg-white hover:bg-slate-50"
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
          )}

          {selectedCustomer && (
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
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Facility
          </div>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">
            Select bookable unit
          </h3>
        </div>

        <div className="grid gap-4">
          <div>
            <label
              htmlFor="bookableUnitId"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Bookable unit
            </label>

            <select
              id="bookableUnitId"
              value={bookableUnitId}
              onChange={(event) => setBookableUnitId(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none"
            >
              <option value="">Select a unit</option>
              {primaryUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </div>

          {selectedUnit && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">
                {selectedUnit.name}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                  {getUnitTypeLabel(selectedUnit.unitType)}
                </span>
                <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                  Capacity {selectedUnit.capacity ?? "n/a"}
                </span>
                <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                  Resource {selectedResourceId || "n/a"}
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {optionalExtraUnits.length > 0 && (
        <section className="space-y-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Extras
            </div>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">
              Optional extras
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Add bookable resources alongside the main unit — e.g. ball machines, changing rooms.
            </p>
          </div>
          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {optionalExtraUnits.map((unit) => {
              const checked = selectedOptionalUnitIds.has(unit.id)
              return (
                <label
                  key={unit.id}
                  className="flex cursor-pointer items-center gap-4 px-4 py-3 transition hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      setSelectedOptionalUnitIds((prev) => {
                        const next = new Set(prev)
                        if (next.has(unit.id)) next.delete(unit.id)
                        else next.add(unit.id)
                        return next
                      })
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-[#1857E0]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900">{unit.name}</div>
                    {unit.unitType && (
                      <div className="mt-0.5 text-xs text-slate-500">{unit.unitType}</div>
                    )}
                  </div>
                  {unit.capacity != null && (
                    <div className="shrink-0 text-xs text-slate-500">Cap {unit.capacity}</div>
                  )}
                </label>
              )
            })}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Time
          </div>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">
            Choose booking time
          </h3>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="startsAt"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Start time
            </label>
            <input
              id="startsAt"
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="endsAt"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              End time
            </label>
            <input
              id="endsAt"
              type="datetime-local"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Recurrence
            </div>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">
              Recurring booking
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setIsRecurring((v) => !v)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${isRecurring ? "bg-[#1832A8]" : "bg-slate-200"}`}
            role="switch"
            aria-checked={isRecurring}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition duration-200 ${isRecurring ? "translate-x-5" : "translate-x-0"}`}
            />
          </button>
        </div>

        {isRecurring && (
          <div className="space-y-3">
            <div>
              <label htmlFor="rrule" className="mb-2 block text-sm font-medium text-slate-700">
                Recurrence rule (RRULE)
              </label>
              <input
                id="rrule"
                type="text"
                value={rrule}
                onChange={(e) => setRrule(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none font-mono"
                placeholder="FREQ=WEEKLY;COUNT=10"
              />
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 space-y-1">
              <div className="font-semibold">RRULE examples</div>
              <div><code>FREQ=WEEKLY;COUNT=10</code> — weekly for 10 weeks</div>
              <div><code>FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=12</code> — Mon/Wed/Fri for 4 weeks</div>
              <div><code>FREQ=MONTHLY;BYMONTHDAY=1;COUNT=6</code> — 1st of month for 6 months</div>
              <div><code>FREQ=WEEKLY;UNTIL=20261231T000000Z</code> — weekly until 31 Dec 2026</div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="minSessions" className="mb-2 block text-sm font-medium text-slate-700">
                  Min sessions <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  id="minSessions"
                  type="number"
                  min={1}
                  value={minSessions}
                  onChange={(e) => setMinSessions(e.target.value)}
                  placeholder="e.g. 4"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none"
                />
              </div>
              <div>
                <label htmlFor="maxSessions" className="mb-2 block text-sm font-medium text-slate-700">
                  Max sessions <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  id="maxSessions"
                  type="number"
                  min={1}
                  value={maxSessions}
                  onChange={(e) => setMaxSessions(e.target.value)}
                  placeholder="e.g. 10"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none"
                />
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Booking context
          </div>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">
            Source and notes
          </h3>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="bookingSource"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Booking source
            </label>
            <select
              id="bookingSource"
              value={bookingSource}
              onChange={(event) => setBookingSource(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none"
            >
              <option value="admin">Admin</option>
              <option value="phone">Phone</option>
              <option value="app">App</option>
              <option value="walk_in">Walk in</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="paymentStatus"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Payment status
            </label>
            <select
              id="paymentStatus"
              value={paymentStatus}
              onChange={(event) => setPaymentStatus(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none"
            >
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid (offline)</option>
              <option value="free">Free</option>
              <option value="pending">Send payment request</option>
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor="notes"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Notes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={4}
            placeholder="Add any useful booking notes"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
        </div>
      </section>

      {addOns.length > 0 && (
        <section className="space-y-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Extras
            </div>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">
              Product add-ons
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Optionally attach product add-ons to this booking.
            </p>
          </div>

          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {addOns.map((addOn) => {
              const checked = selectedAddOnIds.has(addOn.id)
              return (
                <label
                  key={addOn.id}
                  className="flex cursor-pointer items-center gap-4 px-4 py-3 transition hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      setSelectedAddOnIds((prev) => {
                        const next = new Set(prev)
                        if (next.has(addOn.id)) {
                          next.delete(addOn.id)
                        } else {
                          next.add(addOn.id)
                        }
                        return next
                      })
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-[#1857E0]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900">{addOn.name}</div>
                    {addOn.description && (
                      <div className="mt-0.5 text-xs text-slate-500">{addOn.description}</div>
                    )}
                  </div>
                  {addOn.price != null && (
                    <div className="shrink-0 text-sm font-semibold text-slate-700">
                      {addOn.currency ? `${addOn.currency} ` : ""}{addOn.price}
                    </div>
                  )}
                </label>
              )
            })}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Admin options
          </div>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">
            Booking status &amp; overrides
          </h3>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="bookingStatus" className="mb-2 block text-sm font-medium text-slate-700">
              Initial status
            </label>
            <select
              id="bookingStatus"
              value={bookingStatus}
              onChange={(e) => setBookingStatus(e.target.value as "active" | "pending")}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none"
            >
              <option value="active">Active (confirmed immediately)</option>
              <option value="pending">Pending (requires approval)</option>
            </select>
          </div>

          <div className="flex items-center gap-4 pt-7">
            <button
              type="button"
              role="switch"
              aria-checked={adminOverride}
              onClick={() => setAdminOverride((v) => !v)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${adminOverride ? "bg-[#1857E0]" : "bg-slate-300"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${adminOverride ? "translate-x-6" : "translate-x-1"}`} />
            </button>
            <div>
              <div className="text-sm font-medium text-slate-900">Admin override</div>
              <div className="text-xs text-slate-500">Bypass booking rules for this booking.</div>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {successMessage}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#1832A8] px-5 text-sm font-semibold text-white transition hover:bg-[#142a8c] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (isRecurring ? "Creating series..." : "Creating booking...") : (isRecurring ? "Create recurring series" : "Create booking")}
        </button>

        <button
          type="button"
          onClick={() => {
            const dateForReturn =
              toIsoStringFromLocalInput(startsAt)?.split("T")[0] ||
              initialStart.split("T")[0] ||
              ""

            router.push(
              dateForReturn
                ? `/availability?date=${dateForReturn}`
                : "/availability"
            )
          }}
          className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Back to availability
        </button>
      </div>
    </form>
  )
}