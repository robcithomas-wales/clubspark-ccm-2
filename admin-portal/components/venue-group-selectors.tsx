"use client"

import { useState, useEffect } from "react"

type Venue = { id: string; name: string }
type Group = { id: string; name: string }

export function VenueGroupSelectors({
  venues,
  defaultVenueId = "",
  defaultGroupId = "",
}: {
  venues: Venue[]
  defaultVenueId?: string
  defaultGroupId?: string
}) {
  const [venueId, setVenueId] = useState(defaultVenueId)
  const [groups, setGroups] = useState<Group[]>([])
  const [loadingGroups, setLoadingGroups] = useState(false)

  useEffect(() => {
    if (!venueId) {
      setGroups([])
      return
    }
    setLoadingGroups(true)
    fetch(`/api/resource-groups?venueId=${venueId}`)
      .then((r) => r.json())
      .then((json) => setGroups(json.data ?? []))
      .catch(() => setGroups([]))
      .finally(() => setLoadingGroups(false))
  }, [venueId])

  return (
    <>
      <div>
        <label htmlFor="venueId" className="mb-2 block text-sm font-medium text-slate-700">
          Venue <span className="text-rose-500">*</span>
        </label>
        <select
          id="venueId"
          name="venueId"
          required
          value={venueId}
          onChange={(e) => setVenueId(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]"
        >
          <option value="">Select a venue</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="groupId" className="mb-2 block text-sm font-medium text-slate-700">
          Resource Group
        </label>
        <select
          id="groupId"
          name="groupId"
          defaultValue={defaultGroupId}
          disabled={!venueId || loadingGroups}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] disabled:opacity-50"
        >
          <option value="">{loadingGroups ? "Loading…" : "No group"}</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
        {venueId && !loadingGroups && groups.length === 0 && (
          <p className="mt-1 text-xs text-slate-400">No resource groups for this venue.</p>
        )}
      </div>
    </>
  )
}
