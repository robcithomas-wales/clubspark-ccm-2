import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { format, parseISO, isAfter } from 'date-fns'
import { useAuth } from '../../contexts/AuthContext'
import { useBranding } from '../../contexts/BrandingContext'
import { fetchMyBookings, fetchMyMembership, type Booking, type Membership } from '../../lib/api'
import { CalendarDays, Clock, ChevronRight, Star } from 'lucide-react-native'

export default function HomeScreen() {
  const { user, appMeta } = useAuth()
  const { branding } = useBranding()
  const router = useRouter()

  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([])
  const [membership, setMembership] = useState<Membership | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const brandColour = branding?.primaryColour ?? '#1857E0'
  const tenantId = appMeta?.tenantId ?? ''
  const customerId = user?.id ?? ''

  async function load() {
    if (!tenantId || !customerId) return
    try {
      const [bookings, mem] = await Promise.allSettled([
        fetchMyBookings(tenantId, customerId),
        fetchMyMembership(tenantId, customerId),
      ])
      if (bookings.status === 'fulfilled') {
        const upcoming = bookings.value
          .filter((b) => b.status === 'active' && isAfter(parseISO(b.startsAt), new Date()))
          .sort((a, b) => parseISO(a.startsAt).getTime() - parseISO(b.startsAt).getTime())
          .slice(0, 5)
        setUpcomingBookings(upcoming)
      }
      if (mem.status === 'fulfilled') {
        setMembership(mem.value)
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [tenantId, customerId])

  const firstName = user?.user_metadata?.firstName ?? 'there'

  return (
    <ScrollView
      className="flex-1 bg-surface"
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={brandColour} />}
    >
      {/* Header */}
      <View
        className="px-6 pt-16 pb-8"
        style={{ backgroundColor: brandColour }}
      >
        <Text className="text-white/70 text-sm font-medium">
          {branding?.appName ?? branding?.venueName}
        </Text>
        <Text className="text-white text-2xl font-bold mt-1">
          Hello, {firstName} 👋
        </Text>
      </View>

      <View className="px-4 -mt-4">
        {/* Membership card */}
        {membership && (
          <View
            className="rounded-2xl p-5 mb-4 shadow-sm"
            style={{ backgroundColor: brandColour + '15', borderWidth: 1, borderColor: brandColour + '30' }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Star size={16} color={brandColour} fill={brandColour} />
                <Text className="text-sm font-semibold" style={{ color: brandColour }}>
                  {membership.planName}
                </Text>
              </View>
              <View
                className="rounded-full px-3 py-1"
                style={{ backgroundColor: brandColour + '25' }}
              >
                <Text className="text-xs font-bold capitalize" style={{ color: brandColour }}>
                  {membership.status}
                </Text>
              </View>
            </View>
            {membership.endDate && (
              <Text className="text-xs text-slate-500 mt-2">
                Valid until {format(parseISO(membership.endDate), 'dd MMM yyyy')}
              </Text>
            )}
          </View>
        )}

        {/* Quick book CTA */}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/book')}
          className="rounded-2xl p-5 mb-4 flex-row items-center justify-between shadow-sm"
          style={{ backgroundColor: brandColour }}
          activeOpacity={0.85}
        >
          <View>
            <Text className="text-white font-bold text-lg">Book a court</Text>
            <Text className="text-white/70 text-sm mt-0.5">Check availability & reserve</Text>
          </View>
          <CalendarDays size={28} color="white" />
        </TouchableOpacity>

        {/* Upcoming bookings */}
        <View className="mb-4">
          <Text className="text-base font-bold text-slate-900 mb-3 px-1">
            Upcoming bookings
          </Text>

          {loading ? (
            <View className="bg-white rounded-2xl p-6 items-center shadow-sm border border-slate-100">
              <ActivityIndicator color={brandColour} />
            </View>
          ) : upcomingBookings.length === 0 ? (
            <View className="bg-white rounded-2xl p-6 items-center shadow-sm border border-slate-100">
              <CalendarDays size={32} color="#94a3b8" />
              <Text className="text-slate-400 text-sm mt-3 text-center">
                No upcoming bookings.{'\n'}Tap "Book a court" to reserve a slot.
              </Text>
            </View>
          ) : (
            <View className="gap-2">
              {upcomingBookings.map((booking) => (
                <BookingCard key={booking.id} booking={booking} brandColour={brandColour} />
              ))}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  )
}

function BookingCard({ booking, brandColour }: { booking: Booking; brandColour: string }) {
  const start = parseISO(booking.startsAt)
  const end = parseISO(booking.endsAt)
  return (
    <View className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="font-semibold text-slate-900 text-base">
            {booking.resource?.name ?? 'Court'}
          </Text>
          {booking.unit?.name && (
            <Text className="text-xs text-slate-400 mt-0.5">{booking.unit.name}</Text>
          )}
        </View>
        <View
          className="rounded-full px-2.5 py-1 ml-2"
          style={{ backgroundColor: brandColour + '15' }}
        >
          <Text className="text-xs font-bold" style={{ color: brandColour }}>
            {booking.status}
          </Text>
        </View>
      </View>
      <View className="flex-row items-center mt-3 gap-4">
        <View className="flex-row items-center gap-1.5">
          <CalendarDays size={13} color="#64748b" />
          <Text className="text-xs text-slate-500">{format(start, 'EEE dd MMM')}</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <Clock size={13} color="#64748b" />
          <Text className="text-xs text-slate-500">
            {format(start, 'HH:mm')} – {format(end, 'HH:mm')}
          </Text>
        </View>
      </View>
    </View>
  )
}
