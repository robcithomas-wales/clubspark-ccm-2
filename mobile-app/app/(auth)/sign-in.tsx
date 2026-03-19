import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import { Link, useRouter } from 'expo-router'
import { useAuth } from '../../contexts/AuthContext'
import { useBranding } from '../../contexts/BrandingContext'

export default function SignInScreen() {
  const { signIn } = useAuth()
  const { branding, clearBranding } = useBranding()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const brandColour = branding?.primaryColour ?? '#1857E0'

  async function handleSignIn() {
    if (!email.trim() || !password) return
    setLoading(true)
    setError(null)
    try {
      await signIn(email.trim().toLowerCase(), password)
      // Navigation handled by RootLayoutNav
    } catch (e: any) {
      setError(e.message ?? 'Sign in failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-surface"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-center px-6 py-12"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="items-center mb-10">
          <View
            className="w-16 h-16 rounded-2xl items-center justify-center mb-4"
            style={{ backgroundColor: brandColour }}
          >
            <Text className="text-2xl font-bold text-white">
              {(branding?.appName ?? branding?.venueName ?? 'C')[0].toUpperCase()}
            </Text>
          </View>
          <Text className="text-2xl font-bold text-slate-900">
            {branding?.appName ?? branding?.venueName ?? 'Club & Coach'}
          </Text>
          <Text className="text-sm text-slate-500 mt-1">Sign in to your account</Text>
        </View>

        {/* Form card */}
        <View className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <View className="mb-4">
            <Text className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={(t) => { setEmail(t); setError(null) }}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              className="bg-slate-50 rounded-2xl px-4 py-4 text-base text-slate-900 border border-slate-200"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View className="mb-2">
            <Text className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
              Password
            </Text>
            <TextInput
              value={password}
              onChangeText={(t) => { setPassword(t); setError(null) }}
              placeholder="••••••••"
              secureTextEntry
              returnKeyType="go"
              onSubmitEditing={handleSignIn}
              className="bg-slate-50 rounded-2xl px-4 py-4 text-base text-slate-900 border border-slate-200"
              placeholderTextColor="#94a3b8"
            />
          </View>

          {error && (
            <Text className="text-red-500 text-sm mt-2 mb-1">{error}</Text>
          )}

          <TouchableOpacity
            onPress={handleSignIn}
            disabled={loading || !email.trim() || !password}
            className="mt-4 rounded-2xl py-4 items-center"
            style={{ backgroundColor: brandColour, opacity: (loading || !email.trim() || !password) ? 0.5 : 1 }}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="white" />
              : <Text className="text-white text-base font-bold">Sign in</Text>
            }
          </TouchableOpacity>

          <Link href="/(auth)/sign-up" asChild>
            <TouchableOpacity className="mt-4 items-center py-2">
              <Text className="text-sm text-slate-500">
                Don't have an account?{' '}
                <Text style={{ color: brandColour }} className="font-semibold">
                  Create one
                </Text>
              </Text>
            </TouchableOpacity>
          </Link>
        </View>

        {/* Change club */}
        <TouchableOpacity
          onPress={() => { clearBranding(); router.replace('/onboarding') }}
          className="mt-6 items-center"
        >
          <Text className="text-xs text-slate-400">
            Wrong club?{' '}
            <Text className="text-slate-500 font-medium">Change club code</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
