import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { Trophy, ChevronRight, ChevronLeft, Users, Calendar, X, CheckCircle2 } from 'lucide-react-native'
import { Image } from 'react-native'
import { PoweredBy } from '../../components/PoweredBy'
import { useAuth } from '../../contexts/AuthContext'
import { useBranding } from '../../contexts/BrandingContext'
import {
  fetchCompetitions,
  fetchCompStandings,
  fetchCompMatches,
  enterCompetition,
  type CompetitionSummary,
  type CompStanding,
  type CompMatch,
} from '../../lib/api'

const FORMAT_LABELS: Record<string, string> = {
  LEAGUE: 'League', KNOCKOUT: 'Knockout', ROUND_ROBIN: 'Round Robin',
  GROUP_KNOCKOUT: 'Group + Knockout', SWISS: 'Swiss', LADDER: 'Ladder',
}

const SPORT_LABELS: Record<string, string> = {
  tennis: 'Tennis', padel: 'Padel', squash: 'Squash', badminton: 'Badminton',
  football: 'Football', hockey: 'Hockey', netball: 'Netball', cricket: 'Cricket',
  basketball: 'Basketball', rugby_union: 'Rugby Union',
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  REGISTRATION_OPEN: 'Open for entries',
  REGISTRATION_CLOSED: 'Entries closed',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

const STATUS_COLOURS: Record<string, { bg: string; text: string }> = {
  REGISTRATION_OPEN:   { bg: '#f0fdf4', text: '#15803d' },
  REGISTRATION_CLOSED: { bg: '#fffbeb', text: '#b45309' },
  IN_PROGRESS:         { bg: '#eff6ff', text: '#1d4ed8' },
  COMPLETED:           { bg: '#f8fafc', text: '#64748b' },
  DRAFT:               { bg: '#f8fafc', text: '#64748b' },
  CANCELLED:           { bg: '#fef2f2', text: '#dc2626' },
}

// ─── Entry modal ─────────────────────────────────────────────────────────────

function EntryModal({
  comp,
  brandColour,
  personId,
  tenantId,
  onClose,
}: {
  comp: CompetitionSummary
  brandColour: string
  personId: string
  tenantId: string
  onClose: () => void
}) {
  const [displayName, setDisplayName] = useState('')
  const [divisionId, setDivisionId] = useState(comp.divisions[0]?.id ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit() {
    if (!displayName.trim()) return
    setSubmitting(true)
    try {
      await enterCompetition(tenantId, comp.id, displayName.trim(), personId, divisionId || undefined)
      setSuccess(true)
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to submit entry')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
            borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
          }}>
            <View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a' }}>Enter competition</Text>
              <Text style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{comp.name}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={22} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
            {success ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <CheckCircle2 size={52} color="#16a34a" />
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a', marginTop: 16 }}>Entry submitted!</Text>
                <Text style={{ fontSize: 14, color: '#64748b', marginTop: 8, textAlign: 'center' }}>
                  Your entry has been received. You'll be notified once it's confirmed.
                </Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={{ marginTop: 24, backgroundColor: brandColour, borderRadius: 12, paddingHorizontal: 32, paddingVertical: 12 }}
                >
                  <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 15 }}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                    Your name *
                  </Text>
                  <TextInput
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Name shown on the draw"
                    placeholderTextColor="#94a3b8"
                    style={{
                      borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
                      paddingHorizontal: 14, paddingVertical: 12,
                      fontSize: 15, color: '#0f172a', backgroundColor: '#f8fafc',
                    }}
                  />
                  <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
                    This name will appear on the draw and standings.
                  </Text>
                </View>

                {comp.divisions.length > 1 && (
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Division</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {comp.divisions.map(d => (
                        <TouchableOpacity
                          key={d.id}
                          onPress={() => setDivisionId(d.id)}
                          style={{
                            paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
                            backgroundColor: divisionId === d.id ? brandColour : '#f1f5f9',
                            borderWidth: 1,
                            borderColor: divisionId === d.id ? brandColour : '#e2e8f0',
                          }}
                        >
                          <Text style={{ fontSize: 13, fontWeight: '600', color: divisionId === d.id ? '#ffffff' : '#475569' }}>
                            {d.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {comp.entryFee && Number(comp.entryFee) > 0 && (
                  <View style={{ backgroundColor: '#fffbeb', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#fcd34d' }}>
                    <Text style={{ fontSize: 13, color: '#b45309' }}>
                      Entry fee: <Text style={{ fontWeight: '700' }}>£{Number(comp.entryFee).toFixed(2)}</Text> — payment will be arranged by the club.
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={submitting || !displayName.trim()}
                  style={{
                    backgroundColor: brandColour, borderRadius: 14,
                    paddingVertical: 14, alignItems: 'center',
                    opacity: submitting || !displayName.trim() ? 0.6 : 1,
                  }}
                >
                  {submitting
                    ? <ActivityIndicator color="#ffffff" />
                    : <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '700' }}>Submit entry</Text>
                  }
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─── Standings table ──────────────────────────────────────────────────────────

function StandingsView({ standings, brandColour }: { standings: CompStanding[]; brandColour: string }) {
  if (standings.length === 0) return (
    <View style={{ padding: 32, alignItems: 'center' }}>
      <Text style={{ fontSize: 14, color: '#94a3b8', textAlign: 'center' }}>
        No standings yet — results will appear once matches are played.
      </Text>
    </View>
  )

  return (
    <View>
      {/* Header row */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
        <Text style={{ width: 24, fontSize: 11, color: '#94a3b8', fontWeight: '600' }}>#</Text>
        <Text style={{ flex: 1, fontSize: 11, color: '#94a3b8', fontWeight: '600' }}>PLAYER</Text>
        {['P','W','D','L','+/-','Pts'].map(h => (
          <Text key={h} style={{ width: 28, fontSize: 11, color: '#94a3b8', fontWeight: '600', textAlign: 'center' }}>{h}</Text>
        ))}
      </View>
      {standings.map((s, i) => (
        <View key={s.entryId} style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 16, paddingVertical: 10,
          borderBottomWidth: i < standings.length - 1 ? 1 : 0,
          borderBottomColor: '#f8fafc',
          backgroundColor: i === 0 ? brandColour + '08' : '#ffffff',
        }}>
          <Text style={{ width: 24, fontSize: 13, color: '#64748b', fontWeight: i === 0 ? '700' : '400' }}>{s.position}</Text>
          <Text style={{ flex: 1, fontSize: 13, color: '#0f172a', fontWeight: i === 0 ? '700' : '500' }} numberOfLines={1}>
            {s.entry?.displayName ?? '—'}
          </Text>
          {[s.played, s.won, s.drawn, s.lost].map((v, j) => (
            <Text key={j} style={{ width: 28, fontSize: 13, color: '#475569', textAlign: 'center' }}>{v}</Text>
          ))}
          <Text style={{
            width: 28, fontSize: 13, textAlign: 'center',
            color: Number(s.pointsDifference) >= 0 ? '#16a34a' : '#dc2626',
          }}>
            {Number(s.pointsDifference) > 0 ? '+' : ''}{s.pointsDifference}
          </Text>
          <Text style={{ width: 28, fontSize: 13, textAlign: 'center', fontWeight: '700', color: brandColour }}>
            {s.points}
          </Text>
        </View>
      ))}
    </View>
  )
}

// ─── Fixtures list ────────────────────────────────────────────────────────────

function FixturesView({ matches }: { matches: CompMatch[] }) {
  if (matches.length === 0) return (
    <View style={{ padding: 32, alignItems: 'center' }}>
      <Text style={{ fontSize: 14, color: '#94a3b8', textAlign: 'center' }}>
        No fixtures yet — check back once the draw is generated.
      </Text>
    </View>
  )

  const byRound = matches.reduce<Record<number, CompMatch[]>>((acc, m) => {
    if (!acc[m.round]) acc[m.round] = []
    acc[m.round]!.push(m)
    return acc
  }, {})
  const rounds = Object.keys(byRound).map(Number).sort((a, b) => a - b)

  return (
    <View style={{ gap: 12 }}>
      {rounds.map(round => (
        <View key={round}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#94a3b8', paddingHorizontal: 16, paddingBottom: 6, letterSpacing: 0.5 }}>
            ROUND {round}
          </Text>
          {byRound[round]!.map(m => (
            <View key={m.id} style={{
              flexDirection: 'row', alignItems: 'center',
              paddingHorizontal: 16, paddingVertical: 10,
              borderTopWidth: 1, borderTopColor: '#f1f5f9',
            }}>
              <Text style={{
                flex: 1, fontSize: 13, textAlign: 'right', paddingRight: 8,
                fontWeight: m.winnerId === m.homeEntry?.id ? '700' : '400',
                color: m.winnerId === m.homeEntry?.id ? '#0f172a' : '#475569',
              }} numberOfLines={1}>
                {m.homeEntry?.displayName ?? 'TBD'}
              </Text>
              <Text style={{ width: 52, textAlign: 'center', fontSize: 13, fontWeight: '700', color: '#0f172a' }}>
                {m.score ? `${m.score.home}–${m.score.away}` : 'vs'}
              </Text>
              <Text style={{
                flex: 1, fontSize: 13, textAlign: 'left', paddingLeft: 8,
                fontWeight: m.winnerId === m.awayEntry?.id ? '700' : '400',
                color: m.winnerId === m.awayEntry?.id ? '#0f172a' : '#475569',
              }} numberOfLines={1}>
                {m.awayEntry?.displayName ?? 'TBD'}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  )
}

// ─── Competition detail ───────────────────────────────────────────────────────

function CompetitionDetail({
  comp,
  tenantId,
  brandColour,
  personId,
  onBack,
}: {
  comp: CompetitionSummary
  tenantId: string
  brandColour: string
  personId: string
  onBack: () => void
}) {
  const [tab, setTab] = useState<'standings' | 'fixtures'>('standings')
  const [activeDivId, setActiveDivId] = useState(comp.divisions[0]?.id ?? '')
  const [standings, setStandings] = useState<CompStanding[]>([])
  const [matches, setMatches] = useState<CompMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [enterOpen, setEnterOpen] = useState(false)

  const isLeague = comp.format === 'LEAGUE' || comp.format === 'ROUND_ROBIN'
  const canEnter = comp.status === 'REGISTRATION_OPEN'

  const loadDivision = useCallback(async (divId: string) => {
    setLoading(true)
    const [s, m] = await Promise.all([
      isLeague ? fetchCompStandings(tenantId, comp.id, divId) : Promise.resolve([]),
      fetchCompMatches(tenantId, comp.id, divId),
    ])
    setStandings(s)
    setMatches(m)
    setLoading(false)
  }, [tenantId, comp.id, isLeague])

  useEffect(() => {
    if (activeDivId) loadDivision(activeDivId)
  }, [activeDivId, loadDivision])

  // Default tab based on format
  useEffect(() => {
    setTab(isLeague ? 'standings' : 'fixtures')
  }, [isLeague])

  const statusC = STATUS_COLOURS[comp.status] ?? { bg: '#f8fafc', text: '#64748b' }

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Back + title header */}
      <View style={{
        paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20,
        backgroundColor: brandColour,
      }}>
        <TouchableOpacity onPress={onBack} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 }}>
          <ChevronLeft size={16} color="rgba(255,255,255,0.7)" />
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>All competitions</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#ffffff' }}>
                  {STATUS_LABELS[comp.status] ?? comp.status}
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                {SPORT_LABELS[comp.sport] ?? comp.sport} · {FORMAT_LABELS[comp.format] ?? comp.format}
              </Text>
            </View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#ffffff' }}>{comp.name}</Text>
            {comp.season && <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>{comp.season}</Text>}
          </View>
          {canEnter && (
            <TouchableOpacity
              onPress={() => setEnterOpen(true)}
              style={{ backgroundColor: '#ffffff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: brandColour }}>Enter</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Division selector */}
        {comp.divisions.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
          >
            {comp.divisions.map(d => (
              <TouchableOpacity
                key={d.id}
                onPress={() => { setActiveDivId(d.id); loadDivision(d.id) }}
                style={{
                  paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
                  backgroundColor: activeDivId === d.id ? brandColour : '#ffffff',
                  borderWidth: 1,
                  borderColor: activeDivId === d.id ? brandColour : '#e2e8f0',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: activeDivId === d.id ? '#ffffff' : '#475569' }}>
                  {d.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Tabs */}
        {isLeague && (
          <View style={{
            flexDirection: 'row', marginHorizontal: 16, marginTop: comp.divisions.length > 1 ? 0 : 12,
            marginBottom: 4, backgroundColor: '#f1f5f9', borderRadius: 10, padding: 3,
          }}>
            {(['standings', 'fixtures'] as const).map(t => (
              <TouchableOpacity
                key={t}
                onPress={() => setTab(t)}
                style={{
                  flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
                  backgroundColor: tab === t ? '#ffffff' : 'transparent',
                }}
              >
                <Text style={{
                  fontSize: 13, fontWeight: '600',
                  color: tab === t ? '#0f172a' : '#64748b',
                }}>
                  {t === 'standings' ? 'Standings' : 'Fixtures'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Content */}
        <View style={{
          marginHorizontal: 16, marginTop: 8,
          backgroundColor: '#ffffff', borderRadius: 16,
          borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden',
        }}>
          {loading
            ? <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator color={brandColour} /></View>
            : tab === 'standings'
              ? <StandingsView standings={standings} brandColour={brandColour} />
              : <FixturesView matches={matches} />
          }
        </View>

        <PoweredBy />
      </ScrollView>

      {enterOpen && (
        <EntryModal
          comp={comp}
          brandColour={brandColour}
          personId={personId}
          tenantId={tenantId}
          onClose={() => setEnterOpen(false)}
        />
      )}
    </View>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function CompetitionsScreen() {
  const { user, appMeta } = useAuth()
  const { branding } = useBranding()
  const brandColour = branding?.primaryColour ?? '#1857E0'

  const tenantId = appMeta?.tenantId ?? ''
  const personId = user?.id ?? ''

  const [competitions, setCompetitions] = useState<CompetitionSummary[]>([])
  const [selected, setSelected] = useState<CompetitionSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (!tenantId) return
    try {
      const comps = await fetchCompetitions(tenantId)
      setCompetitions(comps)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [tenantId])

  useEffect(() => { load() }, [load])

  const onRefresh = () => { setRefreshing(true); load() }

  if (selected) {
    return (
      <CompetitionDetail
        comp={selected}
        tenantId={tenantId}
        brandColour={brandColour}
        personId={personId}
        onBack={() => setSelected(null)}
      />
    )
  }

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
      <View style={{
        paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20,
        backgroundColor: brandColour, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
      }}>
        <View>
          <Text style={{ fontSize: 28, fontWeight: '800', color: '#ffffff' }}>Competitions</Text>
          <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 4 }}>
            Leagues and tournaments at {branding?.venueName ?? 'your club'}
          </Text>
        </View>
        {branding?.logoUrl && (
          <Image source={{ uri: branding.logoUrl }} style={{ width: 44, height: 44, borderRadius: 8 }} resizeMode="contain" />
        )}
      </View>

      {competitions.length === 0 ? (
        <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 }}>
          <Trophy size={56} color="#cbd5e1" />
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#94a3b8', marginTop: 16 }}>No competitions yet</Text>
          <Text style={{ fontSize: 14, color: '#cbd5e1', marginTop: 8, textAlign: 'center' }}>
            Check back soon for upcoming leagues and tournaments.
          </Text>
        </View>
      ) : (
        <View style={{ padding: 16, gap: 12 }}>
          {competitions.map(comp => {
            const statusC = STATUS_COLOURS[comp.status] ?? { bg: '#f8fafc', text: '#64748b' }
            return (
              <TouchableOpacity
                key={comp.id}
                onPress={() => setSelected(comp)}
                style={{
                  backgroundColor: '#ffffff', borderRadius: 16,
                  borderWidth: 1, borderColor: '#e2e8f0',
                  padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
                }}
                activeOpacity={0.7}
              >
                <View style={{
                  width: 44, height: 44, borderRadius: 12,
                  backgroundColor: brandColour + '18', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Trophy size={20} color={brandColour} />
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: statusC.bg }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: statusC.text }}>
                        {STATUS_LABELS[comp.status] ?? comp.status}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, color: '#94a3b8' }}>
                      {SPORT_LABELS[comp.sport] ?? comp.sport}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#0f172a' }} numberOfLines={1}>
                    {comp.name}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
                    <Text style={{ fontSize: 12, color: '#64748b' }}>
                      {FORMAT_LABELS[comp.format] ?? comp.format}
                    </Text>
                    {comp.startDate && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Calendar size={11} color="#94a3b8" />
                        <Text style={{ fontSize: 12, color: '#94a3b8' }}>
                          {new Date(comp.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </Text>
                      </View>
                    )}
                    {comp.maxEntries && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Users size={11} color="#94a3b8" />
                        <Text style={{ fontSize: 12, color: '#94a3b8' }}>{comp.maxEntries} max</Text>
                      </View>
                    )}
                  </View>
                </View>

                <ChevronRight size={16} color="#cbd5e1" />
              </TouchableOpacity>
            )
          })}
        </View>
      )}

      <PoweredBy />
    </ScrollView>
  )
}
