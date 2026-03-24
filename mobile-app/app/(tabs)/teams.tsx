import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native'
import { Shield, CalendarDays, CheckCircle2, XCircle, HelpCircle, Clock } from 'lucide-react-native'
import { PoweredBy } from '../../components/PoweredBy'
import { useAuth } from '../../contexts/AuthContext'
import { useBranding } from '../../contexts/BrandingContext'
import {
  fetchMyTeams,
  fetchTeamFixtures,
  respondAvailability,
  type PlayerTeam,
  type PlayerFixture,
} from '../../lib/api'

const RESPONSE_LABELS: Record<string, string> = {
  available: 'Available',
  unavailable: 'Unavailable',
  maybe: 'Maybe',
  no_response: 'No response',
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled',
  squad_selected: 'Squad selected',
  fees_requested: 'Fees requested',
  completed: 'Completed',
  cancelled: 'Cancelled',
  draft: 'Draft',
}

export default function TeamsScreen() {
  const { user, appMeta } = useAuth()
  const { branding } = useBranding()
  const brandColour = branding?.primaryColour ?? '#1857E0'

  const tenantId = appMeta?.tenantId ?? ''
  const personId = user?.id ?? ''

  const [teams, setTeams] = useState<PlayerTeam[]>([])
  const [fixtures, setFixtures] = useState<PlayerFixture[]>([])
  const [selectedTeam, setSelectedTeam] = useState<PlayerTeam | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [responding, setResponding] = useState<string | null>(null)

  const load = useCallback(async (team?: PlayerTeam | null) => {
    if (!tenantId || !personId) return
    try {
      const myTeams = await fetchMyTeams(tenantId, personId)
      setTeams(myTeams)
      const activeTeam = team ?? (myTeams.length > 0 ? myTeams[0] : null)
      setSelectedTeam(activeTeam)
      if (activeTeam) {
        const fx = await fetchTeamFixtures(tenantId, activeTeam.id)
        setFixtures(fx)
      } else {
        setFixtures([])
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [tenantId, personId])

  useEffect(() => { load() }, [load])

  const onRefresh = () => { setRefreshing(true); load(selectedTeam) }

  const onSelectTeam = async (team: PlayerTeam) => {
    setSelectedTeam(team)
    setLoading(true)
    const fx = await fetchTeamFixtures(tenantId, team.id)
    setFixtures(fx)
    setLoading(false)
  }

  const respond = async (fixture: PlayerFixture, memberId: string, response: 'available' | 'unavailable' | 'maybe') => {
    setResponding(fixture.id)
    try {
      await respondAvailability(tenantId, fixture.teamId, fixture.id, memberId, response)
      await load(selectedTeam)
    } catch {
      Alert.alert('Error', 'Could not save your response. Please try again.')
    } finally {
      setResponding(null)
    }
  }

  const upcoming = fixtures.filter(
    (f) => f.status !== 'cancelled' && f.status !== 'completed'
  ).sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime())

  if (loading && !refreshing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator color={brandColour} size="large" />
      </View>
    )
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#f8fafc' }}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brandColour} />}
    >
      {/* Header */}
      <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20 }}>
        <Text style={{ fontSize: 28, fontWeight: '800', color: '#0f172a' }}>Teams</Text>
        <Text style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
          Upcoming fixtures and availability
        </Text>
      </View>

      {teams.length === 0 ? (
        <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 }}>
          <Shield size={56} color="#cbd5e1" />
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#94a3b8', marginTop: 16 }}>
            No teams yet
          </Text>
          <Text style={{ fontSize: 14, color: '#cbd5e1', marginTop: 8, textAlign: 'center' }}>
            Your manager will add you to a team once you're registered.
          </Text>
        </View>
      ) : (
        <>
          {/* Team selector */}
          {teams.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 4 }}
              style={{ marginBottom: 16 }}
            >
              {teams.map((team) => (
                <TouchableOpacity
                  key={team.id}
                  onPress={() => onSelectTeam(team)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: selectedTeam?.id === team.id ? brandColour : '#ffffff',
                    borderWidth: 1,
                    borderColor: selectedTeam?.id === team.id ? brandColour : '#e2e8f0',
                  }}
                >
                  <Text style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: selectedTeam?.id === team.id ? '#ffffff' : '#475569',
                  }}>
                    {team.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Team banner */}
          {selectedTeam && (
            <View style={{
              marginHorizontal: 20,
              marginBottom: 16,
              padding: 16,
              backgroundColor: '#ffffff',
              borderRadius: 16,
              borderWidth: 1,
              borderColor: '#e2e8f0',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}>
              <View style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: '#eff6ff',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Shield size={22} color={brandColour} />
              </View>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#0f172a' }}>
                  {selectedTeam.name}
                </Text>
                <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {[selectedTeam.sport, selectedTeam.season, selectedTeam.ageGroup].filter(Boolean).join(' · ')}
                </Text>
              </View>
            </View>
          )}

          {/* Upcoming fixtures */}
          <View style={{ paddingHorizontal: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 12 }}>
              Upcoming fixtures
            </Text>

            {upcoming.length === 0 ? (
              <View style={{
                padding: 32,
                alignItems: 'center',
                backgroundColor: '#ffffff',
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#e2e8f0',
              }}>
                <CalendarDays size={36} color="#cbd5e1" />
                <Text style={{ fontSize: 14, color: '#94a3b8', marginTop: 12, textAlign: 'center' }}>
                  No upcoming fixtures scheduled.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {upcoming.map((fixture) => {
                  const kickoff = new Date(fixture.kickoffAt)
                  const myResponse = fixture.myAvailability ?? null
                  const isResponding = responding === fixture.id

                  return (
                    <View key={fixture.id} style={{
                      backgroundColor: '#ffffff',
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: '#e2e8f0',
                      overflow: 'hidden',
                    }}>
                      {/* Fixture info */}
                      <View style={{ padding: 16 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: '#0f172a' }}>
                              {fixture.homeAway === 'home' ? 'vs' : '@'} {fixture.opponent}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                              <CalendarDays size={13} color="#94a3b8" />
                              <Text style={{ fontSize: 13, color: '#64748b' }}>
                                {kickoff.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                                {' · '}
                                {kickoff.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                              </Text>
                            </View>
                            {fixture.venue && (
                              <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                                {fixture.venue}
                                {fixture.matchType ? ` · ${fixture.matchType}` : ''}
                              </Text>
                            )}
                          </View>
                          <View style={{
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 20,
                            backgroundColor: '#eff6ff',
                          }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: brandColour }}>
                              {STATUS_LABELS[fixture.status] ?? fixture.status}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Availability response */}
                      <View style={{
                        borderTopWidth: 1,
                        borderTopColor: '#f1f5f9',
                        padding: 12,
                        backgroundColor: '#fafafa',
                      }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 8 }}>
                          YOUR AVAILABILITY
                        </Text>
                        {isResponding ? (
                          <ActivityIndicator color={brandColour} size="small" />
                        ) : (
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            {(['available', 'maybe', 'unavailable'] as const).map((r) => {
                              const isSelected = myResponse === r
                              const colours = {
                                available: { bg: '#f0fdf4', border: '#86efac', text: '#15803d', selected: '#16a34a' },
                                maybe:     { bg: '#fffbeb', border: '#fcd34d', text: '#b45309', selected: '#d97706' },
                                unavailable: { bg: '#fef2f2', border: '#fca5a5', text: '#dc2626', selected: '#dc2626' },
                              }[r]
                              const icons = {
                                available: <CheckCircle2 size={14} color={isSelected ? '#ffffff' : colours.text} />,
                                maybe: <HelpCircle size={14} color={isSelected ? '#ffffff' : colours.text} />,
                                unavailable: <XCircle size={14} color={isSelected ? '#ffffff' : colours.text} />,
                              }[r]
                              return (
                                <TouchableOpacity
                                  key={r}
                                  onPress={() => respond(fixture, personId, r)}
                                  style={{
                                    flex: 1,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 4,
                                    paddingVertical: 8,
                                    borderRadius: 10,
                                    backgroundColor: isSelected ? colours.selected : colours.bg,
                                    borderWidth: 1,
                                    borderColor: isSelected ? colours.selected : colours.border,
                                  }}
                                >
                                  {icons}
                                  <Text style={{
                                    fontSize: 11,
                                    fontWeight: '600',
                                    color: isSelected ? '#ffffff' : colours.text,
                                  }}>
                                    {r === 'available' ? 'Yes' : r === 'unavailable' ? 'No' : 'Maybe'}
                                  </Text>
                                </TouchableOpacity>
                              )
                            })}
                          </View>
                        )}
                      </View>
                    </View>
                  )
                })}
              </View>
            )}
          </View>
        </>
      )}

      <View style={{ marginTop: 40 }}>
        <PoweredBy />
      </View>
    </ScrollView>
  )
}
