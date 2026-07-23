import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service.js'
import type { InternalContext } from '../guards/internal.guard.js'
import type { SetFlagDto } from './dto/set-flag.dto.js'

// The canonical list of flags the platform supports.
export const KNOWN_FLAGS = [
  'coaching',
  'competitions',
  'team_management',
  'smart_access',
  'analytics_ai',
  'payments_gocardless',
  'payments_stripe',
  'website_manager',
  'communications_sms',
  'onboarding_checklist',
  'beta_calendar',
  'beta_automation',
] as const

@Injectable()
export class FeatureFlagsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForTenant(tenantId: string) {
    const existing = await this.prisma.featureFlag.findMany({ where: { tenantId } })
    const existingMap = new Map(existing.map((f) => [f.flag, f]))

    // Return all known flags, merging with stored overrides
    return KNOWN_FLAGS.map((flag) => ({
      flag,
      enabled: existingMap.get(flag)?.enabled ?? false,
      overrideReason: existingMap.get(flag)?.overrideReason ?? null,
      setByEmail: existingMap.get(flag)?.setByEmail ?? null,
      updatedAt: existingMap.get(flag)?.updatedAt ?? null,
      isOverridden: existingMap.has(flag),
    }))
  }

  async setFlag(tenantId: string, flag: string, dto: SetFlagDto, ctx: InternalContext) {
    return this.prisma.featureFlag.upsert({
      where: { tenantId_flag: { tenantId, flag } },
      create: {
        tenantId,
        flag,
        enabled: dto.enabled,
        overrideReason: dto.overrideReason,
        setBy: ctx.staffId,
        setByEmail: ctx.staffEmail,
      },
      update: {
        enabled: dto.enabled,
        overrideReason: dto.overrideReason,
        setBy: ctx.staffId,
        setByEmail: ctx.staffEmail,
      },
    })
  }

  async resetFlag(tenantId: string, flag: string) {
    const existing = await this.prisma.featureFlag.findUnique({
      where: { tenantId_flag: { tenantId, flag } },
    })
    if (!existing) throw new NotFoundException(`Flag ${flag} not set for tenant ${tenantId}`)
    await this.prisma.featureFlag.delete({ where: { tenantId_flag: { tenantId, flag } } })
  }
}
