import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native'
import { format, parseISO, isAfter } from 'date-fns'
import { useAuth } from '../../contexts/AuthContext'
import { useBranding } from '../../contexts/BrandingContext'
import {
  fetchMyProfile,
  fetchMyBookings,
  fetchMyMembership,
  cancelBooking,
  type CustomerProfile,
  type Booking,
  type Membership,
} from '../../lib/api'
import {
  User,
  Mail,
  Phone,
  Star,
  CalendarDays,
  Clock,
  LogOut,
  ChevronRight,
  X,
} from 'lucide-react-native'
import { PoweredBy } from '../../components/PoweredBy'

export default function AccountScreen() {
  const { user, appMeta, signOut } = useAuth()
  const { branding, clearBranding } = useBranding()

  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [membership, setMembership] = useState<Membership | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const brandColour = branding?.primaryColour ?? '#1857E0'
  const tenantId = appMeta?.tenantId ?? ''
  const customerId = user?.id ?? ''

  const load = useCallback(async () => {
    if (!tenantId || !customerId) return
    try {
      const [profileRes, memRes, bookingsRes] = await Promise.allSettled([
        fetchMyProfile(tenantId, customerId),
        fetchMyMembership(tenantId, customerId),
        fetchMyBookings(tenantId, customerId),
      ])
      if (profileRes.status === 'fulfilled') setProfile(profileRes.value)
      if (memRes.status === 'fulfilled') setMembership(memRes.value)
      if (bookingsRes.status === 'fulfilled') {
        setBookings(
          bookingsRes.value
            .filter((b) => b.status === 'active')
            .sort((a, b) => parseISO(b.startsAt).getTime() - parseISO(a.startsAt).getTime()),
        )
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [tenantId, customerId])

  useEffect(() => { load() }, [load])

  async function handleCancel(bookingId: string) {
    Alert.alert(
      'Cancel booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Cancel booking',
          style: 'destructive',
          onPress: async () => {
            setCancellingId(bookingId)
            try {
              await cancelBooking(tenantId, bookingId)
              setBookings((prev) => prev.filter((b) => b.id !== bookingId))
            } catch {
              Alert.alert('Error', 'Could not cancel booking. Please try again.')
            } finally {
              setCancellingId(null)
            }
          },
        },
      ],
    )
  }

  async function handleSignOut() {
    Alert.alert(
      'Sign out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            await signOut()
            clearBranding()
          },
        },
      ],
    )
  }

  const upcomingBookings = bookings.filter((b) => isAfter(parseISO(b.startsAt), new Date()))
  const pastBookings = bookings.filter((b) => !isAfter(parseISO(b.startsAt), new Date()))

  return (
    <View className="flex-1 bg-surface">
      {/* Header */}
      <View
        className="px-6 pt-16 pb-8"
        style={{ backgroundColor: brandColour }}
      >
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-white/70 text-sm">My account</Text>
            <Text className="text-white text-2xl font-bold mt-1">
              {profile
                ? `${profile.firstName} ${profile.lastName}`
                : (user?.user_metadata?.firstName ?? 'Account')}
            </Text>
          </View>
          <View
            className="w-14 h-14 rounded-full items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
          >
            <Text className="text-2xl font-bold text-white">
              {(profile?.firstName ?? user?.user_metadata?.firstName ?? user?.email ?? 'U')[0].toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 -mt-3"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load() }}
            tintColor={brandColour}
          />
        }
      >
        {loading ? (
          <View className="h-40 items-center justify-center">
            <ActivityIndicator color={brandColour} />
          </View>
        ) : (
          <>
            {/* Personal details */}
            <View className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-4">
              <Text className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
                Personal details
              </Text>
              {(profile?.email || user?.email) && (
                <DetailRow icon={<Mail size={15} color="#64748b" />} value={profile?.email ?? user?.email ?? ''} />
              )}
              {profile?.phone && (
                <DetailRow icon={<Phone size={15} color="#64748b" />} value={profile.phone} />
              )}
              {!profile?.email && !user?.email && !profile?.phone && (
                <Text className="text-sm text-slate-400">Profile details unavailable</Text>
              )}
            </View>

            {/* Membership */}
            <View className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-4">
              <Text className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
                Membership
              </Text>
              {membership ? (
                <View>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <Star size={16} color={brandColour} fill={brandColour} />
                      <Text className="font-semibold text-slate-900">{membership.planName}</Text>
                    </View>
                    <View
                      className="rounded-full px-3 py-1"
                      style={{ backgroundColor: brandColour + '15' }}
                    >
                      <Text className="text-xs font-bold capitalize" style={{ color: brandColour }}>
                        {membership.status}
                      </Text>
                    </View>
                  </View>
                  {membership.endDate && (
                    <Text className="text-xs text-slate-400 mt-2">
                      Valid until {format(parseISO(membership.endDate), 'dd MMM yyyy')}
                    </Text>
                  )}
                </View>
              ) : (
                <Text className="text-sm text-slate-400">No active membership</Text>
              )}
            </View>

            {/* Upcoming bookings */}
            <View className="mb-4">
              <Text className="text-xs font-semibold text-slate-500 uppercase tracking-widest px-1 mb-3">
                Upcoming bookings ({upcomingBookings.length})
              </Text>
              {upcomingBookings.length === 0 ? (
                <View className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 items-center">
                  <Text className="text-sm text-slate-400">No upcoming bookings</Text>
                </View>
              ) : (
                <View className="gap-2">
                  {upcomingBookings.map((b) => (
                    <MyBookingCard
                      key={b.id}
                      booking={b}
                      brandColour={brandColour}
                      canCancel
                      cancelling={cancellingId === b.id}
                      onCancel={() => handleCancel(b.id)}
                    />
                  ))}
                </View>
              )}
            </View>

            {/* Past bookings */}
            {pastBookings.length > 0 && (
              <View className="mb-4">
                <Text className="text-xs font-semibold text-slate-500 uppercase tracking-widest px-1 mb-3">
                  Past bookings
                </Text>
                <View className="gap-2">
                  {pastBookings.slice(0, 10).map((b) => (
                    <MyBookingCard
                      key={b.id}
                      booking={b}
                      brandColour={brandColour}
                      canCancel={false}
                      cancelling={false}
                      onCancel={() => {}}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Sign out */}
            <TouchableOpacity
              onPress={handleSignOut}
              className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex-row items-center gap-3 mb-8"
              activeOpacity={0.75}
            >
              <LogOut size={18} color="#ef4444" />
              <Text className="text-red-500 font-semibold text-base flex-1">Sign out</Text>
              <ChevronRight size={16} color="#94a3b8" />
            </TouchableOpacity>
          </>
        )}
        <PoweredBy />
      </ScrollView>
    </View>
  )
}

function DetailRow({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <View className="flex-row items-center gap-3 mb-2 last:mb-0">
      {icon}
      <Text className="text-sm text-slate-700">{value}</Text>
    </View>
  )
}

function MyBookingCard({
  booking,
  brandColour,
  canCancel,
  cancelling,
  onCancel,
}: {
  booking: Booking
  brandColour: string
  canCancel: boolean
  cancelling: boolean
  onCancel: () => void
}) {
  const start = parseISO(booking.startsAt)
  const end = parseISO(booking.endsAt)
  const upcoming = isAfter(start, new Date())

  return (
    <View
      className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100"
      style={{ opacity: upcoming ? 1 : 0.6 }}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="font-semibold text-slate-900">
            {booking.resourceName ?? booking.venueName ?? 'Court'}
          </Text>
          {booking.unitName && (
            <Text className="text-xs text-slate-400 mt-0.5">{booking.unitName}</Text>
          )}
        </View>
        {canCancel && (
          <TouchableOpacity
            onPress={onCancel}
            disabled={cancelling}
            className="ml-2 w-8 h-8 rounded-full items-center justify-center bg-red-50"
          >
            {cancelling
              ? <ActivityIndicator size="small" color="#ef4444" />
              : <X size={14} color="#ef4444" />
            }
          </TouchableOpacity>
        )}
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
