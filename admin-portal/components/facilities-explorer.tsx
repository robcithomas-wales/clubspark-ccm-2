"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ChevronDown,
  ChevronRight,
  Building2,
  MapPinned,
  Grid2x2,
  Layers3,
  Plus,
  Eye,
} from "lucide-react"

type Venue = {
  id: string
  tenantId?: string | null
  name: string
  timezone?: string | null
  city?: string | null
  country?: string | null
}

type Resource = {
  id: string
  tenantId?: string | null
  venueId: string
  name: string
  resourceType?: string | null
  sport?: string | null
  isActive?: boolean | null
}

type BookableUnit = {
  id: string
  tenantId?: string | null
  venueId?: string | null
  resourceId?: string | null
  parentUnitId?: string | null
  name: string
  unitType?: string | null
  sortOrder?: number | null
  capacity?: number | null
  isActive?: boolean | null
}

type FacilitiesExplorerProps = {
  venues: Venue[]
  resources: Resource[]
  units: BookableUnit[]
}

function Badge({
  children,
  tone = "slate",
}: {
  children: React.ReactNode
  tone?: "slate" | "emerald" | "sky" | "violet" | "amber" | "rose"
}) {
  const tones: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    sky: "bg-sky-50 text-sky-700 ring-sky-200",
    violet: "bg-violet-50 text-violet-700 ring-violet-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    rose: "bg-rose-50 text-rose-700 ring-rose-200",
  }

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

function ActionButton({
  children,
  onClick,
  tone = "light",
}: {
  children: React.ReactNode
  onClick?: () => void
  tone?: "light" | "dark"
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        tone === "dark"
          ? "inline-flex h-9 items-center justify-center rounded-xl bg-[#1857E0] px-3 text-sm font-medium text-white transition hover:bg-[#1832A8]"
          : "inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      }
    >
      {children}
    </button>
  )
}

function getUnitTone(unitType?: string | null) {
  switch ((unitType || "").toLowerCase()) {
    case "full":
      return "violet"
    case "half":
      return "sky"
    case "quarter":
      return "emerald"
    default:
      return "slate"
  }
}

function getUnitTypeLabel(unitType?: string | null) {
  if (!unitType) return "Unknown"
  return unitType.charAt(0).toUpperCase() + unitType.slice(1)
}

function getResourceLabel(resource: Resource) {
  const type = resource.resourceType || "resource"
  const sport = resource.sport || "general"
  return `${type} • ${sport}`
}

function groupFacilities(
  venues: Venue[],
  resources: Resource[],
  units: BookableUnit[]
) {
  return venues.map((venue) => {
    const venueResources = resources
      .filter((resource) => resource.venueId === venue.id)
      .map((resource) => {
        const resourceUnits = units
          .filter((unit) => unit.resourceId === resource.id)
          .sort((a, b) => {
            const sortA = a.sortOrder ?? 9999
            const sortB = b.sortOrder ?? 9999
            return sortA - sortB
          })

        return {
          ...resource,
          units: resourceUnits,
        }
      })

    return {
      ...venue,
      resources: venueResources,
    }
  })
}

export function FacilitiesExplorer({
  venues,
  resources,
  units,
}: FacilitiesExplorerProps) {
  const router = useRouter()

  const [search, setSearch] = React.useState("")
  const [openVenues, setOpenVenues] = React.useState<Record<string, boolean>>({})
  const [openResources, setOpenResources] = React.useState<Record<string, boolean>>({})

    
  const facilities = React.useMemo(
    () => groupFacilities(venues, resources, units),
    [venues, resources, units]
  )

  React.useEffect(() => {
  if (!search.trim()) {
    setOpenVenues({})
    setOpenResources({})
    return
  }

  const venueState: Record<string, boolean> = {}
  const resourceState: Record<string, boolean> = {}

  facilities.forEach((venue) => {
    venue.resources.forEach((resource) => {
      const venueMatch =
        venue.name.toLowerCase().includes(search.toLowerCase())

      const resourceMatch =
        resource.name.toLowerCase().includes(search.toLowerCase()) ||
        (resource.resourceType || "")
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        (resource.sport || "")
          .toLowerCase()
          .includes(search.toLowerCase())

      const unitMatch = resource.units.some((unit) =>
        unit.name.toLowerCase().includes(search.toLowerCase())
      )

      if (venueMatch || resourceMatch || unitMatch) {
        venueState[venue.id] = true
        resourceState[resource.id] = true
      }
    })
  })

  setOpenVenues(venueState)
  setOpenResources(resourceState)
}, [search, facilities])

  const searchTerm = search.trim().toLowerCase()

  const filteredFacilities = React.useMemo(() => {
    if (!searchTerm) return facilities

    return facilities
      .map((venue) => {
        const venueMatches =
          venue.name.toLowerCase().includes(searchTerm) ||
          (venue.city || "").toLowerCase().includes(searchTerm) ||
          (venue.country || "").toLowerCase().includes(searchTerm)

        const filteredResources = venue.resources
          .map((resource) => {
            const resourceMatches =
              resource.name.toLowerCase().includes(searchTerm) ||
              (resource.resourceType || "").toLowerCase().includes(searchTerm) ||
              (resource.sport || "").toLowerCase().includes(searchTerm)

            const filteredUnits = resource.units.filter((unit) => {
              return (
                unit.name.toLowerCase().includes(searchTerm) ||
                (unit.unitType || "").toLowerCase().includes(searchTerm)
              )
            })

            if (resourceMatches || filteredUnits.length > 0) {
              return {
                ...resource,
                units: resourceMatches ? resource.units : filteredUnits,
              }
            }

            return null
          })
          .filter(Boolean) as Array<Resource & { units: BookableUnit[] }>

        if (venueMatches || filteredResources.length > 0) {
          return {
            ...venue,
            resources: venueMatches ? venue.resources : filteredResources,
          }
        }

        return null
      })
      .filter(Boolean)
  }, [facilities, searchTerm])

  function toggleVenue(id: string) {
    setOpenVenues((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  function toggleResource(id: string) {
    setOpenResources((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  function handleViewVenue(id: string) {
    router.push(`/venues/${id}`)
  }

  function handleAddVenue() {
    router.push("/venues/new")
  }

  function handleViewResource(id: string) {
    router.push(`/resources/${id}`)
  }

  function handleAddResource(venueId: string) {
    router.push(`/resources/new?venueId=${encodeURIComponent(venueId)}`)
  }

  function handleViewUnit(id: string) {
    router.push(`/bookable-units/${id}`)
  }

  function handleAddUnit(resourceId: string, venueId?: string | null) {
    const search = new URLSearchParams({
      resourceId,
      ...(venueId ? { venueId } : {}),
    })

    router.push(`/bookable-units/new?${search.toString()}`)
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Facilities explorer
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              View venues, resources and bookable units in one place.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-full md:w-80">
              <label
                htmlFor="facility-search"
                className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"
              >
                Search
              </label>
              <input
                id="facility-search"
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search venues, resources or units"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none"
              />
            </div>

            <div className="pt-7">
              <ActionButton tone="dark" onClick={handleAddVenue}>
                <Plus className="mr-2 h-4 w-4" />
                Add venue
              </ActionButton>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-6">
        {filteredFacilities.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            No facilities matched your search.
          </div>
        ) : (
          filteredFacilities.map((venue: any) => {
            const isVenueOpen = openVenues[venue.id] ?? false
            const resourceCount = venue.resources.length
            const unitCount = venue.resources.reduce(
              (count: number, resource: any) => count + resource.units.length,
              0
            )

            return (
              <div
                key={venue.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
              >
                <div className="flex items-center justify-between gap-4 bg-slate-50 px-5 py-4">
                  <button
                    type="button"
                    onClick={() => toggleVenue(venue.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1857E0] text-white">
                      <Building2 className="h-5 w-5" />
                    </span>

                    <div className="min-w-0">
                      <div className="text-base font-semibold text-slate-900">
                        {venue.name}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <MapPinned className="h-4 w-4" />
                          {venue.city || "Unknown city"}
                          {venue.country ? `, ${venue.country}` : ""}
                        </span>
                        {venue.timezone ? (
                          <Badge tone="slate">{venue.timezone}</Badge>
                        ) : null}
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-2">
                    <Badge tone="sky">{resourceCount} resources</Badge>
                    <Badge tone="emerald">{unitCount} units</Badge>

                    <ActionButton onClick={() => handleViewVenue(venue.id)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </ActionButton>

                    <ActionButton onClick={() => handleAddResource(venue.id)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add resource
                    </ActionButton>

                    <button
                      type="button"
                      onClick={() => toggleVenue(venue.id)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                    >
                      {isVenueOpen ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {isVenueOpen ? (
                  <div className="space-y-4 p-5">
                    {venue.resources.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                        No resources configured for this venue.
                      </div>
                    ) : (
                      venue.resources.map((resource: any) => {
                        const isResourceOpen = openResources[resource.id] ?? false

                        return (
                          <div
                            key={resource.id}
                            className="overflow-hidden rounded-2xl border border-slate-200"
                          >
                            <div className="flex items-center justify-between gap-4 bg-white px-4 py-4">
                              <button
                                type="button"
                                onClick={() => toggleResource(resource.id)}
                                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                              >
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                                  <Grid2x2 className="h-4 w-4" />
                                </span>

                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-slate-900">
                                    {resource.name}
                                  </div>
                                  <div className="mt-1 flex flex-wrap items-center gap-2">
                                    <Badge tone="sky">{getResourceLabel(resource)}</Badge>
                                    <Badge tone={resource.isActive ? "emerald" : "rose"}>
                                      {resource.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                    <Badge tone="slate">
                                      {resource.units.length} units
                                    </Badge>
                                  </div>
                                </div>
                              </button>

                              <div className="flex items-center gap-2">
                                <ActionButton onClick={() => handleViewResource(resource.id)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View
                                </ActionButton>

                                <ActionButton
                                  onClick={() =>
                                    handleAddUnit(resource.id, resource.venueId)
                                  }
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Add unit
                                </ActionButton>

                                <button
                                  type="button"
                                  onClick={() => toggleResource(resource.id)}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                                >
                                  {isResourceOpen ? (
                                    <ChevronDown className="h-5 w-5" />
                                  ) : (
                                    <ChevronRight className="h-5 w-5" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {isResourceOpen ? (
                              <div className="border-t border-slate-200 bg-slate-50 px-4 py-4">
                                {resource.units.length === 0 ? (
                                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
                                    No bookable units configured for this resource.
                                  </div>
                                ) : (
                                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                    {resource.units.map((unit: BookableUnit) => (
                                      <div
                                        key={unit.id}
                                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                                      >
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                                                <Layers3 className="h-4 w-4" />
                                              </span>
                                              <div className="min-w-0">
                                                <div className="truncate text-sm font-semibold text-slate-900">
                                                  {unit.name}
                                                </div>
                                              </div>
                                            </div>
                                          </div>

                                          <Badge tone={unit.isActive ? "emerald" : "rose"}>
                                            {unit.isActive ? "Active" : "Inactive"}
                                          </Badge>
                                        </div>

                                        <div className="mt-4 flex flex-wrap gap-2">
                                          <Badge tone={getUnitTone(unit.unitType)}>
                                            {getUnitTypeLabel(unit.unitType)}
                                          </Badge>
                                          <Badge tone="slate">
                                            Capacity {unit.capacity ?? "n/a"}
                                          </Badge>
                                          {typeof unit.sortOrder === "number" ? (
                                            <Badge tone="slate">
                                              Sort {unit.sortOrder}
                                            </Badge>
                                          ) : null}
                                        </div>

                                        <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                                          <div className="truncate">Unit id: {unit.id}</div>
                                          {unit.parentUnitId ? (
                                            <div className="mt-1 truncate">
                                              Parent: {unit.parentUnitId}
                                            </div>
                                          ) : null}
                                        </div>

                                        <div className="mt-4 flex gap-2">
                                          <ActionButton onClick={() => handleViewUnit(unit.id)}>
                                            <Eye className="mr-2 h-4 w-4" />
                                            View
                                          </ActionButton>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : null}
                          </div>
                        )
                      })
                    )}
                  </div>
                ) : null}
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}