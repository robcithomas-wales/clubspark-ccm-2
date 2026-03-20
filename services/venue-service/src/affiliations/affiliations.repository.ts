import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { CreateAffiliationDto } from './dto/create-affiliation.dto.js'
import type { UpdateAffiliationDto } from './dto/update-affiliation.dto.js'

@Injectable()
export class AffiliationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string) {
    return this.prisma.read.affiliation.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    })
  }

  findById(tenantId: string, id: string) {
    return this.prisma.read.affiliation.findFirst({
      where: { tenantId, id },
    })
  }

  create(tenantId: string, dto: CreateAffiliationDto) {
    return this.prisma.write.affiliation.create({
      data: {
        tenantId,
        organisationId: dto.organisationId,
        governingTenantId: dto.governingTenantId,
        status: (dto.status ?? 'pending') as any,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        notes: dto.notes ?? null,
      },
    })
  }

  update(tenantId: string, id: string, dto: UpdateAffiliationDto) {
    return this.prisma.write.affiliation.updateMany({
      where: { tenantId, id },
      data: {
        ...(dto.status        !== undefined ? { status:        dto.status as any                                    } : {}),
        ...(dto.effectiveFrom !== undefined ? { effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null } : {}),
        ...(dto.effectiveTo   !== undefined ? { effectiveTo:   dto.effectiveTo   ? new Date(dto.effectiveTo)   : null } : {}),
        ...(dto.notes         !== undefined ? { notes:         dto.notes                                              } : {}),
      },
    })
  }
}
