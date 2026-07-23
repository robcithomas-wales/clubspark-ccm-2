"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { PortalLayout } from "@/components/portal-layout"

export default function NewProgrammePage() {
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
        description: form.get("description") || undefined,
        sport: form.get("sport") || undefined,
        maxParticipants: Number(form.get("maxParticipants")) || 10,
        minParticipants: Number(form.get("minParticipants")) || 1,
        price: Number(form.get("price")) || 0,
        currency: form.get("currency") || "GBP",
      }
      const enrollsFrom = form.get("enrollsFrom") as string
      const enrollsUntil = form.get("enrollsUntil") as string
      if (enrollsFrom) body.enrollsFrom = new Date(enrollsFrom).toISOString()
      if (enrollsUntil) body.enrollsUntil = new Date(enrollsUntil).toISOString()

      const res = await fetch("/api/coaching/programmes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const result = await res.json().catch(() => null)
      if (!res.ok) {
        setError(result?.message ?? result?.error ?? "Failed to create programme.")
        return
      }
      const id = result?.data?.id
      router.push(id ? `/coaching/programmes/${id}` : "/coaching/programmes")
      router.refresh()
    } catch {
      setError("Something went wrong.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PortalLayout title="New Programme" description="Create a new group coaching programme — course, camp, or academy.">
      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Programme details</h2>
            </div>
            <div className="space-y-5 px-6 py-5">
              <div>
                <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-700">Name <span className="text-red-500">*</span></label>
                <input id="name" name="name" required placeholder="e.g. Junior Tennis Academy" className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" />
              </div>
              <div>
                <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
                <textarea id="description" name="description" rows={3} placeholder="Describe the programme…" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none placeholder:text-slate-400" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="sport" className="mb-1.5 block text-sm font-medium text-slate-700">Sport</label>
                  <input id="sport" name="sport" placeholder="e.g. tennis" className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" />
                </div>
                <div>
                  <label htmlFor="currency" className="mb-1.5 block text-sm font-medium text-slate-700">Currency</label>
                  <select id="currency" name="currency" defaultValue="GBP" className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none">
                    <option value="GBP">GBP</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Capacity and pricing</h2>
            </div>
            <div className="grid gap-4 px-6 py-5 md:grid-cols-3">
              <div>
                <label htmlFor="price" className="mb-1.5 block text-sm font-medium text-slate-700">Price (£)</label>
                <input id="price" name="price" type="number" min={0} step={0.01} defaultValue={0} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" />
              </div>
              <div>
                <label htmlFor="minParticipants" className="mb-1.5 block text-sm font-medium text-slate-700">Min participants</label>
                <input id="minParticipants" name="minParticipants" type="number" min={1} defaultValue={1} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" />
              </div>
              <div>
                <label htmlFor="maxParticipants" className="mb-1.5 block text-sm font-medium text-slate-700">Max participants</label>
                <input id="maxParticipants" name="maxParticipants" type="number" min={1} defaultValue={10} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" />
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Enrolment window</h2>
            </div>
            <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
              <div>
                <label htmlFor="enrollsFrom" className="mb-1.5 block text-sm font-medium text-slate-700">Enrolment opens</label>
                <input id="enrollsFrom" name="enrollsFrom" type="date" className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" />
              </div>
              <div>
                <label htmlFor="enrollsUntil" className="mb-1.5 block text-sm font-medium text-slate-700">Enrolment closes</label>
                <input id="enrollsUntil" name="enrollsUntil" type="date" className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" />
              </div>
            </div>
          </section>

          {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}

          <div className="flex items-center gap-3">
            <button type="submit" disabled={isSubmitting} className="inline-flex h-10 items-center justify-center rounded-2xl bg-[#1832A8] px-5 text-sm font-semibold text-white hover:bg-[#142a8c] disabled:opacity-60">
              {isSubmitting ? "Creating…" : "Create programme"}
            </button>
            <a href="/coaching/programmes" className="inline-flex h-10 items-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</a>
          </div>
        </form>
      </div>
    </PortalLayout>
  )
}
