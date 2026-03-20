import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../contexts/AuthContext'
import { useBranding } from '../../contexts/BrandingContext'
import { fetchVenues, fetchResources, type Venue, type Resource } from '../../lib/api'
import { ChevronRight, Dumbbell, MapPin } from 'lucide-react-native'

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  court: 'Court',
  pitch: 'Pitch',
  lane: 'Lane',
  table: 'Table',
  room: 'Room',
  other: 'Other',
}

export default function BookScreen() {
  const { appMeta } = useAuth()
  const { branding } = useBranding()
  const router = useRouter()

  const [venues, setVenues] = useState<Venue[]>([])
  const [resources, setResources] = useState<Record<string, Resource[]>>({})
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const brandColour = branding?.primaryColour ?? '#1857E0'
  const tenantId = appMeta?.tenantId ?? ''

  useEffect(() => {
    if (!tenantId) return
    setLoading(true)
    fetchVenues(tenantId)
      .then((v) => {
        setVenues(v)
        if (v.length === 1) {
          setSelectedVenueId(v[0].id)
          return fetchResources(tenantId, v[0].id).then((r) => {
            setResources({ [v[0].id]: r.filter((res) => res.isActive) })
          })
        }
      })
      .catch(() => setError('Failed to load venues'))
      .finally(() => setLoading(false))
  }, [tenantId])

  async function selectVenue(venueId: string) {
    setSelectedVenueId(venueId)
    if (!resources[venueId]) {
      try {
        const r = await fetchResources(tenantId, venueId)
        setResources((prev) => ({ ...prev, [venueId]: r.filter((res) => res.isActive) }))
      } catch {
        setError('Failed to load resources')
      }
    }
  }

  const selectedVenue = venues.find((v) => v.id === selectedVenueId)
  const venueResources = selectedVenueId ? (resources[selectedVenueId] ?? []) : []

  // Group resources by sport/type
  const grouped = venueResources.reduce<Record<string, Resource[]>>((acc, r) => {
    const key = r.sport ?? r.resourceType
    if (!acc[key]) acc[key] = []
    acc[key].push(r)
    return acc
  }, {})

  return (
    <View className="flex-1 bg-surface">
      {/* Header */}
      <View
        className="px-6 pt-16 pb-6"
        style={{ backgroundColor: brandColour }}
      >
        <Text className="text-white text-2xl font-bold">Book</Text>
        <Text className="text-white/70 text-sm mt-1">Choose a court or facility</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={brandColour} size="large" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-red-500 text-center">{error}</Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
          {/* Venue picker (only if >1 venue) */}
          {venues.length > 1 && (
            <View className="mb-4">
              <Text className="text-xs font-semibold text-slate-500 uppercase tracking-widest px-1 mb-2">
                Venue
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
                <View className="flex-row gap-2 px-1">
                  {venues.map((v) => (
                    <TouchableOpacity
                      key={v.id}
                      onPress={() => selectVenue(v.id)}
                      className="rounded-xl px-4 py-2.5 border"
                      style={{
                        backgroundColor: selectedVenueId === v.id ? brandColour : 'white',
                        borderColor: selectedVenueId === v.id ? brandColour : '#e2e8f0',
                      }}
                    >
                      <Text
                        className="font-semibold text-sm"
                        style={{ color: selectedVenueId === v.id ? 'white' : '#334155' }}
                      >
                        {v.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Location line */}
          {selectedVenue?.city && (
            <View className="flex-row items-center gap-1.5 mb-4 px-1">
              <MapPin size={13} color="#94a3b8" />
              <Text className="text-xs text-slate-400">{selectedVenue.city}</Text>
            </View>
          )}

          {/* Resources grouped */}
          {Object.entries(grouped).map(([groupKey, items]) => (
            <View key={groupKey} className="mb-5">
              <Text className="text-xs font-semibold text-slate-500 uppercase tracking-widest px-1 mb-2 capitalize">
                {groupKey}
              </Text>
              <View className="gap-2">
                {items.map((resource) => (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                    brandColour={brandColour}
                    onPress={() =>
                      router.push({
                        pathname: '/resource/[resourceId]',
                        params: { resourceId: resource.id, venueId: selectedVenueId! },
                      })
                    }
                  />
                ))}
              </View>
            </View>
          ))}

          {selectedVenueId && venueResources.length === 0 && (
            <View className="bg-white rounded-2xl p-6 items-center border border-slate-100">
              <Text className="text-slate-400 text-sm text-center">
                No bookable facilities available at this venue.
              </Text>
            </View>
          )}

          <View className="h-8" />
        </ScrollView>
      )}
    </View>
  )
}

function ResourceCard({
  resource,
  brandColour,
  onPress,
}: {
  resource: Resource
  brandColour: string
  onPress: () => void
}) {
  const visible = resource.visibleAttributes ?? ['surface', 'isIndoor', 'hasLighting']
  const attrs = [
    visible.includes('surface') ? resource.surface : null,
    visible.includes('isIndoor') && resource.isIndoor !== null ? (resource.isIndoor ? 'Indoor' : 'Outdoor') : null,
    visible.includes('hasLighting') && resource.hasLighting ? 'Floodlit' : null,
  ].filter(Boolean)

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white rounded-2xl p-4 flex-row items-center shadow-sm border border-slate-100"
      activeOpacity={0.75}
    >
      <View
        className="w-11 h-11 rounded-xl items-center justify-center mr-4"
        style={{ backgroundColor: brandColour + '15' }}
      >
        <Dumbbell size={20} color={brandColour} />
      </View>
      <View className="flex-1">
        <Text className="font-semibold text-slate-900 text-base">{resource.name}</Text>
        {attrs.length > 0 && (
          <Text className="text-xs text-slate-400 mt-0.5">{attrs.join(' · ')}</Text>
        )}
      </View>
      <ChevronRight size={18} color="#94a3b8" />
    </TouchableOpacity>
  )
}
