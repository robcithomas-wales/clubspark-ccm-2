import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { format, addDays, parseISO } from 'date-fns'
import { useAuth } from '../../contexts/AuthContext'
import { useBranding } from '../../contexts/BrandingContext'
import { fetchAvailability, type AvailabilitySlot } from '../../lib/api'
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react-native'

export default function ResourceAvailabilityScreen() {
  const { resourceId, venueId } = useLocalSearchParams<{ resourceId: string; venueId: string }>()
  const { appMeta } = useAuth()
  const { branding } = useBranding()
  const router = useRouter()

  const [selectedDate, setSelectedDate] = useState(new Date())
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const brandColour = branding?.primaryColour ?? '#1857E0'
  const tenantId = appMeta?.tenantId ?? ''

  async function loadSlots(date: Date) {
    if (!tenantId || !venueId || !resourceId) return
    setLoading(true)
    setError(null)
    try {
      const dateStr = format(date, 'yyyy-MM-dd')
      const data = await fetchAvailability(tenantId, venueId, resourceId, dateStr)
      setSlots(data)
    } catch {
      setError('Could not load availability. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSlots(selectedDate) }, [selectedDate, tenantId, venueId, resourceId])

  function changeDate(delta: number) {
    const next = addDays(selectedDate, delta)
    if (next < new Date(new Date().setHours(0, 0, 0, 0))) return // no past dates
    setSelectedDate(next)
  }

  // Group slots by unit
  const byUnit = slots.reduce<Record<string, AvailabilitySlot[]>>((acc, s) => {
    if (!acc[s.unitId]) acc[s.unitId] = []
    acc[s.unitId].push(s)
    return acc
  }, {})

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Availability',
          headerTintColor: brandColour,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#f8fafc' },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="flex-row items-center">
              <ChevronLeft size={24} color={brandColour} />
            </TouchableOpacity>
          ),
        }}
      />
      <View className="flex-1 bg-surface">
        {/* Date picker */}
        <View className="flex-row items-center justify-between px-6 py-4 bg-white border-b border-slate-100">
          <TouchableOpacity
            onPress={() => changeDate(-1)}
            disabled={isToday}
            className="w-10 h-10 rounded-xl items-center justify-center bg-slate-50"
            style={{ opacity: isToday ? 0.3 : 1 }}
          >
            <ChevronLeft size={20} color={brandColour} />
          </TouchableOpacity>

          <View className="items-center">
            <Text className="text-base font-bold text-slate-900">
              {isToday ? 'Today' : format(selectedDate, 'EEEE')}
            </Text>
            <Text className="text-sm text-slate-500">
              {format(selectedDate, 'dd MMMM yyyy')}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => changeDate(1)}
            className="w-10 h-10 rounded-xl items-center justify-center bg-slate-50"
          >
            <ChevronRight size={20} color={brandColour} />
          </TouchableOpacity>
        </View>

        {/* Date strip (7-day horizontal scroller) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="bg-white border-b border-slate-100 px-3 py-3"
          contentContainerClassName="gap-2"
        >
          {Array.from({ length: 14 }, (_, i) => addDays(new Date(), i)).map((d) => {
            const isSelected = format(d, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
            return (
              <TouchableOpacity
                key={d.toISOString()}
                onPress={() => setSelectedDate(d)}
                className="items-center rounded-xl w-12 py-2"
                style={{ backgroundColor: isSelected ? brandColour : 'transparent' }}
              >
                <Text className="text-xs font-medium" style={{ color: isSelected ? 'white' : '#94a3b8' }}>
                  {format(d, 'EEE')}
                </Text>
                <Text className="text-base font-bold mt-0.5" style={{ color: isSelected ? 'white' : '#1e293b' }}>
                  {format(d, 'd')}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {/* Slots */}
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={brandColour} size="large" />
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-red-500 text-center">{error}</Text>
            <TouchableOpacity
              onPress={() => loadSlots(selectedDate)}
              className="mt-4 rounded-xl px-6 py-3"
              style={{ backgroundColor: brandColour }}
            >
              <Text className="text-white font-semibold">Retry</Text>
            </TouchableOpacity>
          </View>
        ) : slots.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <Clock size={40} color="#94a3b8" />
            <Text className="text-slate-400 text-center mt-4">
              No availability for this date.{'\n'}Try another day.
            </Text>
          </View>
        ) : (
          <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
            {Object.entries(byUnit).map(([unitId, unitSlots]) => {
              const unitName = unitSlots[0].unitName
              const availableSlots = unitSlots.filter((s) => s.available)
              return (
                <View key={unitId} className="mb-5">
                  <Text className="text-xs font-semibold text-slate-500 uppercase tracking-widest px-1 mb-2">
                    {unitName}
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {unitSlots.map((slot) => (
                      <SlotButton
                        key={slot.start}
                        slot={slot}
                        brandColour={brandColour}
                        onPress={() => {
                          if (!slot.available) return
                          router.push({
                            pathname: '/booking/confirm',
                            params: {
                              venueId,
                              resourceId,
                              unitId: slot.unitId,
                              unitName: slot.unitName,
                              startTime: slot.start,
                              endTime: slot.end,
                            },
                          })
                        }}
                      />
                    ))}
                  </View>
                  {availableSlots.length === 0 && (
                    <Text className="text-xs text-slate-400 px-1 mt-1">
                      All slots taken for this unit
                    </Text>
                  )}
                </View>
              )
            })}
            <View className="h-8" />
          </ScrollView>
        )}
      </View>
    </>
  )
}

function SlotButton({
  slot,
  brandColour,
  onPress,
}: {
  slot: AvailabilitySlot
  brandColour: string
  onPress: () => void
}) {
  const start = parseISO(slot.start)
  const end = parseISO(slot.end)
  const durationMins = (end.getTime() - start.getTime()) / 60000

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!slot.available}
      className="rounded-xl px-3 py-2.5 border min-w-[80px] items-center"
      style={{
        backgroundColor: slot.available ? brandColour + '12' : '#f1f5f9',
        borderColor: slot.available ? brandColour + '40' : '#e2e8f0',
        opacity: slot.available ? 1 : 0.5,
      }}
      activeOpacity={0.75}
    >
      <Text
        className="font-bold text-sm"
        style={{ color: slot.available ? brandColour : '#94a3b8' }}
      >
        {format(start, 'HH:mm')}
      </Text>
      <Text className="text-xs mt-0.5" style={{ color: slot.available ? brandColour + 'cc' : '#cbd5e1' }}>
        {durationMins}min
      </Text>
    </TouchableOpacity>
  )
}
