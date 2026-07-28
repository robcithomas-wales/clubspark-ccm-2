import { ForbiddenException, Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { UpsertOverrideDto } from './dto/upsert-override.dto.js'

@Injectable()
export class OverridesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByOrg(organisationId: string, tenantId: string) {
    return this.prisma.orgPlanOverride.findFirst({ where: { organisationId, tenantId } })
  }

  async upsert(tenantId: string, dto: UpsertOverrideDto) {
    // organisationId is globally unique, so an upsert keyed on it alone could
    // hit another tenant's row. Reject if the org already belongs elsewhere.
    const existing = await this.prisma.orgPlanOverride.findUnique({
      where: { organisationId: dto.organisationId },
      select: { tenantId: true },
    })
    if (existing && existing.tenantId !== tenantId) {
      throw new ForbiddenException(`Organisation '${dto.organisationId}' does not belong to this tenant`)
    }
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
