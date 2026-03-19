import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native'
import { useRouter } from 'expo-router'
import { fetchPublicConfig } from '../lib/api'
import { useBranding } from '../contexts/BrandingContext'

export default function OnboardingScreen() {
  const [clubCode, setClubCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { setBranding } = useBranding()
  const router = useRouter()

  async function handleConnect() {
    const code = clubCode.trim().toLowerCase()
    if (!code) return
    setLoading(true)
    setError(null)
    try {
      const config = await fetchPublicConfig(code)
      if (!config) {
        setError('Club not found. Check your club code and try again.')
        return
      }
      setBranding(config)
      router.replace('/(auth)/sign-in')
    } catch {
      setError('Could not connect. Check your internet connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-brand"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 justify-center px-8">
        {/* Logo area */}
        <View className="items-center mb-12">
          <View className="w-20 h-20 rounded-3xl bg-white/20 items-center justify-center mb-6">
            <Text className="text-4xl font-bold text-white">C</Text>
          </View>
          <Text className="text-3xl font-bold text-white">Club & Coach</Text>
          <Text className="text-base text-white/70 mt-2 text-center">
            Enter your club code to get started
          </Text>
        </View>

        {/* Input card */}
        <View className="bg-white rounded-3xl p-6 shadow-xl">
          <Text className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-3">
            Club code
          </Text>
          <TextInput
            value={clubCode}
            onChangeText={(t) => { setClubCode(t); setError(null) }}
            placeholder="e.g. riverside"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={handleConnect}
            className="bg-slate-50 rounded-2xl px-4 py-4 text-lg font-mono text-slate-900 border border-slate-200"
            placeholderTextColor="#94a3b8"
          />

          {error && (
            <Text className="text-red-500 text-sm mt-3">{error}</Text>
          )}

          <TouchableOpacity
            onPress={handleConnect}
            disabled={loading || !clubCode.trim()}
            className="mt-4 bg-brand rounded-2xl py-4 items-center disabled:opacity-50"
            style={{ backgroundColor: '#1857E0' }}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="white" />
              : <Text className="text-white text-base font-bold">Connect</Text>
            }
          </TouchableOpacity>
        </View>

        <Text className="text-center text-white/50 text-xs mt-8">
          Don't have a club code? Ask your club administrator.
        </Text>
      </View>
    </KeyboardAvoidingView>
  )
}
