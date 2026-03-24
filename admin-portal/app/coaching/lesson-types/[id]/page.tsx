"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { PortalLayout } from "@/components/portal-layout"

type LessonType = {
  name: string
  description?: string | null
  sport?: string | null
  durationMinutes: number
  maxParticipants: number
  pricePerSession: string
  currency: string
  isActive: boolean
}

const SPORTS = ["tennis", "padel", "squash", "badminton", "pickleball", "other"]

export default function LessonTypeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [lt, setLt] = useState<LessonType | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/coaching/lesson-types/${id}`)
      .then((r) => r.json())
      .then((r) => setLt(r.data as LessonType))
      .catch((e: Error) => setError(e.message))
  }, [id])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!lt) return
    setSaving(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    try {
      const res = await fetch(`/api/coaching/lesson-types/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name") as string,
          description: (fd.get("description") as string) || undefined,
          sport: (fd.get("sport") as string) || undefined,
          durationMinutes: Number(fd.get("durationMinutes")),
          maxParticipants: Number(fd.get("maxParticipants")),
          pricePerSession: Number(fd.get("pricePerSession")),
          isActive: fd.get("isActive") === "true",
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? "Failed to update lesson type")
      }
      router.push("/coaching/lesson-types")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update")
    } finally {
      setSaving(false)
    }
  }

  if (!lt && !error) {
    return <PortalLayout title="Lesson Type"><p className="text-sm text-slate-500">Loading…</p></PortalLayout>
  }

  if (error && !lt) {
    return <PortalLayout title="Lesson Type"><p className="text-sm text-red-500">{error}</p></PortalLayout>
  }

  return (
    <PortalLayout title={lt!.name} description="Edit this lesson type.">
      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Name *</label>
              <input name="name" required defaultValue={lt!.name}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]" />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Description</label>
              <textarea name="description" rows={3} defaultValue={lt!.description ?? ""}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Sport</label>
              <select name="sport" defaultValue={lt!.sport ?? ""}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]">
                <option value="">— Select —</option>
                {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Duration (minutes)</label>
              <input name="durationMinutes" type="number" min={5} step={5} defaultValue={lt!.durationMinutes}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Max participants</label>
              <input name="maxParticipants" type="number" min={1} defaultValue={lt!.maxParticipants}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Price per session ({lt!.currency})</label>
              <input name="pricePerSession" type="number" min={0} step={0.01} defaultValue={Number(lt!.pricePerSession)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Status</label>
              <select name="isActive" defaultValue={String(lt!.isActive)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]">
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => router.back()}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1832A8] disabled:opacity-50">
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
    </PortalLayout>
  )
}
