"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { PortalLayout } from "@/components/portal-layout"

const PRODUCT_TYPES = [
  { value: "booking_slot", label: "Booking slot" },
  { value: "programme_enrolment", label: "Programme enrolment" },
  { value: "membership", label: "Membership" },
  { value: "add_on", label: "Add-on" },
  { value: "competition_entry", label: "Competition entry" },
  { value: "match_fee", label: "Match fee" },
  { value: "coach_session", label: "Coach session" },
]

export default function NewProductPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const form = new FormData(e.currentTarget)
      const body: Record<string, unknown> = {
        name: form.get("name"),
        productType: form.get("productType"),
        description: form.get("description") || undefined,
        isActive: form.get("isActive") === "true",
      }
      const amount = form.get("amount") as string
      const priceType = form.get("priceType") as string
      const memberAmount = form.get("memberAmount") as string

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const result = await res.json().catch(() => null)
      if (!res.ok) {
        setError(result?.message ?? result?.error ?? "Failed to create product.")
        return
      }
      const id = result?.data?.id

      // If a price was supplied, add it immediately
      if (id && amount) {
        const priceBody: Record<string, unknown> = {
          amount: Number(amount),
          priceType: priceType || "standard",
        }
        if (memberAmount) priceBody.memberAmount = Number(memberAmount)
        await fetch(`/api/products/${id}/prices`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(priceBody),
        })
      }

      router.push(id ? `/products/${id}` : "/products")
      router.refresh()
    } catch {
      setError("Something went wrong.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PortalLayout title="New product" description="Add a product to the commerce catalogue.">
      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Product details</h2>
            </div>
            <div className="space-y-5 px-6 py-5">
              <div>
                <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-700">Name <span className="text-red-500">*</span></label>
                <input id="name" name="name" required placeholder="e.g. Junior Tennis Court Hire" className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" />
              </div>
              <div>
                <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
                <textarea id="description" name="description" rows={2} placeholder="Optional description…" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none placeholder:text-slate-400" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="productType" className="mb-1.5 block text-sm font-medium text-slate-700">Product type <span className="text-red-500">*</span></label>
                  <select id="productType" name="productType" required className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none">
                    <option value="">Select type…</option>
                    {PRODUCT_TYPES.map(pt => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="isActive" className="mb-1.5 block text-sm font-medium text-slate-700">Status</label>
                  <select id="isActive" name="isActive" defaultValue="true" className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none">
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Initial price (optional)</h2>
            </div>
            <div className="grid gap-4 px-6 py-5 md:grid-cols-3">
              <div>
                <label htmlFor="amount" className="mb-1.5 block text-sm font-medium text-slate-700">Amount (£)</label>
                <input id="amount" name="amount" type="number" min={0} step={0.01} placeholder="0.00" className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" />
              </div>
              <div>
                <label htmlFor="memberAmount" className="mb-1.5 block text-sm font-medium text-slate-700">Member price (£)</label>
                <input id="memberAmount" name="memberAmount" type="number" min={0} step={0.01} placeholder="Optional" className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" />
              </div>
              <div>
                <label htmlFor="priceType" className="mb-1.5 block text-sm font-medium text-slate-700">Price type</label>
                <select id="priceType" name="priceType" defaultValue="standard" className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none">
                  <option value="standard">Standard</option>
                  <option value="member">Member</option>
                  <option value="tiered">Tiered</option>
                </select>
              </div>
            </div>
          </section>

          {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}

          <div className="flex items-center gap-3">
            <button type="submit" disabled={isSubmitting} className="inline-flex h-10 items-center justify-center rounded-2xl bg-[#1832A8] px-5 text-sm font-semibold text-white hover:bg-[#142a8c] disabled:opacity-60">
              {isSubmitting ? "Creating…" : "Create product"}
            </button>
            <a href="/products" className="inline-flex h-10 items-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</a>
          </div>
        </form>
      </div>
    </PortalLayout>
  )
}
