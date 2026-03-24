"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { PortalLayout } from "@/components/portal-layout"

type Coach = {
  displayName: string
  isActive: boolean
  bio?: string | null
  specialties: string[]
  lessonTypes?: { lessonType: { id: string } }[]
}

type LessonType = {
  id: string
  name: string
}

type AvailabilityWindow = {
  dayOfWeek: number
  startTime: string
  endTime: string
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export default function CoachDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [coach, setCoach] = useState<Coach | null>(null)
  const [lessonTypes, setLessonTypes] = useState<LessonType[]>([])
  const [selectedLessonTypes, setSelectedLessonTypes] = useState<string[]>([])
  const [specialtiesInput, setSpecialtiesInput] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Availability state: one entry per day-of-week that is enabled
  const [availability, setAvailability] = useState<Record<number, { enabled: boolean; startTime: string; endTime: string }>>(
    () => Object.fromEntries(DAYS.map((_, i) => [i, { enabled: false, startTime: "09:00", endTime: "17:00" }]))
  )
  const [savingAvailability, setSavingAvailability] = useState(false)
  const [availabilityMsg, setAvailabilityMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    Promise.all([
      fetch(`/api/coaching/coaches/${id}`).then((r) => r.json()).then((r) => r.data as Coach),
      fetch(`/api/coaching/lesson-types?limit=100`).then((r) => r.json()),
      fetch(`/api/coaching/coaches/${id}/availability`).then((r) => r.json()),
    ]).then(([c, lts, avail]) => {
      setCoach(c)
      setLessonTypes(lts.data ?? [])
      setSelectedLessonTypes(c.lessonTypes?.map((clt: { lessonType: { id: string } }) => clt.lessonType.id) ?? [])
      setSpecialtiesInput(c.specialties.join(", "))
      // Map existing windows onto per-day state
      const windows: AvailabilityWindow[] = avail.data ?? []
      if (windows.length > 0) {
        setAvailability((prev) => {
          const next = { ...prev }
          for (const w of windows) {
            next[w.dayOfWeek] = { enabled: true, startTime: w.startTime, endTime: w.endTime }
          }
          return next
        })
      }
    }).catch((e: Error) => setError(e.message))
  }, [id])

  function toggleLessonType(ltId: string) {
    setSelectedLessonTypes((prev) =>
      prev.includes(ltId) ? prev.filter((x) => x !== ltId) : [...prev, ltId],
    )
  }

  function setAvailDay(day: number, field: "enabled" | "startTime" | "endTime", value: string | boolean) {
    setAvailability((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } }))
  }

  async function saveAvailability() {
    setSavingAvailability(true)
    setAvailabilityMsg(null)
    const windows = Object.entries(availability)
      .filter(([, v]) => v.enabled)
      .map(([day, v]) => ({ dayOfWeek: Number(day), startTime: v.startTime, endTime: v.endTime }))
    try {
      const res = await fetch(`/api/coaching/coaches/${id}/availability`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ windows }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? "Failed to save availability")
      }
      setAvailabilityMsg({ ok: true, text: "Availability saved." })
    } catch (err) {
      setAvailabilityMsg({ ok: false, text: err instanceof Error ? err.message : "Failed to save availability" })
    } finally {
      setSavingAvailability(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!coach) return
    setSaving(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    try {
      const specialties = specialtiesInput.split(",").map((s) => s.trim()).filter(Boolean)
      const res = await fetch(`/api/coaching/coaches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: fd.get("displayName") as string,
          bio: (fd.get("bio") as string) || undefined,
          specialties,
          isActive: fd.get("isActive") === "true",
          lessonTypeIds: selectedLessonTypes,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? "Failed to update coach")
      }
      router.push("/coaching/coaches")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update coach")
    } finally {
      setSaving(false)
    }
  }

  if (!coach && !error) {
    return <PortalLayout title="Coach"><p className="text-sm text-slate-500">Loading…</p></PortalLayout>
  }
  if (error && !coach) {
    return <PortalLayout title="Coach"><p className="text-sm text-red-500">{error}</p></PortalLayout>
  }

  return (
    <PortalLayout title={coach!.displayName} description="Edit coach profile and lesson type assignments.">
      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Display name *</label>
              <input name="displayName" required defaultValue={coach!.displayName}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Status</label>
              <select name="isActive" defaultValue={String(coach!.isActive)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]">
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Bio</label>
              <textarea name="bio" rows={3} defaultValue={coach!.bio ?? ""}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]" />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Specialties (comma-separated)</label>
              <input
                value={specialtiesInput}
                onChange={(e) => setSpecialtiesInput(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]"
              />
            </div>

            {lessonTypes.length > 0 && (
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Lesson types this coach delivers</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {lessonTypes.map((lt) => (
                    <button
                      key={lt.id}
                      type="button"
                      onClick={() => toggleLessonType(lt.id)}
                      className={[
                        "rounded-full border px-3 py-1 text-xs font-medium transition",
                        selectedLessonTypes.includes(lt.id)
                          ? "border-[#1857E0] bg-[#1857E0] text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-[#1857E0]",
                      ].join(" ")}
                    >
                      {lt.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
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

        {/* Availability windows */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-[0.12em] text-slate-400">Weekly availability</h2>
          <p className="mb-5 text-sm text-slate-500">Set which days and hours this coach is available for bookings.</p>

          {availabilityMsg && (
            <div className={`mb-4 rounded-xl px-4 py-3 text-sm ${availabilityMsg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {availabilityMsg.text}
            </div>
          )}

          <div className="space-y-3">
            {DAYS.map((label, day) => {
              const av = availability[day]
              return (
                <div key={day} className="flex items-center gap-4">
                  <label className="flex w-32 shrink-0 cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={av.enabled}
                      onChange={(e) => setAvailDay(day, "enabled", e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-[#1857E0] focus:ring-[#1857E0]"
                    />
                    <span className={`text-sm font-medium ${av.enabled ? "text-slate-900" : "text-slate-400"}`}>{label}</span>
                  </label>
                  {av.enabled ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={av.startTime}
                        onChange={(e) => setAvailDay(day, "startTime", e.target.value)}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]"
                      />
                      <span className="text-sm text-slate-400">to</span>
                      <input
                        type="time"
                        value={av.endTime}
                        onChange={(e) => setAvailDay(day, "endTime", e.target.value)}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]"
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-slate-300">Unavailable</span>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={saveAvailability}
              disabled={savingAvailability}
              className="rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1832A8] disabled:opacity-50"
            >
              {savingAvailability ? "Saving…" : "Save availability"}
            </button>
          </div>
        </section>
    </PortalLayout>
  )
}
