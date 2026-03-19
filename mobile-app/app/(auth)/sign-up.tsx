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
import { useBranding } from '../../contexts/BrandingContext'
import { registerCustomer } from '../../lib/api'

export default function SignUpScreen() {
  const { branding } = useBranding()
  const router = useRouter()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const brandColour = branding?.primaryColour ?? '#1857E0'

  async function handleRegister() {
    if (!branding) return
    setLoading(true)
    setError(null)
    try {
      await registerCustomer({
        clubCode: branding.clubCode,
        email: email.trim().toLowerCase(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      })
      setSuccess(true)
    } catch (e: any) {
      setError(e.message ?? 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <View className="flex-1 bg-surface justify-center items-center px-8">
        <View
          className="w-20 h-20 rounded-full items-center justify-center mb-6"
          style={{ backgroundColor: brandColour + '20' }}
        >
          <Text className="text-4xl">✓</Text>
        </View>
        <Text className="text-2xl font-bold text-slate-900 text-center mb-3">
          Account created!
        </Text>
        <Text className="text-base text-slate-500 text-center mb-8">
          Your account is ready. Sign in to get started.
        </Text>
        <TouchableOpacity
          onPress={() => router.replace('/(auth)/sign-in')}
          className="rounded-2xl py-4 px-10 items-center"
          style={{ backgroundColor: brandColour }}
          activeOpacity={0.85}
        >
          <Text className="text-white text-base font-bold">Sign in</Text>
        </TouchableOpacity>
      </View>
    )
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
          <Text className="text-2xl font-bold text-slate-900">Create account</Text>
          <Text className="text-sm text-slate-500 mt-1">
            Join {branding?.appName ?? branding?.venueName ?? 'your club'}
          </Text>
        </View>

        <View className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          {/* Name row */}
          <View className="flex-row gap-3 mb-4">
            <View className="flex-1">
              <Text className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                First name
              </Text>
              <TextInput
                value={firstName}
                onChangeText={(t) => { setFirstName(t); setError(null) }}
                placeholder="Jane"
                autoCapitalize="words"
                returnKeyType="next"
                className="bg-slate-50 rounded-2xl px-4 py-4 text-base text-slate-900 border border-slate-200"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                Last name
              </Text>
              <TextInput
                value={lastName}
                onChangeText={(t) => { setLastName(t); setError(null) }}
                placeholder="Smith"
                autoCapitalize="words"
                returnKeyType="next"
                className="bg-slate-50 rounded-2xl px-4 py-4 text-base text-slate-900 border border-slate-200"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>

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
              placeholder="Min. 8 characters"
              secureTextEntry
              returnKeyType="go"
              onSubmitEditing={handleRegister}
              className="bg-slate-50 rounded-2xl px-4 py-4 text-base text-slate-900 border border-slate-200"
              placeholderTextColor="#94a3b8"
            />
          </View>

          {error && (
            <Text className="text-red-500 text-sm mt-2 mb-1">{error}</Text>
          )}

          <TouchableOpacity
            onPress={handleRegister}
            disabled={loading || !firstName.trim() || !lastName.trim() || !email.trim() || password.length < 8}
            className="mt-4 rounded-2xl py-4 items-center"
            style={{
              backgroundColor: brandColour,
              opacity: (loading || !firstName.trim() || !lastName.trim() || !email.trim() || password.length < 8) ? 0.5 : 1,
            }}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="white" />
              : <Text className="text-white text-base font-bold">Create account</Text>
            }
          </TouchableOpacity>

          <Link href="/(auth)/sign-in" asChild>
            <TouchableOpacity className="mt-4 items-center py-2">
              <Text className="text-sm text-slate-500">
                Already have an account?{' '}
                <Text style={{ color: brandColour }} className="font-semibold">
                  Sign in
                </Text>
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
