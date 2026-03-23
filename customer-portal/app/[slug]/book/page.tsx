"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format, addDays, parseISO } from "date-fns"
import { ChevronLeft, ChevronRight, MapPin, Layers, Calendar, Clock, CheckCircle2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { fetchVenues, fetchResources, fetchAvailability, createBooking, type Venue, type Resource, type Slot } from "@/lib/api"
import { useOrg } from "@/lib/org-context"
import Link from "next/link"

type Step = "venue" | "resource" | "date" | "slots" | "confirm" | "done"

export default function BookPage() {
  const org = useOrg()
  const router = useRouter()
  const primary = org.primaryColour
  const tenantId = org.tenantId

  const [step, setStep] = useState<Step>("venue")
  const [user, setUser] = useState<any>(null)
  const [venues, setVenues] = useState<Venue[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [slots, setSlots] = useState<Slot[]>([])
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null)
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [bookingRef, setBookingRef] = useState("")

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (!data.user) { router.push(`/${org.slug}/login`); return }
      setUser(data.user)
      setLoading(true)
      fetchVenues(tenantId)
        .then(async (v) => {
          setVenues(v)
          if (v.length === 1) {
            setSelectedVenue(v[0])
            const r = await fetchResources(tenantId, v[0].id)
            setResources(r)
            setStep("resource")
          } else {
            setStep("venue")
          }
        })
        .catch(() => setError("Could not load venues"))
        .finally(() => setLoading(false))
    })
  }, [tenantId, org.slug, router])

  async function selectVenue(v: Venue) {
    setSelectedVenue(v)
    setLoading(true)
    try {
      const r = await fetchResources(tenantId, v.id)
      setResources(r)
      setStep("resource")
    } catch { setError("Could not load resources") }
    finally { setLoading(false) }
  }

  async function selectResource(r: Resource) {
    setSelectedResource(r)
    setStep("date")
  }

  async function loadSlots(date: Date) {
    if (!selectedVenue || !selectedResource) return
    setSelectedDate(date)
    setLoading(true)
    setError("")
    try {
      const s = await fetchAvailability(tenantId, selectedVenue.id, selectedResource.id, format(date, "yyyy-MM-dd"))
      setSlots(s)
      setStep("slots")
    } catch (e: any) { setError(e?.message ?? "Could not load availability") }
    finally { setLoading(false) }
  }

  async function confirmBooking() {
    if (!user) { router.push(`/${org.slug}/login`); return }
    if (!selectedVenue || !selectedResource || !selectedSlot) return
    setLoading(true)
    setError("")
    try {
      const booking = await createBooking(tenantId, {
        venueId: selectedVenue.id,
        resourceId: selectedResource.id,
        unitId: selectedSlot.unitId,
        startTime: selectedSlot.start,
        endTime: selectedSlot.end,
        customerId: user.id,
      })
      setBookingRef(booking.id)
      setStep("done")
    } catch (e: any) { setError(e.message ?? "Booking failed") }
    finally { setLoading(false) }
  }

  const btn = (label: string, onClick: () => void, disabled = false) => (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white shadow transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50"
      style={{ backgroundColor: primary }}
    >
      {label}
    </button>
  )

  const card = (content: React.ReactNode) => (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">{content}</div>
  )

  // ── Date picker (7-day strip) ──────────────────────────────────────────────
  const dateStrip = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i))

  return (
    <div className="min-h-screen bg-slate-50 pt-24">
      <div className="mx-auto max-w-3xl px-4 pb-20 md:px-8">

        {/* Progress bar */}
        {step !== "done" && (
          <div className="mb-8">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              {["venue", "resource", "date", "slots", "confirm"].map((s, i) => {
                const steps = ["venue", "resource", "date", "slots", "confirm"]
                const current = steps.indexOf(step)
                const idx = steps.indexOf(s)
                const labels: Record<string, string> = { venue: "Venue", resource: "Facility", date: "Date", slots: "Time", confirm: "Confirm" }
                return (
                  <div key={s} className="flex items-center gap-2">
                    {i > 0 && <div className={`h-px w-8 ${idx <= current ? "" : "bg-slate-200"}`} style={idx <= current ? { backgroundColor: primary } : {}} />}
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
                      style={idx <= current ? { backgroundColor: primary, color: "white" } : { backgroundColor: "#e2e8f0", color: "#94a3b8" }}
                    >
                      {i + 1}
                    </div>
                    <span className={idx === current ? "font-semibold text-slate-900" : ""}>{labels[s]}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* ── Step: Venue ── */}
        {step === "venue" && (
          <div>
            <h1 className="mb-6 text-2xl font-extrabold text-slate-900">Choose a venue</h1>
            {loading ? <Spinner color={primary} /> : (
              <div className="grid gap-4">
                {venues.map((v) => (
                  <button key={v.id} onClick={() => selectVenue(v)}
                    className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md text-left w-full">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: primary + "18" }}>
                      <MapPin size={22} style={{ color: primary }} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{v.name}</div>
                      {v.city && <div className="text-sm text-slate-500">{v.city}</div>}
                    </div>
                    <ChevronRight size={18} className="ml-auto text-slate-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Step: Resource ── */}
        {step === "resource" && (
          <div>
            <button onClick={() => setStep("venue")} className="mb-4 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
              <ChevronLeft size={15} /> Back
            </button>
            <h1 className="mb-6 text-2xl font-extrabold text-slate-900">Choose a facility</h1>
            {loading ? <Spinner color={primary} /> : (
              <div className="grid gap-4 sm:grid-cols-2">
                {resources.map((r) => (
                  <button key={r.id} onClick={() => selectResource(r)}
                    className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md text-left w-full">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: (r.colour || primary) + "20" }}>
                        <Layers size={18} style={{ color: r.colour || primary }} />
                      </div>
                      <div className="font-bold text-slate-900">{r.name}</div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {r.sport && <Pill>{r.sport}</Pill>}
                      {r.surface && <Pill>{r.surface}</Pill>}
                      {r.isIndoor !== null && <Pill>{r.isIndoor ? "Indoor" : "Outdoor"}</Pill>}
                    </div>
                    {r.description && <p className="text-xs text-slate-500 leading-relaxed">{r.description}</p>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Step: Date ── */}
        {step === "date" && (
          <div>
            <button onClick={() => setStep("resource")} className="mb-4 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
              <ChevronLeft size={15} /> Back
            </button>
            <h1 className="mb-6 text-2xl font-extrabold text-slate-900">Pick a date</h1>
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-2">
                {dateStrip.map((date) => {
                  const isToday = format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => loadSlots(date)}
                      className="flex shrink-0 flex-col items-center rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm transition hover:shadow-md"
                      style={{ minWidth: 68 }}
                    >
                      <span className="text-xs font-medium text-slate-500">{format(date, "EEE")}</span>
                      <span className="mt-1 text-xl font-extrabold text-slate-900">{format(date, "d")}</span>
                      <span className="text-xs text-slate-400">{format(date, "MMM")}</span>
                      {isToday && <span className="mt-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: primary }} />}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Step: Slots ── */}
        {step === "slots" && (
          <div>
            <button onClick={() => setStep("date")} className="mb-4 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
              <ChevronLeft size={15} /> Back
            </button>
            <h1 className="mb-1 text-2xl font-extrabold text-slate-900">Available times</h1>
            <p className="mb-6 text-sm text-slate-500">{format(selectedDate, "EEEE d MMMM yyyy")} · {selectedResource?.name}</p>
            {loading ? <Spinner color={primary} /> : (() => {
              if (slots.length === 0) {
                return <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-400">No slots on this date.</div>
              }
              // Group ALL slots by unit name, preserving first-seen order
              const unitOrder: string[] = []
              const byUnit: Record<string, typeof slots> = {}
              for (const s of slots) {
                if (!byUnit[s.unitName]) { byUnit[s.unitName] = []; unitOrder.push(s.unitName) }
                byUnit[s.unitName].push(s)
              }
              const availableCount = slots.filter(s => s.available).length
              if (availableCount === 0) {
                return <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-400">No available slots on this date.</div>
              }
              return (
                <div className="space-y-8">
                  {unitOrder.map((unitName) => {
                    const unitSlots = byUnit[unitName].sort((a, b) => a.start.localeCompare(b.start))
                    const unitAvailable = unitSlots.filter(s => s.available).length
                    const timeGroups = [
                      { label: "Morning", slots: unitSlots.filter(s => parseISO(s.start).getHours() < 12) },
                      { label: "Afternoon", slots: unitSlots.filter(s => { const h = parseISO(s.start).getHours(); return h >= 12 && h < 17 }) },
                      { label: "Evening", slots: unitSlots.filter(s => parseISO(s.start).getHours() >= 17) },
                    ].filter(g => g.slots.length > 0)
                    return (
                      <div key={unitName} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                        {/* Unit header */}
                        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3" style={{ backgroundColor: primary + "10" }}>
                          <span className="font-bold text-slate-900">{unitName}</span>
                          <span className="text-xs text-slate-400">{unitAvailable} of {unitSlots.length} available</span>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {timeGroups.map((group) => (
                            <div key={group.label} className="px-5 py-4">
                              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">{group.label}</p>
                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {group.slots.map((slot, i) => {
                                  const isSelected = selectedSlot?.start === slot.start && selectedSlot?.unitId === slot.unitId
                                  if (!slot.available) {
                                    return (
                                      <div
                                        key={i}
                                        className="relative flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold overflow-hidden cursor-not-allowed select-none"
                                        style={{ backgroundColor: "#f1f5f9", borderColor: "#e2e8f0", color: "#cbd5e1" }}
                                        title="Already booked"
                                      >
                                        <Clock size={13} className="shrink-0" />
                                        {format(parseISO(slot.start), "HH:mm")} – {format(parseISO(slot.end), "HH:mm")}
                                        {/* diagonal stripe overlay */}
                                        <div className="pointer-events-none absolute inset-0 opacity-[0.07]"
                                          style={{ backgroundImage: "repeating-linear-gradient(-45deg, #000 0, #000 1px, transparent 0, transparent 50%)", backgroundSize: "6px 6px" }} />
                                        <span className="absolute bottom-1 right-2 text-[9px] font-bold uppercase tracking-wide text-slate-400">Booked</span>
                                      </div>
                                    )
                                  }
                                  return (
                                    <button
                                      key={i}
                                      onClick={() => { setSelectedSlot(slot); setStep("confirm") }}
                                      className="flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition hover:-translate-y-0.5 hover:shadow-md"
                                      style={isSelected
                                        ? { backgroundColor: primary, borderColor: primary, color: "white" }
                                        : { backgroundColor: "#f8fafc", borderColor: "#e2e8f0", color: "#1e293b" }
                                      }
                                    >
                                      <Clock size={13} className="shrink-0 opacity-50" />
                                      {format(parseISO(slot.start), "HH:mm")} – {format(parseISO(slot.end), "HH:mm")}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        )}

        {/* ── Step: Confirm ── */}
        {step === "confirm" && selectedSlot && selectedResource && selectedVenue && (
          <div>
            <button onClick={() => setStep("slots")} className="mb-4 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
              <ChevronLeft size={15} /> Back
            </button>
            <h1 className="mb-6 text-2xl font-extrabold text-slate-900">Confirm your booking</h1>
            {card(
              <div className="space-y-4">
                <Row icon={<MapPin size={16} />} label="Venue" value={selectedVenue.name} />
                <Row icon={<Layers size={16} />} label="Facility" value={`${selectedResource.name} — ${selectedSlot.unitName}`} />
                <Row icon={<Calendar size={16} />} label="Date" value={format(selectedDate, "EEEE d MMMM yyyy")} />
                <Row icon={<Clock size={16} />} label="Time" value={`${format(parseISO(selectedSlot.start), "HH:mm")} – ${format(parseISO(selectedSlot.end), "HH:mm")}`} />
              </div>
            )}

            {!user && (
              <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                You need to sign in to complete this booking.{" "}
                <Link href={`/${org.slug}/login`} className="font-semibold underline">Sign in</Link>
              </div>
            )}

            {error && <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

            <div className="mt-6">
              {btn(loading ? "Booking…" : "Confirm booking", confirmBooking, loading || !user)}
            </div>
          </div>
        )}

        {/* ── Step: Done ── */}
        {step === "done" && (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full" style={{ backgroundColor: primary + "18" }}>
              <CheckCircle2 size={44} style={{ color: primary }} />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900">Booking confirmed!</h1>
            <p className="mt-3 text-slate-500">You're all set. See you on the court.</p>
            {selectedSlot && (
              <div className="mt-6 rounded-2xl border border-slate-100 bg-white px-8 py-5 shadow-sm text-sm text-slate-600">
                <div className="font-semibold text-slate-900">{selectedResource?.name}</div>
                <div className="mt-1">{format(selectedDate, "EEEE d MMMM yyyy")}</div>
                <div>{format(parseISO(selectedSlot.start), "HH:mm")} – {format(parseISO(selectedSlot.end), "HH:mm")}</div>
              </div>
            )}
            <div className="mt-8 flex gap-4">
              <Link
                href={`/${org.slug}/account`}
                className="rounded-xl px-6 py-3 text-sm font-bold text-white shadow transition hover:-translate-y-0.5"
                style={{ backgroundColor: primary }}
              >
                View my bookings
              </Link>
              <button
                onClick={() => { setStep("resource"); setSelectedSlot(null); setSelectedResource(null) }}
                className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Book again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Spinner({ color }: { color: string }) {
  return (
    <div className="flex justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[--primary]"
        style={{ borderTopColor: color }} />
    </div>
  )
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-600">
      {children}
    </span>
  )
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-slate-400">{icon}</div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
        <div className="mt-0.5 font-semibold text-slate-900">{value}</div>
      </div>
    </div>
  )
}
