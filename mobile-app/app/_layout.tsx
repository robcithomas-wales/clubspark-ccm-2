import '../global.css'
import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { AuthProvider, useAuth } from '../contexts/AuthContext'
import { BrandingProvider, useBranding } from '../contexts/BrandingContext'

SplashScreen.preventAutoHideAsync()

function RootLayoutNav() {
  const { session, isLoading: authLoading } = useAuth()
  const { branding, isLoading: brandingLoading } = useBranding()
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    if (authLoading || brandingLoading) return
    SplashScreen.hideAsync()

    const inAuthGroup = segments[0] === '(auth)'
    const inOnboarding = segments[0] === 'onboarding'

    if (!branding) {
      // No club code yet — show onboarding
      if (!inOnboarding) router.replace('/onboarding')
    } else if (!session) {
      // Have branding but not signed in
      if (!inAuthGroup) router.replace('/(auth)/sign-in')
    } else {
      // Fully authenticated
      if (inAuthGroup || inOnboarding) router.replace('/(tabs)')
    }
  }, [session, branding, authLoading, brandingLoading, segments])

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="resource/[resourceId]" options={{ presentation: 'card' }} />
      <Stack.Screen name="booking/confirm" options={{ presentation: 'modal' }} />
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <BrandingProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        <RootLayoutNav />
      </AuthProvider>
    </BrandingProvider>
  )
}
