import { useEffect, useState } from 'react'
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native'
import { format, parseISO } from 'date-fns'
import { Star, CircleCheck } from 'lucide-react-native'
import { PoweredBy } from '../../components/PoweredBy'
import { useAuth } from '../../contexts/AuthContext'
import { useBranding } from '../../contexts/BrandingContext'
import {
  fetchMembershipPlans,
  fetchMyMembership,
  joinMembership,
  type MembershipPlan,
  type Membership,
} from '../../lib/api'

export default function MembershipScreen() {
  const { user, appMeta } = useAuth()
  const { branding } = useBranding()

  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [membership, setMembership] = useState<Membership | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [joining, setJoining] = useState<string | null>(null)
  const [joined, setJoined] = useState<Membership | null>(null)
  const [error, setError] = useState<string | null>(null)

  const brand = branding?.primaryColour ?? '#1857E0'
  const tenantId = appMeta?.tenantId ?? ''
  const orgId = branding?.organisationId ?? ''
  const customerId = user?.id ?? ''

  async function load() {
    setLoading(true)
    try {
      const [plansRes, memRes] = await Promise.allSettled([
        tenantId && orgId ? fetchMembershipPlans(tenantId, orgId) : Promise.resolve([]),
        tenantId && customerId ? fetchMyMembership(tenantId, customerId) : Promise.resolve(null),
      ])
      if (plansRes.status === 'fulfilled') setPlans(plansRes.value)
      if (memRes.status === 'fulfilled') setMembership(memRes.value)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [tenantId, orgId, customerId])

  async function handleJoin(plan: MembershipPlan) {
    if (!user) return
    setJoining(plan.id)
    setError(null)
    try {
      const m = await joinMembership(tenantId, plan.id, customerId)
      setJoined(m)
      setMembership(m)
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong')
    } finally {
      setJoining(null)
    }
  }

  return (
    <View style={s.screen}>
      <View style={[s.header, { backgroundColor: brand }]}>
        <View style={s.headerRow}>
          <View style={s.headerText}>
            <Text style={s.headerSub}>{branding?.appName ?? branding?.venueName}</Text>
            <Text style={s.headerTitle}>Membership</Text>
          </View>
          {branding?.logoUrl ? (
            <Image
              source={{ uri: branding.logoUrl }}
              style={s.headerLogo}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={brand} />
        }
      >
        {loading ? (
          <View style={s.center}>
            <ActivityIndicator color={brand} />
          </View>

        ) : joined ? (
          <View style={s.card}>
            <View style={[s.iconCircle, { backgroundColor: brand + '18' }]}>
              <CircleCheck size={36} color={brand} />
            </View>
            <Text style={s.cardTitle}>You're now a member!</Text>
            <Text style={s.cardSub}>Welcome to the club. Your membership is active from today.</Text>
            <View style={s.infoBox}>
              <Text style={s.infoLabel}>Your plan</Text>
              <Text style={s.infoValue}>{joined.planName}</Text>
              <Text style={s.infoDate}>
                Active from {format(parseISO(joined.startDate), 'd MMMM yyyy')}
              </Text>
            </View>
          </View>

        ) : membership ? (
          <View style={s.card}>
            <View style={[s.iconCircle, { backgroundColor: brand + '18' }]}>
              <CircleCheck size={36} color={brand} />
            </View>
            <Text style={s.cardTitle}>You're already a member</Text>
            <View style={s.infoBox}>
              <Text style={s.infoLabel}>Active plan</Text>
              <Text style={s.infoValue}>{membership.planName}</Text>
              <Text style={s.infoDate}>
                Active from {format(parseISO(membership.startDate), 'd MMMM yyyy')}
                {membership.endDate ? ` · Expires ${format(parseISO(membership.endDate), 'd MMMM yyyy')}` : ''}
              </Text>
            </View>
          </View>

        ) : plans.length === 0 ? (
          <View style={[s.card, s.centerCard]}>
            <Star size={32} color="#cbd5e1" />
            <Text style={s.emptyText}>No membership plans available yet. Check back soon.</Text>
          </View>

        ) : (
          <View style={s.plansList}>
            {error ? (
              <View style={s.errorBox}>
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}
            {plans.map((plan, i) => {
              const featured = plans.length > 1 && i === Math.floor(plans.length / 2)
              const price = plan.price != null ? Number(plan.price).toFixed(2) : '0.00'
              const period = plan.billingInterval ?? plan.durationType ?? 'period'
              const isJoining = joining === plan.id
              return (
                <View
                  key={plan.id}
                  style={[s.planCard, featured ? { backgroundColor: brand } : s.planCardDefault]}
                >
                  {featured ? (
                    <View style={s.popularBadge}>
                      <Text style={s.popularText}>Most popular</Text>
                    </View>
                  ) : null}

                  <Text style={[s.planPeriod, { color: featured ? 'rgba(255,255,255,0.6)' : '#94a3b8' }]}>
                    {period}
                  </Text>
                  <Text style={[s.planName, { color: featured ? '#fff' : '#0f172a' }]}>
                    {plan.name}
                  </Text>

                  <View style={s.priceRow}>
                    <Text style={[s.priceAmount, { color: featured ? '#fff' : '#0f172a' }]}>
                      £{price}
                    </Text>
                    <Text style={[s.pricePeriod, { color: featured ? 'rgba(255,255,255,0.6)' : '#94a3b8' }]}>
                      /{period.toLowerCase()}
                    </Text>
                  </View>

                  {plan.description ? (
                    <Text style={[s.planDesc, { color: featured ? 'rgba(255,255,255,0.8)' : '#64748b' }]}>
                      {plan.description}
                    </Text>
                  ) : null}

                  <View style={s.benefits}>
                    {['Member booking rates', 'Priority access', 'Member-only events'].map((b) => (
                      <View key={b} style={s.benefitRow}>
                        <CircleCheck size={14} color={featured ? 'rgba(255,255,255,0.8)' : brand} />
                        <Text style={[s.benefitText, { color: featured ? 'rgba(255,255,255,0.8)' : '#475569' }]}>
                          {b}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    onPress={() => handleJoin(plan)}
                    disabled={!!joining}
                    style={[s.joinBtn, { backgroundColor: featured ? '#fff' : brand, opacity: !!joining ? 0.6 : 1 }]}
                    activeOpacity={0.85}
                  >
                    {isJoining
                      ? <ActivityIndicator color={featured ? brand : '#fff'} />
                      : <Text style={[s.joinBtnText, { color: featured ? brand : '#fff' }]}>Get started</Text>
                    }
                  </TouchableOpacity>
                </View>
              )
            })}
          </View>
        )}

        <PoweredBy />
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 24, paddingTop: 64, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerText: { flex: 1 },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: '700', marginTop: 4 },
  headerLogo: { width: 44, height: 44, borderRadius: 8 },
  scroll: { flex: 1, paddingHorizontal: 16, marginTop: -12 },
  center: { height: 160, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 32, marginTop: 8, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, borderWidth: 1, borderColor: '#f1f5f9' },
  centerCard: { justifyContent: 'center' },
  iconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  cardSub: { fontSize: 14, color: '#64748b', marginTop: 8, textAlign: 'center' },
  infoBox: { marginTop: 20, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', padding: 16, width: '100%' },
  infoLabel: { fontSize: 11, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 },
  infoValue: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginTop: 4 },
  infoDate: { fontSize: 13, color: '#64748b', marginTop: 4 },
  emptyText: { fontSize: 14, color: '#94a3b8', marginTop: 12, textAlign: 'center' },
  plansList: { gap: 12, marginTop: 8, paddingBottom: 8 },
  planCard: { borderRadius: 20, padding: 24, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  planCardDefault: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  popularBadge: { alignSelf: 'flex-start', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 12 },
  popularText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  planPeriod: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  planName: { fontSize: 18, fontWeight: '800' },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginVertical: 16 },
  priceAmount: { fontSize: 36, fontWeight: '800' },
  pricePeriod: { fontSize: 13, marginBottom: 4 },
  planDesc: { fontSize: 14, lineHeight: 22, marginBottom: 16 },
  benefits: { gap: 8, marginBottom: 20 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  benefitText: { fontSize: 14 },
  joinBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  joinBtnText: { fontWeight: '700', fontSize: 14 },
  errorBox: { backgroundColor: '#fef2f2', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 12 },
  errorText: { fontSize: 14, color: '#b91c1c' },
})
