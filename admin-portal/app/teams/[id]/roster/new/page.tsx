"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { Search, X, UserCircle2, UserPlus } from "lucide-react"
import { PortalLayout } from "@/components/portal-layout"

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

// Which person path has been chosen
type PersonMode = "searching" | "selected" | "new"

const inputClass =
  "mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]"
const labelClass = "block text-sm font-medium text-slate-700"

export default function NewRosterMemberPage() {
  const router = useRouter()
  const { id: teamId } = useParams<{ id: string }>()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Person search
  const [personMode, setPersonMode] = useState<PersonMode>("searching")
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [personSearch, setPersonSearch] = useState("")
  const [searchResults, setSearchResults] = useState<Person[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // New person fields (only used when personMode === "new")
  const [newPerson, setNewPerson] = useState({ firstName: "", lastName: "", email: "", phone: "" })
  const setNP = (f: string, v: string) => setNewPerson((p) => ({ ...p, [f]: v }))

  // Roster-specific fields
  const [roster, setRoster] = useState({
    position: "",
    shirtNumber: "",
    isGuest: false,
    isJunior: false,
    dateOfBirth: "",
    guardianName: "",
    guardianEmail: "",
    guardianPhone: "",
  })
  const setR = (f: string, v: string | boolean) => setRoster((r) => ({ ...r, [f]: v }))

  // Debounced person search
  useEffect(() => {
    if (personSearch.trim().length < 2) { setSearchResults([]); return }
    const t = setTimeout(() => {
      fetch(`/api/customers?search=${encodeURIComponent(personSearch)}&limit=8`)
        .then((r) => r.json())
        .then((r) => setSearchResults(r.data ?? []))
        .catch(() => setSearchResults([]))
    }, 250)
    return () => clearTimeout(t)
  }, [personSearch])

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [])

  function selectPerson(p: Person) {
    setSelectedPerson(p)
    setPersonMode("selected")
    setPersonSearch("")
    setShowDropdown(false)
  }

  function clearPerson() {
    setSelectedPerson(null)
    setPersonMode("searching")
    setPersonSearch("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      let personId: string | undefined
      let displayName: string

      if (personMode === "selected" && selectedPerson) {
        // Link to existing person
        personId = selectedPerson.id
        displayName = personName(selectedPerson)
      } else if (personMode === "new") {
        // Create person first
        if (!newPerson.firstName.trim() || !newPerson.lastName.trim()) {
          throw new Error("First name and last name are required")
        }
        const pRes = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: newPerson.firstName.trim(),
            lastName: newPerson.lastName.trim(),
            email: newPerson.email || undefined,
            phone: newPerson.phone || undefined,
          }),
        })
        if (!pRes.ok) {
          const err = await pRes.json().catch(() => ({}))
          throw new Error(err.message ?? "Failed to create person record")
        }
        const { data: created } = await pRes.json()
        personId = created.id
        displayName = `${newPerson.firstName.trim()} ${newPerson.lastName.trim()}`
      } else {
        // Guest — no person record, use the name from roster fields directly
        displayName = roster.position // we'll repurpose below — see guest section
        throw new Error("Please search for an existing person or choose 'Add as new person'")
      }

      const res = await fetch(`/api/teams/${teamId}/roster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          personId,
          email: personMode === "new" ? (newPerson.email || undefined) : undefined,
          phone: personMode === "new" ? (newPerson.phone || undefined) : undefined,
          position: roster.position || undefined,
          shirtNumber: roster.shirtNumber ? Number(roster.shirtNumber) : undefined,
          isGuest: roster.isGuest,
          isJunior: roster.isJunior,
          dateOfBirth: roster.dateOfBirth || undefined,
          guardianName: roster.guardianName || undefined,
          guardianEmail: roster.guardianEmail || undefined,
          guardianPhone: roster.guardianPhone || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? "Failed to add player")
      }
      router.push(`/teams/${teamId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add player")
    } finally {
      setSaving(false)
    }
  }

  return (
    <PortalLayout title="Add player" description="Add a player to this team's roster.">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Step 1 — Person */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-[0.12em] text-slate-400">
            Person
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            Search for someone already in the system, or add them as a new person. This keeps one record per human across the whole platform.
          </p>

          {personMode === "selected" && selectedPerson && (
            <div className="flex items-center justify-between rounded-xl border border-[#1857E0] bg-blue-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1857E0] text-sm font-bold text-white">
                  {personName(selectedPerson)[0]}
                </div>
                <div>
                  <p className="font-medium text-slate-900">{personName(selectedPerson)}</p>
                  {selectedPerson.email && (
                    <p className="text-xs text-slate-500">{selectedPerson.email}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={clearPerson}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {personMode === "searching" && (
            <>
              <div ref={searchRef} className="relative">
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <Search className="h-4 w-4 shrink-0 text-slate-400" />
                  <input
                    value={personSearch}
                    onChange={(e) => { setPersonSearch(e.target.value); setShowDropdown(true) }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Search by name or email…"
                    className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  />
                </div>

                {showDropdown && searchResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                    {searchResults.map((p) => (
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
                          <p className="truncate text-sm font-medium text-slate-900">{personName(p)}</p>
                          {p.email && <p className="truncate text-xs text-slate-400">{p.email}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {showDropdown && personSearch.trim().length >= 2 && searchResults.length === 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
                    <p className="flex items-center gap-2 text-sm text-slate-500">
                      <UserCircle2 className="h-4 w-4" />
                      No match for "{personSearch}"
                    </p>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setPersonMode("new")}
                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                <UserPlus className="h-4 w-4" />
                Add as new person instead
              </button>
            </>
          )}

          {personMode === "new" && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>First name *</label>
                  <input
                    required
                    value={newPerson.firstName}
                    onChange={(e) => setNP("firstName", e.target.value)}
                    placeholder="e.g. Jamie"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Last name *</label>
                  <input
                    required
                    value={newPerson.lastName}
                    onChange={(e) => setNP("lastName", e.target.value)}
                    placeholder="e.g. Smith"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input
                    type="email"
                    value={newPerson.email}
                    onChange={(e) => setNP("email", e.target.value)}
                    placeholder="jamie@example.com"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input
                    type="tel"
                    value={newPerson.phone}
                    onChange={(e) => setNP("phone", e.target.value)}
                    placeholder="07700 900000"
                    className={inputClass}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPersonMode("searching")}
                className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" /> Back to search
              </button>
            </div>
          )}
        </section>

        {/* Step 2 — Team role (shown once person is resolved) */}
        {(personMode === "selected" || personMode === "new") && (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.12em] text-slate-400">
                Team role
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Position</label>
                  <input
                    value={roster.position}
                    onChange={(e) => setR("position", e.target.value)}
                    placeholder="e.g. Goalkeeper, Midfielder"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Shirt number</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={roster.shirtNumber}
                    onChange={(e) => setR("shirtNumber", e.target.value)}
                    placeholder="e.g. 10"
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2 flex flex-wrap items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={roster.isJunior}
                      onChange={(e) => setR("isJunior", e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-[#1857E0] focus:ring-[#1857E0]"
                    />
                    <span className="text-sm font-medium text-slate-700">Junior player (under 18)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={roster.isGuest}
                      onChange={(e) => setR("isGuest", e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-[#1857E0] focus:ring-[#1857E0]"
                    />
                    <span className="text-sm font-medium text-slate-700">Guest / one-off player</span>
                  </label>
                </div>
              </div>
            </section>

            {/* Guardian section for juniors */}
            {roster.isJunior && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
                <h2 className="mb-1 text-sm font-semibold uppercase tracking-[0.12em] text-amber-700">
                  Guardian details
                </h2>
                <p className="mb-4 text-sm text-amber-600">
                  All match notifications for this player will be sent to their guardian.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Date of birth</label>
                    <input
                      type="date"
                      value={roster.dateOfBirth}
                      onChange={(e) => setR("dateOfBirth", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Guardian name</label>
                    <input
                      value={roster.guardianName}
                      onChange={(e) => setR("guardianName", e.target.value)}
                      placeholder="Parent / guardian full name"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Guardian email</label>
                    <input
                      type="email"
                      value={roster.guardianEmail}
                      onChange={(e) => setR("guardianEmail", e.target.value)}
                      placeholder="guardian@example.com"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Guardian phone</label>
                    <input
                      type="tel"
                      value={roster.guardianPhone}
                      onChange={(e) => setR("guardianPhone", e.target.value)}
                      placeholder="07700 900000"
                      className={inputClass}
                    />
                  </div>
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
                {saving ? "Adding…" : "Add player"}
              </button>
            </div>
          </>
        )}
      </form>
    </PortalLayout>
  )
}
