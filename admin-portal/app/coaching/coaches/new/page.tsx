"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Search, X, UserCircle2 } from "lucide-react"
import { PortalLayout } from "@/components/portal-layout"
type LessonType = {
  id: string
  name: string
  durationMinutes: number
  pricePerSession: string
  currency: string
  maxParticipants: number
  isActive: boolean
}

type Person = {
  id: string
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
}

function personName(p: Person) {
  return `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || "Unnamed"
}

const SPORTS = ["tennis", "padel", "squash", "badminton", "pickleball", "other"]

export default function NewCoachPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lessonTypes, setLessonTypes] = useState<LessonType[]>([])
  const [selectedLessonTypes, setSelectedLessonTypes] = useState<string[]>([])
  const [specialtiesInput, setSpecialtiesInput] = useState("")

  // Person search state
  const [people, setPeople] = useState<Person[]>([])
  const [personSearch, setPersonSearch] = useState("")
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState({ displayName: "", bio: "", sport: "" })
  const set = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }))

  // Load people + lesson types
  useEffect(() => {
    fetch("/api/customers?limit=250")
      .then((r) => r.json())
      .then((r) => setPeople(r.data ?? []))
      .catch(() => {})

    fetch("/api/coaching/lesson-types?limit=100&activeOnly=true")
      .then((r) => r.json())
      .then((r) => setLessonTypes(r.data ?? []))
      .catch(() => {})
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const filteredPeople = personSearch.trim().length >= 1
    ? people.filter((p) => {
        const q = personSearch.toLowerCase()
        return (
          personName(p).toLowerCase().includes(q) ||
          (p.email ?? "").toLowerCase().includes(q)
        )
      }).slice(0, 8)
    : []

  function selectPerson(p: Person) {
    setSelectedPerson(p)
    setPersonSearch("")
    setShowDropdown(false)
    // Pre-fill display name if not already set
    if (!form.displayName) {
      set("displayName", personName(p))
    }
  }

  function clearPerson() {
    setSelectedPerson(null)
    setPersonSearch("")
  }

  function toggleLessonType(id: string) {
    setSelectedLessonTypes((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const specialties = specialtiesInput.split(",").map((s) => s.trim()).filter(Boolean)
      const res = await fetch("/api/coaching/coaches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: form.displayName,
          bio: form.bio || undefined,
          specialties,
          lessonTypeIds: selectedLessonTypes,
          ...(selectedPerson ? { customerId: selectedPerson.id } : {}),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? "Failed to create coach")
      }
      router.push("/coaching/coaches")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create coach")
    } finally {
      setSaving(false)
    }
  }

  return (
    <PortalLayout title="Add Coach" description="Register a new coach on the platform.">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Core details */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.12em] text-slate-400">Coach details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Display name *</label>
              <input
                required
                value={form.displayName}
                onChange={(e) => set("displayName", e.target.value)}
                placeholder="e.g. Sarah Jones"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Sport focus</label>
              <select
                value={form.sport}
                onChange={(e) => set("sport", e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]"
              >
                <option value="">— Select (optional) —</option>
                {SPORTS.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Bio</label>
              <textarea
                value={form.bio}
                onChange={(e) => set("bio", e.target.value)}
                rows={3}
                placeholder="Short description shown on the customer portal."
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Specialties</label>
              <input
                value={specialtiesInput}
                onChange={(e) => setSpecialtiesInput(e.target.value)}
                placeholder="tennis, junior coaching, fitness (comma-separated)"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]"
              />
            </div>
          </div>
        </section>

        {/* Person link */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-[0.12em] text-slate-400">Link to a person (optional)</h2>
          <p className="mb-4 text-sm text-slate-500">
            If this coach is already in your People records, link them so their bookings and membership stay connected.
          </p>

          {selectedPerson ? (
            <div className="flex items-center justify-between rounded-xl border border-[#1857E0] bg-blue-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1857E0] text-sm font-bold text-white">
                  {personName(selectedPerson)[0]}
                </div>
                <div>
                  <div className="font-medium text-slate-900">{personName(selectedPerson)}</div>
                  {selectedPerson.email && (
                    <div className="text-xs text-slate-500">{selectedPerson.email}</div>
                  )}
                </div>
              </div>
              <button type="button" onClick={clearPerson} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div ref={searchRef} className="relative">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <Search className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                  value={personSearch}
                  onChange={(e) => { setPersonSearch(e.target.value); setShowDropdown(true) }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Search people by name or email…"
                  className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>

              {showDropdown && filteredPeople.length > 0 && (
                <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                  {filteredPeople.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => selectPerson(p)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-blue-50"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
                        {personName(p)[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-900">{personName(p)}</div>
                        {p.email && <div className="truncate text-xs text-slate-400">{p.email}</div>}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {showDropdown && personSearch.trim().length >= 1 && filteredPeople.length === 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <UserCircle2 className="h-4 w-4" />
                    No people found matching "{personSearch}"
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Lesson types */}
        {lessonTypes.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-[0.12em] text-slate-400">Lesson types</h2>
            <p className="mb-4 text-sm text-slate-500">Which types of lessons does this coach deliver?</p>
            <div className="flex flex-wrap gap-2">
              {lessonTypes.map((lt) => (
                <button
                  key={lt.id}
                  type="button"
                  onClick={() => toggleLessonType(lt.id)}
                  className={[
                    "rounded-full border px-3 py-1.5 text-sm font-medium transition",
                    selectedLessonTypes.includes(lt.id)
                      ? "border-[#1857E0] bg-[#1857E0] text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-[#1857E0]",
                  ].join(" ")}
                >
                  {lt.name}
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[#1857E0] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1832A8] disabled:opacity-50"
          >
            {saving ? "Adding…" : "Add coach"}
          </button>
        </div>
      </form>
    </PortalLayout>
  )
}
