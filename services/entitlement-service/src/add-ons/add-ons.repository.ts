import { Injectable } from '@nestjs/common'
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

  // (organisationId, addOnId) is globally unique, so an upsert keyed on it
  // alone could hit another tenant's row. The service uses this to reject a
  // row that belongs elsewhere before attaching.
  async findOwner(organisationId: string, addOnId: string) {
    return this.prisma.orgAddOn.findUnique({
      where: { organisationId_addOnId: { organisationId, addOnId } },
      select: { tenantId: true },
    })
  }

  async attach(tenantId: string, dto: AttachAddOnDto) {
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
