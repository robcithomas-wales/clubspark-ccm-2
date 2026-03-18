"use client"

import { createContext, useContext } from "react"

export type Org = {
  id: string
  tenantId: string
  name: string
  slug: string
  primaryColour: string
  logoUrl: string | null
  about: string | null
  address: string | null
  phone: string | null
  email: string | null
  mapsEmbedUrl: string | null
  isPublished: boolean
}

const OrgContext = createContext<Org | null>(null)

export function OrgProvider({ org, children }: { org: Org; children: React.ReactNode }) {
  return <OrgContext.Provider value={org}>{children}</OrgContext.Provider>
}

export function useOrg(): Org {
  const ctx = useContext(OrgContext)
  if (!ctx) throw new Error("useOrg must be used within OrgProvider")
  return ctx
}
