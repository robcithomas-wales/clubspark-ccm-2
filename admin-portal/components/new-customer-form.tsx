"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { UserPlus } from "lucide-react"

const INPUT_CLS =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#1857E0] focus:ring-2 focus:ring-[#1857E0]/10 placeholder:text-slate-400"

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-600">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      {children}
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{children}</div>
      <div className="flex-1 border-t border-slate-100" />
    </div>
  )
}

export function NewCustomerForm({ returnTo = "/people" }: { returnTo?: string }) {
  const router = useRouter()

  const [form, setForm] = React.useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    county: "",
    postcode: "",
    country: "GB",
    marketingConsent: false,
  })

  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("First name and last name are required.")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          addressLine1: form.addressLine1.trim() || null,
          addressLine2: form.addressLine2.trim() || null,
          city: form.city.trim() || null,
          county: form.county.trim() || null,
          postcode: form.postcode.trim() || null,
          country: form.country.trim() || "GB",
          marketingConsent: form.marketingConsent,
        }),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        setError(result?.error ?? result?.message ?? "Failed to create person.")
        return
      }

      const newId = result?.data?.id ?? result?.id
      router.push(newId ? `/people/${newId}` : returnTo)
      router.refresh()
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-slate-200 px-6 py-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#1857E0] text-white">
          <UserPlus className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">New person</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Fill in what you know — only name is required.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
        {/* Name */}
        <SectionHeading>Name</SectionHeading>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" required>
            <input
              type="text"
              autoFocus
              value={form.firstName}
              onChange={set("firstName")}
              className={INPUT_CLS}
              placeholder="Sarah"
            />
          </Field>
          <Field label="Last name" required>
            <input
              type="text"
              value={form.lastName}
              onChange={set("lastName")}
              className={INPUT_CLS}
              placeholder="Jones"
            />
          </Field>
        </div>

        {/* Contact */}
        <SectionHeading>Contact</SectionHeading>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email">
            <input
              type="email"
              value={form.email}
              onChange={set("email")}
              className={INPUT_CLS}
              placeholder="sarah.jones@example.com"
            />
          </Field>
          <Field label="Phone">
            <input
              type="tel"
              value={form.phone}
              onChange={set("phone")}
              className={INPUT_CLS}
              placeholder="07700 900123"
            />
          </Field>
        </div>

        {/* Address */}
        <SectionHeading>Address</SectionHeading>
        <div className="space-y-3">
          <Field label="Address line 1">
            <input
              type="text"
              value={form.addressLine1}
              onChange={set("addressLine1")}
              className={INPUT_CLS}
              placeholder="12 Highfield Road"
            />
          </Field>
          <Field label="Address line 2">
            <input
              type="text"
              value={form.addressLine2}
              onChange={set("addressLine2")}
              className={INPUT_CLS}
              placeholder="Apartment, suite, etc. (optional)"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Town / City">
              <input
                type="text"
                value={form.city}
                onChange={set("city")}
                className={INPUT_CLS}
                placeholder="Birmingham"
              />
            </Field>
            <Field label="County">
              <input
                type="text"
                value={form.county}
                onChange={set("county")}
                className={INPUT_CLS}
                placeholder="West Midlands"
              />
            </Field>
            <Field label="Postcode">
              <input
                type="text"
                value={form.postcode}
                onChange={set("postcode")}
                className={INPUT_CLS}
                placeholder="B1 1AA"
              />
            </Field>
          </div>
        </div>

        {/* Preferences */}
        <SectionHeading>Preferences</SectionHeading>
        <label className="flex cursor-pointer items-start gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={form.marketingConsent}
            onClick={() => setForm((f) => ({ ...f, marketingConsent: !f.marketingConsent }))}
            className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#1857E0] focus:ring-offset-2 ${
              form.marketingConsent ? "bg-[#1857E0]" : "bg-slate-200"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                form.marketingConsent ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <div>
            <div className="text-sm font-medium text-slate-900">Marketing consent</div>
            <div className="text-xs text-slate-500">
              Person has agreed to receive marketing communications.
            </div>
          </div>
        </label>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1749C7] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <UserPlus className="h-4 w-4" />
            {isSubmitting ? "Creating…" : "Create person"}
          </button>
          <Link
            href={returnTo}
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </section>
  )
}
