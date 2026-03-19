import { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { format, parseISO } from 'date-fns'
import { useAuth } from '../../contexts/AuthContext'
import { useBranding } from '../../contexts/BrandingContext'
import { createBooking } from '../../lib/api'
import { ChevronLeft, CalendarDays, Clock, MapPin, CircleCheck } from 'lucide-react-native'

export default function BookingConfirmScreen() {
  const params = useLocalSearchParams<{
    venueId: string
    resourceId: string
    unitId: string
    unitName: string
    startTime: string
    endTime: string
  }>()
  const { appMeta, user } = useAuth()
  const { branding } = useBranding()
  const router = useRouter()

  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const brandColour = branding?.primaryColour ?? '#1857E0'
  const tenantId = appMeta?.tenantId ?? ''

  const start = parseISO(params.startTime)
  const end = parseISO(params.endTime)
  const durationMins = (end.getTime() - start.getTime()) / 60000

  async function handleConfirm() {
    if (!tenantId || loading) return
    setLoading(true)
    try {
      await createBooking(tenantId, {
        venueId: params.venueId,
        resourceId: params.resourceId,
        unitId: params.unitId,
        startTime: params.startTime,
        endTime: params.endTime,
        customerId: user?.id,
        notes: notes.trim() || undefined,
      })
      router.replace({
        pathname: '/booking/success',
        params: {
          startTime: params.startTime,
          endTime: params.endTime,
          unitName: params.unitName,
        },
      })
    } catch (e: any) {
      setLoading(false)
      Alert.alert('Booking failed', e.message ?? 'Please try again.')
    }
  }


  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Confirm booking',
          headerTintColor: brandColour,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#f8fafc' },
          presentation: 'modal',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ChevronLeft size={24} color={brandColour} />
            </TouchableOpacity>
          ),
        }}
      />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView
        className="flex-1 bg-surface"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Summary card */}
        <View className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 mb-4">
          <Text className="text-lg font-bold text-slate-900 mb-4">Booking summary</Text>

          <InfoRow icon={<CalendarDays size={16} color="#64748b" />} label="Date">
            {format(start, 'EEEE, dd MMMM yyyy')}
          </InfoRow>

          <InfoRow icon={<Clock size={16} color="#64748b" />} label="Time">
            {format(start, 'HH:mm')} – {format(end, 'HH:mm')} ({durationMins} min)
          </InfoRow>

          <InfoRow icon={<MapPin size={16} color="#64748b" />} label="Court">
            {params.unitName}
          </InfoRow>
        </View>

        {/* Notes */}
        <View className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 mb-6">
          <Text className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-3">
            Notes (optional)
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Any special requirements..."
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            className="bg-slate-50 rounded-2xl px-4 py-3 text-base text-slate-900 border border-slate-200 min-h-[80px]"
            placeholderTextColor="#94a3b8"
          />
        </View>

        {/* Confirm button */}
        <TouchableOpacity
          onPress={handleConfirm}
          disabled={loading}
          className="rounded-2xl py-4 items-center"
          style={{ backgroundColor: brandColour, opacity: loading ? 0.6 : 1 }}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="white" />
            : <Text className="text-white text-base font-bold">Confirm booking</Text>
          }
        </TouchableOpacity>

        <Text className="text-xs text-slate-400 text-center mt-4">
          By confirming, you agree to the venue's booking terms.
        </Text>
      </ScrollView>
      </KeyboardAvoidingView>
    </>
  )
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: string
}) {
  return (
    <View className="flex-row items-start gap-3 mb-3 last:mb-0">
      <View className="mt-0.5">{icon}</View>
      <View>
        <Text className="text-xs text-slate-400 font-medium">{label}</Text>
        <Text className="text-sm font-semibold text-slate-900 mt-0.5">{children}</Text>
      </View>
    </View>
  )
}
