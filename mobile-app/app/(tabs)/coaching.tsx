import { useEffect, useState } from 'react'
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { format, addDays } from 'date-fns'
import { GraduationCap, ChevronLeft, Clock, CircleCheck } from 'lucide-react-native'
import { PoweredBy } from '../../components/PoweredBy'
import { useAuth } from '../../contexts/AuthContext'
import { useBranding } from '../../contexts/BrandingContext'
import {
  fetchCoaches,
  fetchCoachSlots,
  createCoachingBooking,
  type Coach,
  type LessonType,
  type CoachSlot,
} from '../../lib/api'

type Step = 'coaches' | 'lesson-type' | 'date' | 'slots' | 'confirm' | 'done'

function formatPrice(price: string, currency: string) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(Number(price))
}

export default function CoachingScreen() {
  const { user, appMeta } = useAuth()
  const { branding } = useBranding()

  const brandColour = branding?.primaryColour ?? '#1857E0'
  const tenantId = appMeta?.tenantId ?? ''
  const customerId = user?.id ?? ''

  const [step, setStep] = useState<Step>('coaches')
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [slots, setSlots] = useState<CoachSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [bookingError, setBookingError] = useState<string | null>(null)

  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null)
  const [selectedLessonType, setSelectedLessonType] = useState<LessonType | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedSlot, setSelectedSlot] = useState<CoachSlot | null>(null)

  async function loadCoaches() {
    if (!tenantId) return
    setLoading(true)
    try {
      const data = await fetchCoaches(tenantId)
      setCoaches(data)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadCoaches() }, [tenantId])

  async function loadSlots(coach: Coach, lt: LessonType, date: Date) {
    setLoading(true)
    try {
      const data = await fetchCoachSlots(tenantId, coach.id, format(date, 'yyyy-MM-dd'), lt.durationMinutes, lt.sport ?? null)
      setSlots(data)
    } catch {
      setSlots([])
    } finally {
      setLoading(false)
    }
  }

  function selectCoach(coach: Coach) {
    setSelectedCoach(coach)
    const types = coach.lessonTypes ?? []
    if (types.length === 1) {
      setSelectedLessonType(types[0].lessonType)
      setStep('date')
    } else {
      setStep('lesson-type')
    }
  }

  function selectLessonType(lt: LessonType) {
    setSelectedLessonType(lt)
    setStep('date')
  }

  async function selectDate(date: Date) {
    setSelectedDate(date)
    await loadSlots(selectedCoach!, selectedLessonType!, date)
    setStep('slots')
  }

  function selectSlot(slot: CoachSlot) {
    setSelectedSlot(slot)
    setBookingError(null)
    setStep('confirm')
  }

  async function handleConfirm() {
    if (!selectedSlot || !selectedCoach || !selectedLessonType) return
    setConfirming(true)
    setBookingError(null)
    try {
      await createCoachingBooking(tenantId, {
        bookableUnitId: selectedSlot.unitId,
        venueId: selectedSlot.venueId,
        resourceId: selectedSlot.resourceId,
        startsAt: selectedSlot.startsAt,
        endsAt: selectedSlot.endsAt,
        customerId,
        coachId: selectedCoach.id,
        lessonTypeId: selectedLessonType.id,
        price: Number(selectedLessonType.pricePerSession),
        currency: selectedLessonType.currency,
      })
      setStep('done')
    } catch (e: any) {
      setBookingError(e.message ?? 'Failed to create booking')
    } finally {
      setConfirming(false)
    }
  }

  function reset() {
    setStep('coaches')
    setSelectedCoach(null)
    setSelectedLessonType(null)
    setSelectedSlot(null)
    setBookingError(null)
  }

  return (
    <View className="flex-1 bg-surface">
      {/* Header */}
      <View className="px-6 pt-16 pb-8" style={{ backgroundColor: brandColour }}>
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <Text className="text-white/70 text-sm font-medium">
              {branding?.appName ?? branding?.venueName}
            </Text>
            <Text className="text-white text-2xl font-bold mt-1">Coaching</Text>
          </View>
          {branding?.logoUrl ? (
            <Image
              source={{ uri: branding.logoUrl }}
              style={{ width: 44, height: 44, borderRadius: 8 }}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 -mt-3"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadCoaches(); reset() }}
            tintColor={brandColour}
          />
        }
      >

        {/* ── Step: pick a coach ── */}
        {step === 'coaches' && (
          <View className="mt-2">
            <Text className="text-base font-bold text-slate-900 mb-3 px-1">Choose a coach</Text>
            {loading ? (
              <View className="h-32 items-center justify-center">
                <ActivityIndicator color={brandColour} />
              </View>
            ) : coaches.length === 0 ? (
              <View className="bg-white rounded-2xl p-8 items-center shadow-sm border border-slate-100">
                <View className="w-14 h-14 rounded-2xl items-center justify-center mb-3" style={{ backgroundColor: brandColour + '18' }}>
                  <GraduationCap size={24} color={brandColour} />
                </View>
                <Text className="font-medium text-slate-700">No coaches available yet</Text>
                <Text className="text-sm text-slate-400 mt-1 text-center">Check back soon.</Text>
              </View>
            ) : (
              <View className="gap-3 mb-8">
                {coaches.map((coach) => (
                  <TouchableOpacity
                    key={coach.id}
                    onPress={() => selectCoach(coach)}
                    className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
                    activeOpacity={0.8}
                  >
                    <View className="flex-row items-center gap-4">
                      <View className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: brandColour }}>
                        <Text className="text-lg font-bold text-white">{coach.displayName[0]}</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="font-semibold text-slate-900">{coach.displayName}</Text>
                        {coach.bio ? (
                          <Text className="text-sm text-slate-500 mt-0.5" numberOfLines={1}>{coach.bio}</Text>
                        ) : null}
                      </View>
                    </View>
                    {coach.specialties.length > 0 && (
                      <View className="flex-row flex-wrap gap-1 mt-3">
                        {coach.specialties.map((s) => (
                          <View key={s} className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: brandColour + 'cc' }}>
                            <Text className="text-xs font-medium text-white">{s}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {(coach.lessonTypes?.length ?? 0) > 0 && (
                      <Text className="text-xs text-slate-400 mt-2">
                        {coach.lessonTypes.length} lesson type{coach.lessonTypes.length !== 1 ? 's' : ''}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── Step: pick lesson type ── */}
        {step === 'lesson-type' && selectedCoach && (
          <View className="mt-2">
            <TouchableOpacity onPress={() => setStep('coaches')} className="flex-row items-center gap-1 mb-4">
              <ChevronLeft size={16} color="#64748b" />
              <Text className="text-sm text-slate-500">Back to coaches</Text>
            </TouchableOpacity>
            <Text className="text-base font-bold text-slate-900 mb-3 px-1">
              Choose a lesson with {selectedCoach.displayName}
            </Text>
            <View className="gap-3 mb-8">
              {(selectedCoach.lessonTypes ?? []).map(({ lessonType: lt }) => (
                <TouchableOpacity
                  key={lt.id}
                  onPress={() => selectLessonType(lt)}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
                  activeOpacity={0.8}
                >
                  <Text className="font-semibold text-slate-900">{lt.name}</Text>
                  <View className="flex-row items-center gap-4 mt-2">
                    <View className="flex-row items-center gap-1.5">
                      <Clock size={13} color="#64748b" />
                      <Text className="text-sm text-slate-500">{lt.durationMinutes} min</Text>
                    </View>
                    <Text className="text-sm text-slate-500">{formatPrice(lt.pricePerSession, lt.currency)}</Text>
                  </View>
                  {lt.maxParticipants > 1 && (
                    <Text className="text-xs text-slate-400 mt-1">Up to {lt.maxParticipants} participants</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── Step: pick date ── */}
        {step === 'date' && selectedCoach && selectedLessonType && (
          <View className="mt-2">
            <TouchableOpacity
              onPress={() => setStep(selectedCoach.lessonTypes?.length > 1 ? 'lesson-type' : 'coaches')}
              className="flex-row items-center gap-1 mb-4"
            >
              <ChevronLeft size={16} color="#64748b" />
              <Text className="text-sm text-slate-500">Back</Text>
            </TouchableOpacity>
            <Text className="text-base font-bold text-slate-900 mb-1 px-1">Choose a date</Text>
            <Text className="text-sm text-slate-500 mb-4 px-1">
              {selectedLessonType.name} with {selectedCoach.displayName} · {selectedLessonType.durationMinutes} min
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-8">
              {Array.from({ length: 14 }).map((_, i) => {
                const d = addDays(new Date(), i)
                const isSelected = format(d, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => selectDate(d)}
                    className="bg-white rounded-xl px-4 py-3 shadow-sm"
                    style={{ borderWidth: 1, borderColor: isSelected ? brandColour : '#e2e8f0' }}
                    activeOpacity={0.8}
                  >
                    <Text className="text-xs text-slate-400 text-center">{format(d, 'EEE')}</Text>
                    <Text className="font-semibold text-slate-900 text-center">{format(d, 'd MMM')}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        )}

        {/* ── Step: pick slot ── */}
        {step === 'slots' && (
          <View className="mt-2">
            <TouchableOpacity onPress={() => setStep('date')} className="flex-row items-center gap-1 mb-4">
              <ChevronLeft size={16} color="#64748b" />
              <Text className="text-sm text-slate-500">Back to dates</Text>
            </TouchableOpacity>
            <Text className="text-base font-bold text-slate-900 mb-1 px-1">Available times</Text>
            <Text className="text-sm text-slate-500 mb-4 px-1">{format(selectedDate, 'EEEE d MMMM yyyy')}</Text>
            {loading ? (
              <View className="h-32 items-center justify-center">
                <ActivityIndicator color={brandColour} />
              </View>
            ) : slots.length === 0 ? (
              <View className="bg-white rounded-2xl p-6 items-center shadow-sm border border-slate-100">
                <Text className="text-sm text-slate-400 text-center">No available slots on this date. Try another day.</Text>
              </View>
            ) : (
              <View className="flex-row flex-wrap gap-2 mb-8">
                {slots.map((slot) => (
                  <TouchableOpacity
                    key={slot.startsAt}
                    onPress={() => selectSlot(slot)}
                    className="bg-white rounded-xl px-4 py-3 shadow-sm"
                    style={{ borderWidth: 1, borderColor: '#e2e8f0' }}
                    activeOpacity={0.8}
                  >
                    <Text className="text-sm font-medium text-slate-900">
                      {format(new Date(slot.startsAt), 'HH:mm')} – {format(new Date(slot.endsAt), 'HH:mm')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── Step: confirm ── */}
        {step === 'confirm' && selectedCoach && selectedSlot && selectedLessonType && (
          <View className="mt-2 mb-8">
            <TouchableOpacity onPress={() => setStep('slots')} className="flex-row items-center gap-1 mb-4">
              <ChevronLeft size={16} color="#64748b" />
              <Text className="text-sm text-slate-500">Back to times</Text>
            </TouchableOpacity>
            <Text className="text-base font-bold text-slate-900 mb-4 px-1">Confirm your booking</Text>
            <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <ConfirmRow label="Coach" value={selectedCoach.displayName} />
              <ConfirmRow label="Lesson" value={selectedLessonType.name} />
              <ConfirmRow label="Date" value={format(new Date(selectedSlot.startsAt), 'EEEE d MMMM yyyy')} />
              <ConfirmRow label="Time" value={`${format(new Date(selectedSlot.startsAt), 'HH:mm')} – ${format(new Date(selectedSlot.endsAt), 'HH:mm')}`} />
              {selectedSlot.unitName ? <ConfirmRow label="Court" value={selectedSlot.unitName} /> : null}
              <View className="flex-row justify-between mt-4 pt-4" style={{ borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
                <Text className="font-semibold text-slate-900">Price</Text>
                <Text className="font-semibold text-slate-900">
                  {formatPrice(selectedLessonType.pricePerSession, selectedLessonType.currency)}
                </Text>
              </View>
            </View>

            {bookingError && (
              <View className="mt-4 rounded-xl bg-red-50 px-4 py-3">
                <Text className="text-sm text-red-700">{bookingError}</Text>
              </View>
            )}

            <TouchableOpacity
              onPress={handleConfirm}
              disabled={confirming}
              className="mt-5 rounded-xl py-4 items-center"
              style={{ backgroundColor: brandColour, opacity: confirming ? 0.6 : 1 }}
              activeOpacity={0.85}
            >
              {confirming
                ? <ActivityIndicator color="white" />
                : <Text className="text-white font-bold text-sm">Confirm booking</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step: done ── */}
        {step === 'done' && (
          <View className="mt-2 mb-8 items-center py-12">
            <CircleCheck size={64} color={brandColour} />
            <Text className="text-2xl font-bold text-slate-900 mt-4">Booking confirmed!</Text>
            <Text className="text-slate-500 text-sm mt-2 text-center px-8">
              Your lesson with {selectedCoach?.displayName} has been requested. You'll hear from the club shortly.
            </Text>
            <TouchableOpacity
              onPress={reset}
              className="mt-8 rounded-xl px-8 py-3.5"
              style={{ backgroundColor: brandColour }}
              activeOpacity={0.85}
            >
              <Text className="text-white font-bold text-sm">Book another lesson</Text>
            </TouchableOpacity>
          </View>
        )}
        <PoweredBy />
      </ScrollView>
    </View>
  )
}

function ConfirmRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between mb-3">
      <Text className="text-sm text-slate-500">{label}</Text>
      <Text className="text-sm font-medium text-slate-900 flex-1 text-right ml-4">{value}</Text>
    </View>
  )
}
