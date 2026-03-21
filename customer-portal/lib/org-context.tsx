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
  secondaryColour: string | null
  headingFont: string | null
  bodyFont: string | null
  navLayout: string
  faviconUrl: string | null
  homePageContent: HomePageContent | null
  portalTemplate: string
}

export type HomePageContent = {
  heroImageUrl?: string | null
  heroGradient?: boolean
  headline?: string | null
  subheadline?: string | null
  bannerEnabled?: boolean
  bannerText?: string | null
  introHeading?: string | null
  introText?: string | null
  gallery?: string[]
  seoTitle?: string | null
  seoDescription?: string | null
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
