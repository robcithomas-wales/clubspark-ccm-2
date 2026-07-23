import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { AttachAddOnDto } from './dto/attach-add-on.dto.js'

@Injectable()
export class AddOnsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.addOn.findMany({ orderBy: { id: 'asc' } })
  }

  async findByOrg(organisationId: string) {
    return this.prisma.orgAddOn.findMany({
      where: { organisationId, status: 'active' },
      include: { addOn: true },
      orderBy: { createdAt: 'asc' },
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

  async detach(organisationId: string, addOnId: string) {
    return this.prisma.orgAddOn.updateMany({
      where: { organisationId, addOnId },
      data: { status: 'cancelled' },
    })
  }
}
