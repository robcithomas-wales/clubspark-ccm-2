import { ForbiddenException, Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { AttachAddOnDto } from './dto/attach-add-on.dto.js'

@Injectable()
export class AddOnsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.addOn.findMany({ orderBy: { id: 'asc' } })
  }

  async findByOrg(organisationId: string, tenantId: string) {
    return this.prisma.orgAddOn.findMany({
      where: { organisationId, tenantId, status: 'active' },
      include: { addOn: true },
      orderBy: { createdAt: 'asc' },
    })
  }

  async attach(tenantId: string, dto: AttachAddOnDto) {
    // (organisationId, addOnId) is globally unique, so an upsert keyed on it
    // alone could hit another tenant's row. Reject if it belongs elsewhere.
    const existing = await this.prisma.orgAddOn.findUnique({
      where: { organisationId_addOnId: { organisationId: dto.organisationId, addOnId: dto.addOnId } },
      select: { tenantId: true },
    })
    if (existing && existing.tenantId !== tenantId) {
      throw new ForbiddenException(`Organisation '${dto.organisationId}' does not belong to this tenant`)
    }
    return this.prisma.orgAddOn.upsert({
      where: { organisationId_addOnId: { organisationId: dto.organisationId, addOnId: dto.addOnId } },
      create: {
        organisationId: dto.organisationId,
        tenantId,
        addOnId: dto.addOnId,
        status: 'active',
      },
      update: { status: 'active' },
      include: { addOn: true },
    })
  }

  async detach(organisationId: string, addOnId: string, tenantId: string) {
    return this.prisma.orgAddOn.updateMany({
      where: { organisationId, addOnId, tenantId },
      data: { status: 'cancelled' },
    })
  }
}
