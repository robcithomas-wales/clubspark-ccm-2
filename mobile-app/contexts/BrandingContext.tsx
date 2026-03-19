import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { fetchPublicConfig, type BrandingConfig } from '../lib/api'

const STORAGE_KEY = 'branding_config'

type BrandingContextValue = {
  branding: BrandingConfig | null
  setBranding: (config: BrandingConfig) => void
  clearBranding: () => void
  isLoading: boolean
}

const BrandingContext = createContext<BrandingContextValue | null>(null)

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBrandingState] = useState<BrandingConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(async (raw) => {
      if (raw) {
        try {
          const cached: BrandingConfig = JSON.parse(raw)
          setBrandingState(cached)
          // Silently refresh from the API so colour/branding changes made in the
          // admin portal are picked up without requiring the user to re-enter
          // their club code.
          if (cached.clubCode) {
            fetchPublicConfig(cached.clubCode).then((fresh) => {
              if (fresh) {
                setBrandingState(fresh)
                AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(fresh))
              }
            }).catch(() => { /* non-critical — use cached value */ })
          }
        } catch { /* ignore */ }
      }
      setIsLoading(false)
    })
  }, [])

  function setBranding(config: BrandingConfig) {
    setBrandingState(config)
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  }

  function clearBranding() {
    setBrandingState(null)
    AsyncStorage.removeItem(STORAGE_KEY)
  }

  return (
    <BrandingContext.Provider value={{ branding, setBranding, clearBranding, isLoading }}>
      {children}
    </BrandingContext.Provider>
  )
}

export function useBranding() {
  const ctx = useContext(BrandingContext)
  if (!ctx) throw new Error('useBranding must be used inside BrandingProvider')
  return ctx
}
