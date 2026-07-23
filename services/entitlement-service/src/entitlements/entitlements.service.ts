import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'

export interface EntitlementResult {
  allowed: boolean
  /** 'hard' = blocked, 'soft' = allowed but upgrade prompt recommended, null = fully allowed */
  gate: 'hard' | 'soft' | null
  plan: string | null
  /** Plan required to unlock this feature, if blocked */
  upgradeRequired: string | null
}

// Features that are only soft-gated (accessible but with upsell prompt)
const SOFT_GATED_FEATURES = new Set<string>([
  'reporting_advanced',
  'website_pro',
])

// Map from feature → minimum plan that unlocks it (for upgrade prompt messaging)
const FEATURE_MIN_PLAN: Record<string, string> = {
  payments_offline:  'growth',
  team_management:   'growth',
  website_growth:    'growth',
  multisport:        'growth',
  advanced_payments: 'growth',
  comms_standard:    'growth',
  website_pro:       'pro',
  multisite:         'pro',
  reporting_advanced:'pro',
  integrations:      'pro',
  comms_advanced:    'pro',
}

@Injectable()
export class EntitlementsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check whether an org has access to a feature.
   * Resolves: plan features + active add-ons that unlock the feature.
   */
  async check(organisationId: string, featureId: string): Promise<EntitlementResult> {
    const sub = await this.prisma.orgSubscription.findUnique({
      where: { organisationId },
      include: {
        plan: {
          include: { planFeatures: true },
        },
      },
    })

    // No subscription → default to core for entitlement resolution
    const planFeatureIds = sub
      ? new Set(sub.plan.planFeatures.map((pf) => pf.featureId))
      : new Set<string>()

    const planId = sub?.plan.id ?? null
    const planStatus = sub?.status ?? 'active'

    // Cancelled / past_due subscriptions lose access to non-core features
    const effectivePlanId = (planStatus === 'cancelled' || planStatus === 'past_due')
      ? 'core'
      : planId

    // Check if feature is in the plan
    if (planFeatureIds.has(featureId) && effectivePlanId === planId) {
      return { allowed: true, gate: null, plan: planId, upgradeRequired: null }
    }

    // Check active add-ons that unlock this feature
    const addonUnlock = await this.prisma.orgAddOn.findFirst({
      where: {
        organisationId,
        status: 'active',
        addOn: { featureId },
      },
    })

    if (addonUnlock) {
      return { allowed: true, gate: null, plan: planId, upgradeRequired: null }
    }

    // Not allowed — determine gate type and upgrade hint
    const upgradeRequired = FEATURE_MIN_PLAN[featureId] ?? 'growth'
    const gate = SOFT_GATED_FEATURES.has(featureId) ? 'soft' : 'hard'

    return { allowed: false, gate, plan: planId, upgradeRequired }
  }

  /**
   * Resolve all features for an org — returns the full entitlement map.
   * Used to bootstrap the portal with a single call rather than per-feature checks.
   */
  async getAll(organisationId: string): Promise<{ data: Record<string, EntitlementResult> }> {
    const features = await this.prisma.feature.findMany()
    const results: Record<string, EntitlementResult> = {}

    await Promise.all(
      features.map(async (f) => {
        results[f.id] = await this.check(organisationId, f.id)
      }),
    )

    return { data: results }
  }
}
