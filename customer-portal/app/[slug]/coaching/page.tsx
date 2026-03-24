"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format, addDays } from "date-fns"
import { GraduationCap, ChevronLeft, Clock, CheckCircle2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { fetchCoaches, type CoachPublic } from "@/lib/api"
import { useOrg } from "@/lib/org-context"
import Link from "next/link"

type Step = "coaches" | "lesson-type" | "date" | "slots" | "confirm" | "done"

type LessonTypeItem = {
  id: string
  name: string
  durationMinutes: number
  pricePerSession: string
  currency: string
  maxParticipants: number
  sport?: string | null
}

type EnrichedSlot = {
  startsAt: string
  endsAt: string
  durationMinutes: number
  unitId: string | null
  unitName: string | null
  resourceId: string | null
  venueId?: string | null
}

function formatPrice(price: string, currency: string) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(Number(price))
}

export default function CoachingPage() {
  const org = useOrg()
  const router = useRouter()
  const primary = org.primaryColour
  const tenantId = org.tenantId

  const [step, setStep] = useState<Step>("coaches")
  const [user, setUser] = useState<any>(null)
  const [coaches, setCoaches] = useState<CoachPublic[]>([])
  const [slots, setSlots] = useState<EnrichedSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [selectedCoach, setSelectedCoach] = useState<CoachPublic | null>(null)
  const [selectedLessonType, setSelectedLessonType] = useState<LessonTypeItem | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedSlot, setSelectedSlot] = useState<EnrichedSlot | null>(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (!data.user) { router.push(`/${org.slug}/login`); return }
      setUser(data.user)
      setLoading(true)
      fetchCoaches(tenantId).then((c) => { setCoaches(c); setLoading(false) }).catch(() => setLoading(false))
    })
  }, [tenantId, org.slug, router])

  async function loadSlots(coach: CoachPublic, lt: LessonTypeItem, date: Date) {
    setLoading(true)
    const dateStr = format(date, "yyyy-MM-dd")
    const qs = new URLSearchParams({
      coachId: coach.id,
      date: dateStr,
      durationMinutes: String(lt.durationMinutes),
      ...(lt.sport ? { sport: lt.sport } : {}),
    })
    try {
      const res = await fetch(`/api/coaching/slots?${qs}`)
      const { data } = await res.json()
      setSlots(data ?? [])
    } catch {
      setSlots([])
    }
    setLoading(false)
  }

  function selectCoach(coach: CoachPublic) {
    setSelectedCoach(coach)
    const lessonTypes = coach.lessonTypes ?? []
    if (lessonTypes.length === 1) {
      setSelectedLessonType(lessonTypes[0].lessonType)
      setStep("date")
    } else {
      setStep("lesson-type")
    }
  }

  function selectLessonType(lt: LessonTypeItem) {
    setSelectedLessonType(lt)
    setStep("date")
  }

  async function selectDate(date: Date) {
    setSelectedDate(date)
    await loadSlots(selectedCoach!, selectedLessonType!, date)
    setStep("slots")
  }

  function selectSlot(slot: EnrichedSlot) {
    setSelectedSlot(slot)
    setBookingError(null)
    setStep("confirm")
  }

  async function handleConfirm() {
    if (!selectedSlot || !selectedCoach || !selectedLessonType || !user) return
    setConfirming(true)
    setBookingError(null)
    try {
      const res = await fetch("/api/coaching/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookableUnitId: selectedSlot.unitId,
          venueId: selectedSlot.venueId,
          resourceId: selectedSlot.resourceId,
          startsAt: selectedSlot.startsAt,
          endsAt: selectedSlot.endsAt,
          customerId: user.id,
          coachId: selectedCoach.id,
          lessonTypeId: selectedLessonType.id,
          bookingSource: "customer-portal",
          price: Number(selectedLessonType.pricePerSession),
          currency: selectedLessonType.currency,
          status: "pending",
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? "Failed to create booking")
      }
      setStep("done")
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Failed to create booking")
    } finally {
      setConfirming(false)
    }
  }

  const btnStyle = { backgroundColor: primary }

  return (
    <div className="min-h-screen bg-white pt-20">
      <div className="border-b border-slate-100 py-12" style={{ backgroundColor: primary + "08" }}>
        <div className="mx-auto max-w-4xl px-4 md:px-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Coaching</h1>
          <p className="mt-2 text-slate-500">Book a lesson with one of our coaches at {org.name}</p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-12 md:px-8">
        {/* Step: choose a coach */}
        {step === "coaches" && (
          <div>
            <h2 className="mb-6 text-xl font-bold text-slate-900">Choose a coach</h2>
            {loading && <p className="text-sm text-slate-400">Loading coaches…</p>}
            {!loading && coaches.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-20 text-center">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl" style={{ backgroundColor: primary + "18" }}>
                  <GraduationCap size={28} style={{ color: primary }} />
                </div>
                <p className="font-medium text-slate-700">No coaches available yet</p>
                <p className="text-sm text-slate-400">Check back soon — we're setting up our coaching programme.</p>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {coaches.map((coach) => (
                <button
                  key={coach.id}
                  onClick={() => selectCoach(coach)}
                  className="group rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-transparent hover:shadow-md"
                  style={{ ['--hover-border' as any]: primary }}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white"
                      style={{ backgroundColor: primary }}>
                      {coach.displayName[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900">{coach.displayName}</div>
                      {coach.bio && <div className="mt-0.5 truncate text-sm text-slate-500">{coach.bio}</div>}
                    </div>
                  </div>
                  {coach.specialties.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1">
                      {coach.specialties.map((s) => (
                        <span key={s} className="rounded-full px-2 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: primary + "cc" }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                  {(coach.lessonTypes?.length ?? 0) > 0 && (
                    <div className="mt-3 text-xs text-slate-400">
                      {coach.lessonTypes!.length} lesson type{coach.lessonTypes!.length !== 1 ? "s" : ""}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: choose lesson type */}
        {step === "lesson-type" && selectedCoach && (
          <div>
            <button onClick={() => setStep("coaches")} className="mb-6 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
              <ChevronLeft className="h-4 w-4" /> Back to coaches
            </button>
            <h2 className="mb-6 text-xl font-bold text-slate-900">Choose a lesson type with {selectedCoach.displayName}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {(selectedCoach.lessonTypes ?? []).map(({ lessonType: lt }: { lessonType: LessonTypeItem }) => (
                <button
                  key={lt.id}
                  onClick={() => selectLessonType(lt)}
                  className="rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:shadow-md"
                >
                  <div className="font-semibold text-slate-900">{lt.name}</div>
                  <div className="mt-2 flex gap-3 text-sm text-slate-500">
                    <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{lt.durationMinutes} min</span>
                    <span>{formatPrice(lt.pricePerSession, lt.currency)}</span>
                  </div>
                  {lt.maxParticipants > 1 && (
                    <div className="mt-1 text-xs text-slate-400">Up to {lt.maxParticipants} participants</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: choose date */}
        {step === "date" && selectedCoach && (
          <div>
            <button onClick={() => setStep(selectedCoach.lessonTypes && selectedCoach.lessonTypes.length > 1 ? "lesson-type" : "coaches")}
              className="mb-6 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            <h2 className="mb-2 text-xl font-bold text-slate-900">Choose a date</h2>
            <p className="mb-6 text-sm text-slate-500">
              {selectedLessonType?.name} with {selectedCoach.displayName} · {selectedLessonType?.durationMinutes} min
            </p>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 14 }).map((_, i) => {
                const d = addDays(new Date(), i)
                return (
                  <button
                    key={i}
                    onClick={() => selectDate(d)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium transition hover:shadow-md"
                    style={{ borderColor: format(d, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd") ? primary : undefined }}
                  >
                    <div className="text-xs text-slate-400">{format(d, "EEE")}</div>
                    <div className="font-semibold text-slate-900">{format(d, "d MMM")}</div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step: choose time slot */}
        {step === "slots" && (
          <div>
            <button onClick={() => setStep("date")} className="mb-6 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
              <ChevronLeft className="h-4 w-4" /> Back to dates
            </button>
            <h2 className="mb-2 text-xl font-bold text-slate-900">Available times</h2>
            <p className="mb-6 text-sm text-slate-500">{format(selectedDate, "EEEE d MMMM yyyy")}</p>
            {loading && <p className="text-sm text-slate-400">Checking availability…</p>}
            {!loading && slots.length === 0 && (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
                No available slots on this date. Try another day.
              </div>
            )}
            <div className="grid gap-2 sm:grid-cols-3">
              {slots.map((slot) => (
                <button
                  key={slot.startsAt}
                  onClick={() => selectSlot(slot)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium transition hover:shadow-md"
                >
                  {format(new Date(slot.startsAt), "HH:mm")} – {format(new Date(slot.endsAt), "HH:mm")}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: confirm */}
        {step === "confirm" && selectedCoach && selectedSlot && selectedLessonType && (
          <div className="max-w-md">
            <button onClick={() => setStep("slots")} className="mb-6 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
              <ChevronLeft className="h-4 w-4" /> Back to times
            </button>
            <h2 className="mb-6 text-xl font-bold text-slate-900">Confirm your booking</h2>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Coach</dt>
                  <dd className="font-medium text-slate-900">{selectedCoach.displayName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Lesson</dt>
                  <dd className="font-medium text-slate-900">{selectedLessonType.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Date</dt>
                  <dd className="font-medium text-slate-900">{format(new Date(selectedSlot.startsAt), "EEEE d MMMM yyyy")}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Time</dt>
                  <dd className="font-medium text-slate-900">
                    {format(new Date(selectedSlot.startsAt), "HH:mm")} – {format(new Date(selectedSlot.endsAt), "HH:mm")}
                  </dd>
                </div>
                {selectedSlot.unitName && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Court / pitch</dt>
                    <dd className="font-medium text-slate-900">{selectedSlot.unitName}</dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-100 pt-3">
                  <dt className="font-semibold text-slate-900">Price</dt>
                  <dd className="font-semibold text-slate-900">
                    {formatPrice(selectedLessonType.pricePerSession, selectedLessonType.currency)}
                  </dd>
                </div>
              </dl>
            </div>
            {bookingError && (
              <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{bookingError}</div>
            )}
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="mt-6 w-full rounded-xl py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
              style={btnStyle}
            >
              {confirming ? "Confirming…" : "Confirm booking"}
            </button>
          </div>
        )}

        {/* Step: done */}
        {step === "done" && (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <CheckCircle2 className="h-16 w-16" style={{ color: primary }} />
            <h2 className="text-2xl font-bold text-slate-900">Booking confirmed!</h2>
            <p className="text-slate-500">
              Your lesson with {selectedCoach?.displayName} has been requested. You'll hear from the club shortly.
            </p>
            <Link
              href={`/${org.slug}`}
              className="mt-4 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              style={btnStyle}
            >
              Back to home
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
