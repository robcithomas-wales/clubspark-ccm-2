import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { UpsertOverrideDto } from './dto/upsert-override.dto.js'

@Injectable()
export class OverridesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByOrg(organisationId: string, tenantId: string) {
    return this.prisma.orgPlanOverride.findFirst({ where: { organisationId, tenantId } })
  }

  // organisationId is globally unique, so an upsert keyed on it alone could
  // hit another tenant's row. The service uses this to reject an org that
  // already belongs elsewhere before upserting.
  async findOwner(organisationId: string) {
    return this.prisma.orgPlanOverride.findUnique({
      where: { organisationId },
      select: { tenantId: true },
    })
  }

  async upsert(tenantId: string, dto: UpsertOverrideDto) {
    return this.prisma.orgPlanOverride.upsert({
      where: { organisationId: dto.organisationId },
      create: {
        organisationId: dto.organisationId,
        tenantId,
        priceOverride: dto.priceOverride ?? null,
        transactionFeeOverride: dto.transactionFeeOverride ?? null,
        notes: dto.notes ?? null,
      },
      update: {
        priceOverride: dto.priceOverride ?? null,
        transactionFeeOverride: dto.transactionFeeOverride ?? null,
        notes: dto.notes ?? null,
      },
    })
  }

  async delete(organisationId: string, tenantId: string) {
    return this.prisma.orgPlanOverride.deleteMany({ where: { organisationId, tenantId } })
  }
}
