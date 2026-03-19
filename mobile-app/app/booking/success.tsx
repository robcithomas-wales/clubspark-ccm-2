import { View, Text, TouchableOpacity } from 'react-native'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { format, parseISO } from 'date-fns'
import { useBranding } from '../../contexts/BrandingContext'
import { CircleCheck } from 'lucide-react-native'

export default function BookingSuccessScreen() {
  const { startTime, endTime, unitName } = useLocalSearchParams<{
    startTime: string
    endTime: string
    unitName: string
  }>()
  const { branding } = useBranding()
  const router = useRouter()
  const brandColour = branding?.primaryColour ?? '#1857E0'

  const start = parseISO(startTime)
  const end = parseISO(endTime)

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 bg-surface items-center justify-center px-8">
        <View
          className="w-24 h-24 rounded-full items-center justify-center mb-6"
          style={{ backgroundColor: brandColour + '20' }}
        >
          <CircleCheck size={52} color={brandColour} />
        </View>

        <Text className="text-2xl font-bold text-slate-900 text-center mb-2">
          Booking confirmed!
        </Text>
        <Text className="text-base text-slate-500 text-center mb-1">
          {format(start, 'EEEE, dd MMMM')}
        </Text>
        <Text className="text-base font-semibold text-slate-700 text-center mb-8">
          {format(start, 'HH:mm')} – {format(end, 'HH:mm')} · {unitName}
        </Text>

        <TouchableOpacity
          onPress={() => router.replace('/(tabs)')}
          className="rounded-2xl py-4 px-10 items-center mb-3 w-full"
          style={{ backgroundColor: brandColour }}
          activeOpacity={0.85}
        >
          <Text className="text-white text-base font-bold">Done</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.replace('/(tabs)/book')}
          className="rounded-2xl py-3 px-10 items-center w-full border border-slate-200 bg-white"
          activeOpacity={0.75}
        >
          <Text className="text-slate-600 text-base font-semibold">Book another</Text>
        </TouchableOpacity>
      </View>
    </>
  )
}
